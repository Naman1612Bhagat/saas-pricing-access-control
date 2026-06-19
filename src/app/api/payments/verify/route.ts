import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { getPaymentProvider } from '@/lib/payments/paymentService'
import { processSuccessfulPayment } from '@/lib/subscriptions/subscriptionService'
import config from '@payload-config'

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

        let isValid = false
        try {
            const paymentProvider = getPaymentProvider()
            const verificationResult = await paymentProvider.verifyPayment({
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                signature: razorpay_signature,
            })
            isValid = verificationResult.valid
        } catch (err) {
            console.error('Payment verification failed with provider:', err)
            return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 })
        }

        if (!isValid) {
            console.warn(`Signature verification failed for order ${razorpay_order_id}`)
            
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

        if (payment.status === 'paid') {
            return NextResponse.json({
                success: true,
                message: 'Payment has already been processed and verified',
            })
        }

        try {
            const result = await processSuccessfulPayment({
                payload,
                payment,
                gatewayPaymentId: razorpay_payment_id,
                gatewaySignature: razorpay_signature,
            })

            if (result.alreadyProcessed) {
                return NextResponse.json({
                    success: true,
                    message: 'Payment has already been processed and verified',
                })
            }
        } catch (err) {
            console.error('Failed to process successful payment activation:', err)
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