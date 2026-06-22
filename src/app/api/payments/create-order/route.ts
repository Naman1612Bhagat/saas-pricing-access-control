import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getPaymentProvider } from '@/lib/payments/paymentService'

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

        const { planId, gateway } = body

        if (!planId) {
            return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
        }

        if (!gateway) {
            return NextResponse.json({ error: 'Payment gateway is required' }, { status: 400 })
        }

        if (gateway !== 'razorpay' && gateway !== 'cashfree' && gateway !== 'paypal') {
            return NextResponse.json({ error: 'Unsupported payment gateway' }, { status: 400 })
        }

        const gatewaySettings = await payload.find({
            collection: 'payment-gateway-settings',
            where: {
                gateway: {
                    equals: gateway,
                },
            },
            limit: 1,
        })
        const settingDoc = gatewaySettings.docs[0]
        if (settingDoc && !settingDoc.isEnabled) {
            return NextResponse.json({ error: 'Selected payment gateway is disabled or unavailable' }, { status: 400 })
        }

        let plan
        try {
            plan = await payload.findByID({
                collection: 'plans',
                id: planId,
            })
        } catch (err) {
            console.error(`Plan not found for ID: ${planId}`, err)
            return NextResponse.json({ error: 'Selected plan not found' }, { status: 404 })
        }

        if (!plan) {
            return NextResponse.json({ error: 'Selected plan not found' }, { status: 404 })
        }

        const amountInRupees = Number(plan.price)
        if (isNaN(amountInRupees) || amountInRupees <= 0) {
            return NextResponse.json({ error: 'Invalid plan price' }, { status: 400 })
        }

        const host = req.headers.get('host')
        const protocol = req.headers.get('x-forwarded-proto') || 'http'
        const origin = `${protocol}://${host}`
        const returnUrl = `${origin}/api/payments/cashfree/verify?order_id={order_id}`

        let orderResult
        try {
            const paymentProvider = getPaymentProvider(gateway)
            orderResult = await paymentProvider.createOrder({
                amountInRupees,
                currency: 'INR',
                receipt: `plan_${planId}_user_${user.id}`,
                notes: {
                    userId: String(user.id),
                    planId: String(planId),
                    planName: plan.name,
                    returnUrl,
                },
                customerDetails: {
                    id: String(user.id),
                    email: user.email,
                    name: user.name || undefined,
                },
            })
        } catch (err) {
            console.error('Payment gateway order creation failed:', err)
            return NextResponse.json({ error: 'Failed to create order with payment gateway' }, { status: 502 })
        }
        try {
            await payload.create({
                collection: 'payments',
                data: {
                    user: user.id,
                    plan: planId,
                    amount: gateway === 'paypal' ? orderResult.amount / 100 : amountInRupees,
                    currency: gateway === 'paypal' ? 'USD' : 'INR',
                    gateway: gateway,
                    gatewayOrderId: orderResult.gatewayOrderId,
                    // Store in razorpayOrderId only if gateway is razorpay for backward compatibility
                    ...(gateway === 'razorpay' ? { razorpayOrderId: orderResult.gatewayOrderId } : {}),
                    status: 'created',
                },
            })
        } catch (err) {
            console.error('Failed to create payment record in database:', err)
            return NextResponse.json({ error: 'Failed to initialize payment transaction' }, { status: 500 })
        }

        let keyId: string | undefined = undefined
        if (gateway === 'razorpay') {
            keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
            if (!keyId) {
                console.error('NEXT_PUBLIC_RAZORPAY_KEY_ID environment variable is missing')
                return NextResponse.json({ error: 'Internal server configuration error' }, { status: 500 })
            }
        }

        return NextResponse.json({
            orderId: orderResult.gatewayOrderId,
            amount: orderResult.amount,
            currency: orderResult.currency,
            keyId,
            planName: plan.name,
            paymentSessionId: orderResult.paymentSessionId,
            mode: process.env.CASHFREE_ENV || 'sandbox',
            paypalClientId: process.env.PAYPAL_CLIENT_ID,
            paypalMode: process.env.PAYPAL_ENV || 'sandbox',
        })
    } catch (error) {
        console.error('Create Razorpay order error:', error)
        return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 })
    }
}