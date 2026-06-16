import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getPaymentProvider } from '@/lib/payments/paymentService'

/**
 * Handles creation of Razorpay payment orders.
 * Creates an order in Razorpay and records a matching transaction in the 'payments' collection.
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

        const { planId } = body

        if (!planId) {
            return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
        }

        // 1. Fetch Plan Document
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

        // 2. Validate Price
        const amountInRupees = Number(plan.price)
        if (isNaN(amountInRupees) || amountInRupees <= 0) {
            return NextResponse.json({ error: 'Invalid plan price' }, { status: 400 })
        }

        // 3. Create Gateway Order
        let orderResult
        try {
            const paymentProvider = getPaymentProvider()
            orderResult = await paymentProvider.createOrder({
                amountInRupees,
                currency: 'INR',
                receipt: `plan_${planId}_user_${user.id}`,
                notes: {
                    userId: String(user.id),
                    planId: String(planId),
                },
            })
        } catch (err) {
            console.error('Payment gateway order creation failed:', err)
            return NextResponse.json({ error: 'Failed to create order with payment gateway' }, { status: 502 })
        }

        // 4. Create Local Payment Record
        try {
            await payload.create({
                collection: 'payments',
                data: {
                    user: user.id,
                    plan: planId,
                    amount: amountInRupees,
                    currency: 'INR',
                    gateway: 'razorpay',
                    razorpayOrderId: orderResult.gatewayOrderId,
                    status: 'created',
                },
            })
        } catch (err) {
            console.error('Failed to create payment record in database:', err)
            return NextResponse.json({ error: 'Failed to initialize payment transaction' }, { status: 500 })
        }

        const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
        if (!publicKeyId) {
            console.error('NEXT_PUBLIC_RAZORPAY_KEY_ID environment variable is missing')
            return NextResponse.json({ error: 'Internal server configuration error' }, { status: 500 })
        }

        return NextResponse.json({
            orderId: orderResult.gatewayOrderId,
            amount: orderResult.amount,
            currency: orderResult.currency,
            keyId: publicKeyId,
            planName: plan.name,
        })
    } catch (error) {
        console.error('Create Razorpay order error:', error)
        return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 })
    }
}