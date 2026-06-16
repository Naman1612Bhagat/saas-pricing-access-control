import type { Payload } from 'payload'
import type { Payment } from '@/payload-types'

export interface ProcessSuccessfulPaymentInput {
    payload: Payload
    payment: Payment
    gatewayPaymentId: string
    gatewaySignature?: string
}

/**
 * Expires all active subscriptions for the specified user.
 */
export async function expireActiveSubscriptions(
    payload: Payload,
    userId: number,
    transactionID?: any
): Promise<void> {
    try {
        const activeSubscriptions = await payload.find({
            collection: 'subscriptions',
            where: {
                and: [
                    {
                        user: {
                            equals: userId,
                        },
                    },
                    {
                        status: {
                            equals: 'active',
                        },
                    },
                ],
            },
            req: transactionID ? { transactionID } : undefined,
        })

        for (const sub of activeSubscriptions.docs) {
            await payload.update({
                collection: 'subscriptions',
                id: sub.id,
                data: {
                    status: 'expired',
                },
                req: transactionID ? { transactionID } : undefined,
            })
        }
    } catch (err) {
        console.error(`[Subscription Service] Failed to expire previous active subscriptions for user ${userId}:`, err)
        // Propagate error to trigger transaction rollback
        throw err
    }
}

/**
 * Creates a new active subscription for the user and plan.
 * Subscription dates and active status are handled by the Subscriptions collection hook.
 */
export async function createSubscription(
    payload: Payload,
    userId: number,
    planId: number,
    amountPaid: number,
    transactionID?: any
): Promise<void> {
    try {
        await payload.create({
            collection: 'subscriptions',
            data: {
                user: userId,
                plan: planId,
                amountPaid: amountPaid,
            },
            req: transactionID ? { transactionID } : undefined,
        })
    } catch (err) {
        console.error(`[Subscription Service] Failed to create new subscription for user ${userId}:`, err)
        throw err
    }
}

/**
 * Handles a successful payment lifecycle:
 * 1. Checks if the payment is already processed (idempotency check).
 * 2. Marks the payment record as 'paid' and records transaction details.
 * 3. Expires previous active subscriptions.
 * 4. Activates the new subscription.
 * Uses database transactions if supported by the database adapter.
 */
export async function processSuccessfulPayment({
    payload,
    payment,
    gatewayPaymentId,
    gatewaySignature,
}: ProcessSuccessfulPaymentInput): Promise<void> {
    // Idempotency check: prevent double processing if already marked as paid
    if (payment.status === 'paid') {
        payload.logger.info(`[Subscription Service] Payment ${payment.id} already marked as paid. Skipping activation.`)
        return
    }

    // Determine if database transactions are supported by Payload's current db adapter
    const hasTransactions =
        payload.db &&
        typeof payload.db.beginTransaction === 'function' &&
        typeof payload.db.commitTransaction === 'function' &&
        typeof payload.db.rollbackTransaction === 'function'

    let transactionID: any = null

    try {
        if (hasTransactions) {
            transactionID = await payload.db.beginTransaction()
            payload.logger.info(`[Subscription Service] Started transaction ${transactionID} for payment ${payment.id}`)
        }

        // 1. Update payment record to paid
        await payload.update({
            collection: 'payments',
            id: payment.id,
            data: {
                razorpayPaymentId: gatewayPaymentId,
                ...(gatewaySignature ? { razorpaySignature: gatewaySignature } : {}),
                status: 'paid',
            },
            req: transactionID ? { transactionID } : undefined,
        })

        const userId = typeof payment.user === 'object' ? payment.user.id : (payment.user as number)
        const planId = typeof payment.plan === 'object' ? payment.plan.id : (payment.plan as number)

        // 2. Expire previous subscriptions
        await expireActiveSubscriptions(payload, userId, transactionID)

        // 3. Create the new subscription
        await createSubscription(payload, userId, planId, payment.amount, transactionID)

        if (hasTransactions && transactionID) {
            await payload.db.commitTransaction(transactionID)
            payload.logger.info(`[Subscription Service] Committed transaction ${transactionID} for payment ${payment.id}`)
        }
    } catch (error) {
        if (hasTransactions && transactionID) {
            try {
                await payload.db.rollbackTransaction(transactionID)
                payload.logger.error(`[Subscription Service] Rolled back transaction ${transactionID} due to error.`)
            } catch (rollbackErr) {
                payload.logger.error(rollbackErr, `[Subscription Service] Failed to rollback transaction ${transactionID}`)
            }
        }
        throw error
    }
}
