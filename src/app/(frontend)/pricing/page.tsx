import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import PricingClient from './PricingClient'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
    const headers = await getHeaders()
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    let user: any = null
    try {
        const authResult = await payload.auth({ headers })
        user = authResult.user
    } catch {
    }

    const plansResult = await payload.find({
        collection: 'plans',
        where: {
            isActive: {
                equals: true,
            },
        },
        depth: 2,
    })
    
    const plans = [...plansResult.docs].sort((a: any, b: any) => Number(a.price) - Number(b.price))

    const featuresResult = await payload.find({
        collection: 'features',
        limit: 50,
    })
    const features = featuresResult.docs

    let activeSubscription: any = null
    if (user) {
        const subs = await payload.find({
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
                    {
                        expiryDate: {
                            greater_than: new Date().toISOString(),
                        },
                    },
                ],
            },
            depth: 2,
            limit: 1,
        })
        activeSubscription = subs.docs[0]
    }

    const currentPlanId = activeSubscription?.plan?.id || activeSubscription?.plan
    
    const conversionRateStr = process.env.PAYPAL_USD_CONVERSION_RATE
    let conversionRate: number | null = null
    if (conversionRateStr) {
        const rate = parseFloat(conversionRateStr)
        if (!isNaN(rate) && rate > 0) {
            conversionRate = rate
        }
    }

    return (
        <PricingClient
            plans={plans as any}
            features={features}
            currentPlanId={currentPlanId}
            currentPlanExpiryDate={activeSubscription?.expiryDate || null}
            isLoggedIn={!!user}
            conversionRate={conversionRate}
        />
    )
}