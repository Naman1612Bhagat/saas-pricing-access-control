import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { getPaymentProvider } from '@/lib/payments/paymentService'
import { processSuccessfulPayment } from '@/lib/subscriptions/subscriptionService'
import config from '@payload-config'

export async function GET(req: Request) {
    const host = req.headers.get('host')
    const protocol = req.headers.get('x-forwarded-proto') || 'http'
    const origin = `${protocol}://${host}`

    try {
        const { searchParams } = new URL(req.url)
        const orderId = searchParams.get('order_id')

        if (!orderId) {
            return NextResponse.redirect(`${origin}/pricing?error=Missing+order+ID`)
        }

        const payload = await getPayload({ config })
        const { user } = await payload.auth({ headers: req.headers })

        if (!user) {
            return NextResponse.redirect(`${origin}/login`)
        }

        // Find the payment record using gatewayOrderId
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
            return NextResponse.redirect(`${origin}/pricing?error=Payment+record+not+found`)
        }

        // Security check: verify payment belongs to the logged-in user
        const paymentUserId = typeof payment.user === 'object' && payment.user !== null
            ? payment.user.id
            : payment.user

        if (Number(paymentUserId) !== Number(user.id)) {
            return NextResponse.redirect(`${origin}/pricing?error=Forbidden`)
        }

        if (payment.status === 'paid') {
            return NextResponse.redirect(`${origin}/dashboard`)
        }

        // Verify with Cashfree provider
        const paymentProvider = getPaymentProvider('cashfree')
        const verificationResult = await paymentProvider.verifyPayment({
            orderId,
            paymentId: '',
            signature: '',
        })

        if (!verificationResult.valid) {
            if (payment.status === 'created') {
                await payload.update({
                    collection: 'payments',
                    id: payment.id,
                    data: {
                        status: 'failed',
                    },
                })
            }
            return NextResponse.redirect(`${origin}/pricing?error=Payment+failed`)
        }

        const gatewayPaymentId = verificationResult.gatewayPaymentId || `cf_pay_${Date.now()}`

        // Process successful payment
        await processSuccessfulPayment({
            payload,
            payment,
            gatewayPaymentId,
        })

        return NextResponse.redirect(`${origin}/dashboard`)
    } catch (error) {
        console.error('Cashfree GET verify error:', error)
        return NextResponse.redirect(`${origin}/pricing?error=Internal+server+error`)
    }
}

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
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
        }

        // Find the payment record using gatewayOrderId
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

        const paymentUserId = typeof payment.user === 'object' && payment.user !== null
            ? payment.user.id
            : payment.user

        if (Number(paymentUserId) !== Number(user.id)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (payment.status === 'paid') {
            return NextResponse.json({ success: true, alreadyProcessed: true })
        }

        const paymentProvider = getPaymentProvider('cashfree')
        const verificationResult = await paymentProvider.verifyPayment({
            orderId,
            paymentId: '',
            signature: '',
        })

        if (!verificationResult.valid) {
            if (payment.status === 'created') {
                await payload.update({
                    collection: 'payments',
                    id: payment.id,
                    data: {
                        status: 'failed',
                    },
                })
            }
            return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
        }

        const gatewayPaymentId = verificationResult.gatewayPaymentId || `cf_pay_${Date.now()}`

        await processSuccessfulPayment({
            payload,
            payment,
            gatewayPaymentId,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Cashfree POST verify error:', error)
        return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
    }
}
