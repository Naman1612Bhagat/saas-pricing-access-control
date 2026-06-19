import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const payloadConfig = await config
        const payload = await getPayload({ config: payloadConfig })

        const now = new Date().toISOString()

        const subscriptions = await payload.find({
            collection: 'subscriptions',
            where: {
                and: [
                    {
                        status: {
                            equals: 'active',
                        },
                    },
                    {
                        expiryDate: {
                            less_than_equal: now,
                        },
                    },
                ],
            },
            limit: 1000, // Batch limit
        })

        const expiredCount = subscriptions.docs.length

        for (const sub of subscriptions.docs) {
            await payload.update({
                collection: 'subscriptions',
                id: sub.id,
                data: {
                    status: 'expired',
                },
            })
        }

        return NextResponse.json({
            success: true,
            message: `Successfully expired ${expiredCount} subscriptions.`,
            expiredCount,
        })
    } catch (error: any) {
        console.error('Error in subscription expiry cron:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Internal Server Error',
            },
            { status: 500 }
        )
    }
}
