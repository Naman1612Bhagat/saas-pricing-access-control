import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { getPaymentProvider } from '@/lib/payments/paymentService'
import { processSuccessfulPayment } from '@/lib/subscriptions/subscriptionService'
import config from '@payload-config'
import type { PayPalProvider } from '@/lib/payments/providers/paypal'

export async function POST(req: Request) {
    try {
        const payload = await getPayload({ config })
        const { user } = await payload.auth({ headers: req.headers })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { orderId } = body

        if (!orderId) {
            return NextResponse.json({ error: 'PayPal order ID is required' }, { status: 400 })
        }

        const paymentsResult = await payload.find({
            collection: 'payments',
            where: {
                gatewayOrderId: {
                    equals: orderId,
                },
            },
            limit: 1,
        })

        const payment = paymentsResult.docs[0]

        if (!payment) {
            return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
        }

        // Security check: ensure the payment belongs to the currently authenticated user
        const paymentUserId = typeof payment.user === 'object' && payment.user !== null
            ? payment.user.id
            : payment.user

        if (Number(paymentUserId) !== Number(user.id)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (payment.status === 'paid') {
            return NextResponse.json({ success: true, alreadyProcessed: true })
        }

        const provider = getPaymentProvider('paypal') as PayPalProvider
        const captureResult = await provider.captureOrder(orderId)

        if (!captureResult.valid || !captureResult.gatewayPaymentId) {
            if (payment.status === 'created') {
                await payload.update({
                    collection: 'payments',
                    id: payment.id,
                    data: {
                        status: 'failed',
                    },
                })
            }
            return NextResponse.json({ error: captureResult.error || 'PayPal capture failed' }, { status: 400 })
        }

        await processSuccessfulPayment({
            payload,
            payment,
            gatewayPaymentId: captureResult.gatewayPaymentId,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('PayPal capture API error:', error)
        return NextResponse.json({ error: 'Failed to capture PayPal order' }, { status: 500 })
    }
}
