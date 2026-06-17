import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { processSuccessfulPayment } from '@/lib/subscriptions/subscriptionService'

interface RazorpayWebhookPayload {
    event: string
    payload?: {
        payment?: {
            entity?: {
                id?: string
                order_id?: string
                [key: string]: any
            }
        }
    }
}

/**
 * Handles incoming Razorpay webhook events to safely activate subscriptions.
 * Validates HMAC signature, prevents duplicate processing, and executes updates inside transactions.
 */
export async function POST(req: Request) {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

        if (!webhookSecret) {
            console.error('[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured on the server')
            return NextResponse.json(
                { error: 'Webhook secret is not configured' },
                { status: 500 },
            )
        }

        const rawBody = await req.text()
        const receivedSignature = req.headers.get('x-razorpay-signature')

        if (!receivedSignature) {
            console.warn('[Razorpay Webhook] Missing x-razorpay-signature header')
            return NextResponse.json(
                { error: 'Missing Razorpay signature' },
                { status: 400 },
            )
        }

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex')

        if (expectedSignature !== receivedSignature) {
            console.warn('[Razorpay Webhook] Invalid webhook signature received')
            return NextResponse.json(
                { error: 'Invalid webhook signature' },
                { status: 400 },
            )
        }

        // Safely parse JSON body
        let event: RazorpayWebhookPayload
        try {
            event = JSON.parse(rawBody) as RazorpayWebhookPayload
        } catch (err) {
            console.error('[Razorpay Webhook] Failed to parse raw request body as JSON:', err)
            return NextResponse.json(
                { error: 'Malformed JSON payload' },
                { status: 400 },
            )
        }

        const eventType = event.event

        // Check if event is supported
        if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
            console.log(`[Razorpay Webhook] Ignoring unsupported event type: "${eventType}"`)
            return NextResponse.json({ received: true, ignored: true })
        }

        const paymentEntity = event.payload?.payment?.entity
        const orderId = paymentEntity?.order_id
        const paymentId = paymentEntity?.id

        if (!orderId || !paymentId) {
            console.warn('[Razorpay Webhook] Missing order_id or payment_id in payment.entity')
            return NextResponse.json(
                { error: 'Missing order or payment id in webhook payload' },
                { status: 400 },
            )
        }

        const payload = await getPayload({ config })

        // Retrieve local Payment record
        const paymentResult = await payload.find({
            collection: 'payments',
            where: {
                razorpayOrderId: {
                    equals: orderId,
                },
            },
            limit: 1,
        })

        const payment = paymentResult.docs[0]

        if (!payment) {
            console.error(`[Razorpay Webhook] Payment record not found in database for order ID: ${orderId}`)
            return NextResponse.json(
                { error: 'Payment record not found' },
                { status: 404 },
            )
        }

        // Idempotency: if payment is already paid, return 200 immediately
        if (payment.status === 'paid') {
            console.log(`[Razorpay Webhook] Payment for order ${orderId} already marked as paid. Skipping activation.`)
            return NextResponse.json({
                received: true,
                message: 'Payment already processed',
            })
        }

        // Process successful payment and activate subscription using the unified service
        try {
            const result = await processSuccessfulPayment({
                payload,
                payment,
                gatewayPaymentId: paymentId,
            })

            if (result.alreadyProcessed) {
                console.log(`[Razorpay Webhook] Payment for order ${orderId} already processed. Skipping.`)
                return NextResponse.json({
                    received: true,
                    message: 'Payment already processed',
                })
            }
        } catch (err) {
            console.error(`[Razorpay Webhook] Failed to activate subscription for order ${orderId}:`, err)
            return NextResponse.json(
                { error: 'Subscription activation failed during processing' },
                { status: 500 },
            )
        }

        console.log(`[Razorpay Webhook] Successfully processed payment and activated subscription for order ${orderId}`)
        return NextResponse.json({
            received: true,
            message: 'Webhook processed successfully',
        })
    } catch (error) {
        console.error('[Razorpay Webhook] Unhandled exception during webhook processing:', error)

        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 },
        )
    }
}