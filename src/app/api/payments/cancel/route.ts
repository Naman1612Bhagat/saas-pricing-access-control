import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: Request) {
    try {
        const payload = await getPayload({ config })
        const { user } = await payload.auth({ headers: req.headers })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { orderId } = await req.json()

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
        }

        const paymentResult = await payload.find({
            collection: 'payments',
            where: {
                and: [
                    {
                        or: [
                            {
                                gatewayOrderId: {
                                    equals: orderId,
                                },
                            },
                            {
                                razorpayOrderId: {
                                    equals: orderId,
                                },
                            },
                        ],
                    },
                    {
                        user: {
                            equals: user.id,
                        },
                    },
                ],
            },
            limit: 1,
        })

        const payment = paymentResult.docs[0]

        if (!payment) {
            return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
        }

        // Only transition to failed if it is still in the 'created' state
        if (payment.status === 'created') {
            await payload.update({
                collection: 'payments',
                id: payment.id,
                data: {
                    status: 'failed',
                },
            })
        }

        return NextResponse.json({ success: true, message: 'Payment cancelled successfully' })
    } catch (error) {
        console.error('Payment cancellation error:', error)
        return NextResponse.json({ error: 'Failed to process payment cancellation' }, { status: 500 })
    }
}
