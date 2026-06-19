import type { Payload } from 'payload'

export interface Subscription {
    id: string | number
    status: string
    expiryDate: string
    startDate: string
    plan: any
}

export function normalizeKey(key: string): string {
    return (key || '').replace(/-/g, '_').toLowerCase()
}

export function isSubscriptionActive(subscription: Subscription | null | undefined): boolean {
    if (!subscription) return false
    if (subscription.status !== 'active') return false
    const now = new Date()
    const expiry = new Date(subscription.expiryDate)
    return expiry > now
}

type HelperArgs = {
    payload: Payload
    userId: string
    featureKey: string
}

export async function canAccessFeature({
    payload,
    userId,
    featureKey,
}: HelperArgs): Promise<boolean> {
    const subscriptions = await payload.find({
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
        depth: 2,
        limit: 1,
    })

    const subscription = subscriptions.docs[0] as unknown as Subscription

    if (!isSubscriptionActive(subscription)) {
        return false
    }

    const plan = subscription.plan
    if (!plan) return false

    const featureLimits = plan.featureLimits || []
    const limit = featureLimits.find((item: any) => {
        const feat = typeof item.feature === 'object' ? item.feature : null
        return feat && normalizeKey(feat.key) === normalizeKey(featureKey)
    })

    if (!limit) return false
    if (limit.limitType === 'disabled') return false
    if (limit.limitType === 'unlimited') return true

    if (limit.limitType === 'limited') {
        const featureId = typeof limit.feature === 'object' ? limit.feature.id : limit.feature

        const usages = await payload.find({
            collection: 'feature-usages',
            where: {
                and: [
                    {
                        subscription: {
                            equals: subscription.id as any,
                        },
                    },
                    {
                        feature: {
                            equals: featureId as any,
                        },
                    },
                ],
            },
            limit: 1,
        })

        const usageCount = usages.docs[0]?.count || 0
        return usageCount < (limit.limitValue || 0)
    }

    return false
}

export async function incrementFeatureUsage({
    payload,
    userId,
    featureKey,
}: HelperArgs): Promise<boolean> {
    const subscriptions = await payload.find({
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
        depth: 2,
        limit: 1,
    })

    const subscription = subscriptions.docs[0] as unknown as Subscription
    if (!isSubscriptionActive(subscription)) {
        return false
    }

    const plan = subscription.plan
    if (!plan) return false

    const featureLimits = plan.featureLimits || []
    const limit = featureLimits.find((item: any) => {
        const feat = typeof item.feature === 'object' ? item.feature : null
        return feat && normalizeKey(feat.key) === normalizeKey(featureKey)
    })

    if (!limit) return false
    if (limit.limitType === 'disabled') return false
    if (limit.limitType === 'unlimited') return true

    const featureId = typeof limit.feature === 'object' ? limit.feature.id : limit.feature

    const usages = await payload.find({
        collection: 'feature-usages',
        where: {
            and: [
                {
                    subscription: {
                        equals: subscription.id as any,
                    },
                },
                {
                    feature: {
                        equals: featureId as any,
                    },
                },
            ],
        },
        limit: 1,
    })

    const existingUsage = usages.docs[0]

    if (existingUsage) {
        if (existingUsage.count >= (limit.limitValue || 0)) {
            return false
        }

        await payload.update({
            collection: 'feature-usages',
            id: existingUsage.id,
            data: {
                count: existingUsage.count + 1,
            },
        })
    } else {
        await payload.create({
            collection: 'feature-usages',
            data: {
                subscription: subscription.id as any,
                feature: featureId as any,
                count: 1,
                lastReset: new Date().toISOString(),
            },
        })
    }

    return true
}
