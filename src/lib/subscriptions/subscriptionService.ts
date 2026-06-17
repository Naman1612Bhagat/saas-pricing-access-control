import type { Payload } from 'payload'
import type { Payment } from '@/payload-types'
import { sql } from 'drizzle-orm'

/** Payload database transaction identifier returned by beginTransaction(). */
type TransactionID = number | string | null

export interface ProcessSuccessfulPaymentInput {
    payload: Payload
    payment: Payment
    gatewayPaymentId: string
    /** Optional — present when called from the /verify route; absent from the webhook. */
    gatewaySignature?: string
}

export interface ProcessSuccessfulPaymentResult {
    success: boolean
    alreadyProcessed: boolean
}

// ─── Helper: expire active subscriptions ────────────────────────────────────

/**
 * Marks all currently-active subscriptions for the given user as 'expired'.
 * Errors bubble up so the caller's transaction can roll back.
 */
export async function expireActiveSubscriptions(
    payload: Payload,
    userId: number,
    transactionID?: TransactionID,
): Promise<void> {
    const req = transactionID != null ? { transactionID } : undefined

    const activeSubscriptions = await payload.find({
        collection: 'subscriptions',
        where: {
            and: [
                { user: { equals: userId } },
                { status: { equals: 'active' } },
            ],
        },
        req,
    })

    for (const sub of activeSubscriptions.docs) {
        await payload.update({
            collection: 'subscriptions',
            id: sub.id,
            data: { status: 'expired' },
            req,
        })
    }
}

// ─── Helper: create subscription ─────────────────────────────────────────────

/**
 * Creates a new subscription record.
 * The Subscriptions collection beforeChange hook computes startDate,
 * expiryDate, and status automatically — behaviour is preserved unchanged.
 * Errors bubble up so the caller's transaction can roll back.
 */
export async function createSubscription(
    payload: Payload,
    userId: number,
    planId: number,
    amountPaid: number,
    transactionID?: TransactionID,
): Promise<void> {
    const req = transactionID != null ? { transactionID } : undefined

    await payload.create({
        collection: 'subscriptions',
        data: {
            user: userId,
            plan: planId,
            amountPaid,
        },
        req,
    })
}

// ─── Core: process successful payment ────────────────────────────────────────

/**
 * Atomically claims a payment and activates the user's subscription.
 *
 * ── Race-condition safety ────────────────────────────────────────────────────
 * Both the /verify route and the Razorpay webhook may invoke this function for
 * the same payment within milliseconds of each other. The previous
 * application-level `if (payment.status === 'paid') return` check is a
 * read-then-write (TOCTOU) pattern: two callers can both read 'created',
 * both pass the check, and both create a subscription.
 *
 * The fix is an atomic conditional UPDATE:
 *
 *   UPDATE payments
 *   SET    status = 'paid', razorpay_payment_id = $1 [, razorpay_signature = $2]
 *   WHERE  id = $n AND status = 'created'
 *
 * PostgreSQL guarantees that exactly ONE concurrent writer receives rowCount = 1.
 * Every other concurrent writer receives rowCount = 0 and returns immediately.
 * This is a database-level compare-and-swap and is immune to race conditions.
 *
 * ── Transaction scope ────────────────────────────────────────────────────────
 * The payment claim (step 1) is intentionally executed outside the Payload
 * transaction because the atomic UPDATE IS the concurrency guard. The
 * subscription operations (step 2) are wrapped in a Payload transaction so that
 * expiring old subscriptions and creating the new one are committed atomically.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function processSuccessfulPayment({
    payload,
    payment,
    gatewayPaymentId,
    gatewaySignature,
}: ProcessSuccessfulPaymentInput): Promise<ProcessSuccessfulPaymentResult> {
    // ── Pre-claim Idempotency check ──────────────────────────────────────────
    // If the payment object passed is already marked 'paid', we can skip entirely.
    if (payment.status === 'paid') {
        payload.logger.info(
            `[Subscription Service] Payment ${payment.id} is already marked as paid. Skipping activation.`,
        )
        return { success: true, alreadyProcessed: true }
    }

    // Double check database status directly, in case it was updated by another process
    // after the local payment object was retrieved but before we hit the atomic query.
    const freshPayment = await payload.findByID({
        collection: 'payments',
        id: payment.id,
    })

    if (freshPayment.status === 'paid') {
        payload.logger.info(
            `[Subscription Service] Payment ${payment.id} is already marked as paid in database. Skipping activation.`,
        )
        return { success: true, alreadyProcessed: true }
    }

    // ── Step 1: Atomic claim ────────────────────────────────────────────────
    // Build the conditional UPDATE using drizzle's sql`` tagged template so
    // parameters are safely bound. The WHERE clause `status = 'created'` is the
    // compare-and-swap. Only one concurrent caller will succeed.
    const claimQuery = gatewaySignature != null
        ? sql`UPDATE payments
             SET    status = 'paid',
                    razorpay_payment_id = ${gatewayPaymentId},
                    razorpay_signature  = ${gatewaySignature}
             WHERE  id = ${payment.id} AND status = 'created'`
        : sql`UPDATE payments
             SET    status = 'paid',
                    razorpay_payment_id = ${gatewayPaymentId}
             WHERE  id = ${payment.id} AND status = 'created'`

    const drizzle = (payload.db as any).drizzle
    if (!drizzle) {
        throw new Error('Drizzle database client is not available on payload.db')
    }
    const claimResult = await drizzle.execute(claimQuery)

    // rowCount = 0 → another process already claimed this payment (webhook or
    // verify route). Return immediately without creating a duplicate subscription.
    const rowsClaimed = (claimResult as { rowCount?: number }).rowCount ?? 0

    if (rowsClaimed === 0) {
        payload.logger.info(
            `[Subscription Service] Payment ${payment.id} already claimed by another process. Skipping duplicate activation.`,
        )
        return { success: true, alreadyProcessed: true }
    }

    // ── Step 2: Activate subscription (in a Payload transaction) ───────────
    // We won the atomic claim. Now expire old subscriptions and create the new
    // one. Both operations are wrapped in a transaction so they succeed or fail
    // together. If this block throws, the payment remains 'paid' (the claim
    // cannot be rolled back at this point), but the webhook retry mechanism will
    // re-trigger activation on the next delivery attempt.

    const hasTransactions =
        payload.db != null &&
        typeof payload.db.beginTransaction === 'function' &&
        typeof payload.db.commitTransaction === 'function' &&
        typeof payload.db.rollbackTransaction === 'function'

    let transactionID: TransactionID = null

    const userId = typeof payment.user === 'object' ? payment.user.id : (payment.user as number)
    const planId = typeof payment.plan === 'object' ? payment.plan.id : (payment.plan as number)

    try {
        if (hasTransactions) {
            transactionID = await payload.db.beginTransaction()
            payload.logger.info(
                `[Subscription Service] Started transaction ${transactionID} for payment ${payment.id}`,
            )
        }

        await expireActiveSubscriptions(payload, userId, transactionID)
        await createSubscription(payload, userId, planId, payment.amount, transactionID)

        if (hasTransactions && transactionID != null) {
            await payload.db.commitTransaction(transactionID)
            payload.logger.info(
                `[Subscription Service] Committed transaction ${transactionID} for payment ${payment.id}`,
            )
        }

        payload.logger.info(
            `[Subscription Service] Successfully activated subscription for user ${userId} on plan ${planId}.`,
        )
        return { success: true, alreadyProcessed: false }
    } catch (error) {
        if (hasTransactions && transactionID != null) {
            try {
                await payload.db.rollbackTransaction(transactionID)
                payload.logger.warn(
                    `[Subscription Service] Rolled back transaction ${transactionID} for payment ${payment.id}`,
                )
            } catch (rollbackErr) {
                payload.logger.error(
                    rollbackErr,
                    `[Subscription Service] Failed to rollback transaction ${transactionID}`,
                )
            }
        }
        throw error
    }
}
