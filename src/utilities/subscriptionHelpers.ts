import type { Payload } from 'payload'

export interface Subscription {
    id: string | number
    status: string
    expiryDate: string
    startDate: string
    plan: any
}

// Normalize feature keys to avoid dash vs underscore mismatches
export function normalizeKey(key: string): string {
    return (key || '').replace(/-/g, '_').toLowerCase()
}

// Helper to determine if a subscription is currently active
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

// Main access-control helper checking active subscription, expiry, feature availability, and limits
export async function canAccessFeature({
    payload,
    userId,
    featureKey,
}: HelperArgs): Promise<boolean> {
    // 1. Fetch user's active subscription (status === 'active')
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

    // 2. Verify subscription is active and not expired (avoid DB write during read)
    if (!isSubscriptionActive(subscription)) {
        return false
    }

    const plan = subscription.plan
    if (!plan) return false

    // 3. Find the feature and limit type
    const featureLimits = plan.featureLimits || []
    const limit = featureLimits.find((item: any) => {
        const feat = typeof item.feature === 'object' ? item.feature : null
        return feat && normalizeKey(feat.key) === normalizeKey(featureKey)
    })

    if (!limit) return false
    if (limit.limitType === 'disabled') return false
    if (limit.limitType === 'unlimited') return true

    // 4. For limited features, check usage count
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

// Helper to increment usage for limited features
export async function incrementFeatureUsage({
    payload,
    userId,
    featureKey,
}: HelperArgs): Promise<boolean> {
    // 1. Fetch active subscription
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

    // 2. Find feature limit and details
    const featureLimits = plan.featureLimits || []
    const limit = featureLimits.find((item: any) => {
        const feat = typeof item.feature === 'object' ? item.feature : null
        return feat && normalizeKey(feat.key) === normalizeKey(featureKey)
    })

    if (!limit) return false
    if (limit.limitType === 'disabled') return false
    if (limit.limitType === 'unlimited') return true // Unlimited features do not need usage tracking, return success

    const featureId = typeof limit.feature === 'object' ? limit.feature.id : limit.feature

    // 3. Query existing usage
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
        // Verify we aren't exceeding limit before incrementing
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
