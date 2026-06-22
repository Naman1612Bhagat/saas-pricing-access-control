import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { canAccessFeature, isSubscriptionActive } from '@/utilities/subscriptionHelpers'
import ExportReportsClient from './ExportReportsClient'

export const dynamic = 'force-dynamic'

export default async function ExportReportsPage() {
    const headers = await getHeaders()
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    let user: any = null
    try {
        const authResult = await payload.auth({ headers })
        user = authResult.user
    } catch (e) {
    }

    if (!user) {
        redirect('/login')
    }

    const subsResult = await payload.find({
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
            ],
        },
        depth: 2,
        limit: 1,
    })
    const subscription = subsResult.docs[0] as any
    const isSubActive = isSubscriptionActive(subscription)

    const featuresResult = await payload.find({
        collection: 'features',
        where: {
            or: [
                {
                    key: {
                        equals: 'export-reports',
                    },
                },
                {
                    key: {
                        equals: 'export_reports',
                    },
                },
            ],
        },
        limit: 1,
    })
    const exportReportsFeature = featuresResult.docs[0]

    const hasAccess = await canAccessFeature({
        payload,
        userId: String(user.id),
        featureKey: 'export-reports',
    })

    if (hasAccess && exportReportsFeature) {
        let limitType = 'disabled'
        let limitValue = null
        let currentUsage = 0

        const featureLimits = subscription.plan.featureLimits || []
        const limit = featureLimits.find((item: any) => {
            const fid = typeof item.feature === 'object' ? item.feature.id : item.feature
            return String(fid) === String(exportReportsFeature.id)
        })

        if (limit) {
            limitType = limit.limitType
            limitValue = limit.limitValue

            const usagesResult = await payload.find({
                collection: 'feature-usages',
                where: {
                    and: [
                        {
                            subscription: {
                                equals: subscription.id,
                            },
                        },
                        {
                            feature: {
                                equals: exportReportsFeature.id,
                            },
                        },
                    ],
                },
                limit: 1,
            })
            currentUsage = usagesResult.docs[0]?.count || 0
        }

        return (
            <div className="bg-[#0b0f19] py-12 px-4 sm:px-6 lg:px-8 flex-grow">
                <ExportReportsClient
                    initialUsage={currentUsage}
                    limitType={limitType}
                    limitValue={limitValue}
                />
            </div>
        )
    }

    let lockReason = ''
    if (!subscription) {
        lockReason = 'No active subscription found. You must subscribe to a pricing plan to access this feature.'
    } else if (!isSubActive) {
        const endedDate = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(subscription.expiryDate))
        lockReason = `Your active subscription has expired (ended on ${endedDate}).`
    } else if (!exportReportsFeature) {
        lockReason = 'The Premium Reports feature is not registered in the database.'
    } else {
        const featureLimits = subscription.plan.featureLimits || []
        const limit = featureLimits.find((item: any) => {
            const fid = typeof item.feature === 'object' ? item.feature.id : item.feature
            return String(fid) === String(exportReportsFeature.id)
        })

        if (!limit || limit.limitType === 'disabled') {
            lockReason = `Feature is not included in your current plan (${subscription.plan?.name}).`
        } else if (limit.limitType === 'limited') {
            const usagesResult = await payload.find({
                collection: 'feature-usages',
                where: {
                    and: [
                        {
                            subscription: {
                                equals: subscription.id,
                            },
                        },
                        {
                            feature: {
                                equals: exportReportsFeature.id,
                            },
                        },
                    ],
                },
                limit: 1,
            })
            const currentUsage = usagesResult.docs[0]?.count || 0
            lockReason = `You have exhausted your plan limit (${currentUsage} / ${limit.limitValue} reports exported).`
        }
    }

    const activePlansResult = await payload.find({
        collection: 'plans',
        where: {
            isActive: {
                equals: true,
            },
        },
        depth: 2,
    })

    const eligiblePlans = activePlansResult.docs.filter((plan: any) => {
        // If this is the user's current plan and they reached usage limit, we must look for a different/higher plan!
        if (subscription && String(plan.id) === String(subscription.plan?.id || subscription.plan)) {
            // Exclude current plan unless it supports higher limits (not possible since plan limits are static)
            return false
        }

        const featureLimits = plan.featureLimits || []
        const limit = featureLimits.find((item: any) => {
            const fid = typeof item.feature === 'object' ? item.feature.id : item.feature
            return exportReportsFeature && String(fid) === String(exportReportsFeature.id)
        })

        return limit && limit.limitType !== 'disabled'
    })

    eligiblePlans.sort((a: any, b: any) => a.price - b.price)
    const recommendedUpgradePlan = eligiblePlans[0]

    return (
        <div className="bg-[#0b0f19] py-20 px-4 sm:px-6 lg:px-8 flex-grow flex items-center justify-center">
            <div className="max-w-md w-full bg-[#161c2a]/80 backdrop-blur-md border border-[#232d42] p-8 rounded-3xl shadow-xl text-center space-y-6">
                <div className="w-16 h-16 bg-red-950/30 border border-red-500/20 rounded-full flex items-center justify-center text-3xl mx-auto">
                    🔒
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">Access Denied</h1>
                    <div className="p-3 bg-red-900/10 border border-red-500/30 rounded-xl text-red-200 text-sm text-center font-medium">
                        {lockReason}
                    </div>
                </div>

                {recommendedUpgradePlan ? (
                    <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-2xl space-y-3 text-left">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Recommended Upgrade</span>
                        <h3 className="text-base font-bold text-white">{recommendedUpgradePlan.name}</h3>
                        <p className="text-xs text-slate-400">
                            Unlock access for <strong className="text-white">Premium Reports</strong> and more.
                        </p>
                        <div className="flex justify-between items-baseline pt-1">
                            <span className="text-lg font-bold text-white">₹{recommendedUpgradePlan.price}</span>
                            <span className="text-xs text-slate-500">/{recommendedUpgradePlan.validityDays} days</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-slate-500">
                        Please contact administration to purchase or assign a plan with access.
                    </p>
                )}

                <div className="flex flex-col gap-3">
                    <Link
                        href="/pricing"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer block text-sm"
                    >
                        {recommendedUpgradePlan ? 'Upgrade Plan Now' : 'View Pricing Plans'}
                    </Link>
                    <Link
                        href="/dashboard"
                        className="bg-[#1f293d] hover:bg-[#2d3a54] border border-[#2d3a54] text-white font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer block text-sm"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}
