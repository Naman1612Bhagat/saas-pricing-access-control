import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Handles verification of Razorpay payment signatures.
 * On success, updates the payment record to 'paid' and creates a new active subscription.
 * Any previous active subscription for the user is marked as 'expired'.
 */
export async function POST(req: Request) {
    try {
        const payload = await getPayload({ config })
        const { user } = await payload.auth({ headers: req.headers })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const bodyText = await req.text()
        let body
        try {
            body = JSON.parse(bodyText)
        } catch (err) {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
        }

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = body

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
        }

        // 1. Validate environment configuration
        const keySecret = process.env.RAZORPAY_KEY_SECRET
        if (!keySecret) {
            console.error('RAZORPAY_KEY_SECRET is not configured on the server')
            return NextResponse.json({ error: 'Internal server configuration error' }, { status: 500 })
        }

        // 2. Signature Verification
        const verificationBody = `${razorpay_order_id}|${razorpay_payment_id}`
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(verificationBody)
            .digest('hex')

        if (expectedSignature !== razorpay_signature) {
            console.warn(`Signature verification failed for order ${razorpay_order_id}`)
            
            // Mark payment as failed if we can find it
            try {
                const paymentResult = await payload.find({
                    collection: 'payments',
                    where: {
                        razorpayOrderId: {
                            equals: razorpay_order_id,
                        },
                    },
                    limit: 1,
                })
                const payment = paymentResult.docs[0]
                if (payment && payment.status === 'created') {
                    await payload.update({
                        collection: 'payments',
                        id: payment.id,
                        data: {
                            status: 'failed',
                            razorpayPaymentId: razorpay_payment_id,
                            razorpaySignature: razorpay_signature,
                        },
                    })
                }
            } catch (err) {
                console.error('Failed to update payment status to failed after verification failure:', err)
            }

            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
        }

        // 3. Retrieve local Payment record
        const paymentResult = await payload.find({
            collection: 'payments',
            where: {
                razorpayOrderId: {
                    equals: razorpay_order_id,
                },
            },
            limit: 1,
        })

        const payment = paymentResult.docs[0]

        if (!payment) {
            console.error(`Payment record not found for order ID: ${razorpay_order_id}`)
            return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
        }

        // Prevent double processing if already marked as paid
        if (payment.status === 'paid') {
            return NextResponse.json({
                success: true,
                message: 'Payment has already been processed and verified',
            })
        }

        // 4. Update payment transaction to paid
        try {
            await payload.update({
                collection: 'payments',
                id: payment.id,
                data: {
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature,
                    status: 'paid',
                },
            })
        } catch (err) {
            console.error('Failed to update payment status to paid:', err)
            return NextResponse.json({ error: 'Failed to complete transaction update' }, { status: 500 })
        }

        // 5. Expire existing active subscriptions for the user
        try {
            const activeSubscriptions = await payload.find({
                collection: 'subscriptions',
                where: {
                    and: [
                        {
                            user: {
                                equals: user.id,
                            },
                        },
                        {
                            status: {
                                equals: 'active',
                            },
                        },
                    ],
                },
            })

            for (const sub of activeSubscriptions.docs) {
                await payload.update({
                    collection: 'subscriptions',
                    id: sub.id,
                    data: {
                        status: 'expired',
                    },
                })
            }
        } catch (err) {
            console.error('Failed to expire previous active subscriptions:', err)
            // Log the error but proceed with creating the new subscription so we don't
            // penalize a paying customer for a cleanup error.
        }

        // 6. Create new subscription
        // Plan fetching, date calculations (startDate, expiryDate), and setting active status
        // are encapsulated and executed in the 'beforeChange' hook on Subscriptions collection.
        const planId = typeof payment.plan === 'object' ? payment.plan.id : payment.plan
        try {
            await payload.create({
                collection: 'subscriptions',
                data: {
                    user: user.id,
                    plan: planId,
                    amountPaid: payment.amount,
                },
            })
        } catch (err) {
            console.error('Failed to create new subscription record:', err)
            return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Payment verified and subscription activated',
        })
    } catch (error) {
        console.error('Payment verification error:', error)
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 })
    }
}