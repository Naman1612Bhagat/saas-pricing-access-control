import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: Request) {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

        if (!webhookSecret) {
            return NextResponse.json(
                { error: 'Webhook secret is not configured' },
                { status: 500 },
            )
        }

        const rawBody = await req.text()
        const receivedSignature = req.headers.get('x-razorpay-signature')

        if (!receivedSignature) {
            return NextResponse.json(
                { error: 'Missing Razorpay signature' },
                { status: 400 },
            )
        }

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex')

        if (expectedSignature !== receivedSignature) {
            return NextResponse.json(
                { error: 'Invalid webhook signature' },
                { status: 400 },
            )
        }

        const event = JSON.parse(rawBody)

        const eventType = event.event

        if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
            return NextResponse.json({ received: true, ignored: true })
        }

        const paymentEntity = event.payload?.payment?.entity
        const orderId = paymentEntity?.order_id
        const paymentId = paymentEntity?.id

        if (!orderId || !paymentId) {
            return NextResponse.json(
                { error: 'Missing order or payment id in webhook payload' },
                { status: 400 },
            )
        }

        const payload = await getPayload({ config })

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
            return NextResponse.json(
                { error: 'Payment record not found' },
                { status: 404 },
            )
        }

        if (payment.status === 'paid') {
            return NextResponse.json({
                received: true,
                message: 'Payment already processed',
            })
        }

        await payload.update({
            collection: 'payments',
            id: payment.id,
            data: {
                razorpayPaymentId: paymentId,
                status: 'paid',
            },
        })

        const userId =
            typeof payment.user === 'object' ? payment.user.id : payment.user

        const planId =
            typeof payment.plan === 'object' ? payment.plan.id : payment.plan

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

        await payload.create({
            collection: 'subscriptions',
            data: {
                user: userId,
                plan: planId,
                status: 'active',
            },
            draft: true,
        })

        return NextResponse.json({
            received: true,
            message: 'Webhook processed successfully',
        })
    } catch (error) {
        console.error('Razorpay webhook error:', error)

        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 },
        )
    }
}