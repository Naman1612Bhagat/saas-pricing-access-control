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

// Compare-and-swap concurrency guard.
// PostgreSQL guarantees only one concurrent updater receives rowCount = 1.
// Other callers will receive rowCount = 0 and exit.
export async function processSuccessfulPayment({
    payload,
    payment,
    gatewayPaymentId,
    gatewaySignature,
}: ProcessSuccessfulPaymentInput): Promise<ProcessSuccessfulPaymentResult> {
    // Prevent duplicate subscription activation if a gateway retries callbacks.
    if (payment.status === 'paid') {
        payload.logger.info(
            `[Subscription Service] Payment ${payment.id} is already marked as paid. Skipping activation.`,
        )
        return { success: true, alreadyProcessed: true }
    }

    // Double check DB status in case of concurrency between retrieval and update.
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

    // Atomic update as a compare-and-swap. Only one concurrent caller will succeed.
    let claimQuery
    if (payment.gateway === 'cashfree' || payment.gateway === 'paypal') {
        claimQuery = sql`UPDATE payments
             SET    status = 'paid',
                    gateway_payment_id = ${gatewayPaymentId}
             WHERE  id = ${payment.id} AND status = 'created'`
    } else {
        claimQuery = gatewaySignature != null
            ? sql`UPDATE payments
                 SET    status = 'paid',
                        gateway_payment_id = ${gatewayPaymentId},
                        gateway_signature  = ${gatewaySignature},
                        razorpay_payment_id = ${gatewayPaymentId},
                        razorpay_signature  = ${gatewaySignature}
                 WHERE  id = ${payment.id} AND status = 'created'`
            : sql`UPDATE payments
                 SET    status = 'paid',
                        gateway_payment_id = ${gatewayPaymentId},
                        razorpay_payment_id = ${gatewayPaymentId}
                 WHERE  id = ${payment.id} AND status = 'created'`
    }

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

    // Activate the new subscription within a database transaction.
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
