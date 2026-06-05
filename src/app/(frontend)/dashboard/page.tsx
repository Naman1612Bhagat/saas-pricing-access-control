import React from 'react'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isSubscriptionActive } from '@/utilities/subscriptionHelpers'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const headers = await getHeaders()
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    // 1. Authenticate user
    let user: any = null
    try {
        const authResult = await payload.auth({ headers })
        user = authResult.user
    } catch (e) {
        // Not logged in
    }

    if (!user) {
        redirect('/login')
    }

    // 2. Fetch user's active subscription (including plan depth=2)
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

    // 3. Fetch Export Reports Feature details (Check for both export-reports and export_reports)
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

    let limitType = 'disabled'
    let limitValue = null
    let currentUsage = 0
    let isFeatureEnabled = false
    let lockReason = ''

    if (!subscription) {
        lockReason = 'No active subscription found.'
    } else if (!isSubActive) {
        const endedDate = new Date(subscription.expiryDate).toLocaleDateString('en-IN')
        lockReason = `Subscription is expired (ended on ${endedDate}).`
    } else if (!exportReportsFeature) {
        lockReason = 'Feature document ("export-reports" or "export_reports") not found in database.'
    } else {
        const featureLimits = subscription.plan.featureLimits || []
        const limit = featureLimits.find((item: any) => {
            const fid = typeof item.feature === 'object' ? item.feature.id : item.feature
            return String(fid) === String(exportReportsFeature.id)
        })

        if (!limit) {
            lockReason = 'Feature is not included in your active plan.'
        } else if (limit.limitType === 'disabled') {
            lockReason = 'Feature is disabled on your active plan.'
        } else {
            limitType = limit.limitType
            limitValue = limit.limitValue

            // Fetch current usage count
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

            if (limitType === 'limited' && limitValue !== null && currentUsage >= limitValue) {
                lockReason = `Usage limit reached (${currentUsage} / ${limitValue} used).`
            } else {
                isFeatureEnabled = true
            }
        }
    }

    // Calculate days remaining
    let daysRemaining = 0
    let formattedExpiry = ''
    if (subscription) {
        const expiry = new Date(subscription.expiryDate)
        const now = new Date()
        const diffTime = expiry.getTime() - now.getTime()
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
        formattedExpiry = new Date(subscription.expiryDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

    return (
        <div className="bg-[#0b0f19] py-12 px-4 sm:px-6 lg:px-8 flex-grow">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Welcome Title */}
                <div>
                    <h1 className="text-3xl font-extrabold text-white">Welcome back, {user.name}!</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage your active plans and track API feature usage limits.</p>
                </div>

                {!subscription ? (
                    /* Empty State: No Subscription */
                    <div className="bg-[#121824]/50 border border-[#1f293d]/50 p-12 rounded-3xl text-center space-y-6 max-w-xl mx-auto">
                        <div className="w-16 h-16 bg-slate-800/40 rounded-full flex items-center justify-center text-2xl mx-auto">
                            💳
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-white">No Active Subscription</h2>
                            <p className="text-sm text-slate-400">
                                You do not have an active subscription. Subscribe to a plan to unlock premium features.
                            </p>
                        </div>
                        <Link
                            href="/pricing"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer inline-block"
                        >
                            Explore Pricing Plans
                        </Link>
                    </div>
                ) : (
                    /* Dashboard Grid */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Left Side: Summary Cards */}
                        <div className="md:col-span-2 space-y-8">
                            {/* Summary Card */}
                            <div className="bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 p-6 sm:p-8 rounded-3xl grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Plan</span>
                                    <h2 className="text-3xl font-extrabold text-white">{subscription.plan?.name}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span
                                            className={`inline-flex items-center w-2.5 h-2.5 rounded-full ${
                                                isSubActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                                            }`}
                                        />
                                        <span className={`text-sm font-semibold ${isSubActive ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {isSubActive ? 'Active' : 'Expired'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1 sm:border-l sm:border-[#1f293d]/50 sm:pl-6">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {isSubActive ? 'Expires In' : 'Subscription Ended'}
                                    </span>
                                    <h3 className="text-3xl font-extrabold text-white">
                                        {isSubActive ? `${daysRemaining} Days` : 'Expired'}
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {isSubActive ? `Renewal Date: ${formattedExpiry}` : 'Please upgrade to restore access.'}
                                    </p>
                                </div>
                            </div>

                            {/* Features Limit Section */}
                            <div className="bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 p-6 sm:p-8 rounded-3xl space-y-6">
                                <h3 className="text-xl font-bold text-white">Features Access & Usage</h3>

                                <div className="space-y-6">
                                    {/* Export Reports Row */}
                                    <div className="border border-[#1f293d]/30 bg-[#0d121f]/50 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-bold text-white text-base">Premium Reports</h4>
                                                {isFeatureEnabled ? (
                                                    <span className="text-emerald-400 text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-medium">
                                                        🔓 Active
                                                    </span>
                                                ) : (
                                                    <span className="text-red-400 text-xs px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 font-medium">
                                                        🔒 Locked
                                                    </span>
                                                )}
                                            </div>
                                            {!isFeatureEnabled && (
                                                <p className="text-xs text-red-300/80 font-medium">
                                                    Reason: {lockReason}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-400 max-w-sm pt-1">
                                                Generate PDF or CSV files from your analytics dashboard.
                                            </p>
                                        </div>

                                        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                                            {/* Progress Info */}
                                            {isSubActive && limitType !== 'disabled' && (
                                                <div className="w-full sm:w-48 space-y-1.5">
                                                    <div className="flex justify-between text-xs font-semibold">
                                                        <span className="text-slate-400">Usage Limit:</span>
                                                        <span className="text-white">
                                                            {limitType === 'unlimited' ? `${currentUsage} / Unlimited` : `${currentUsage} / ${limitValue}`}
                                                        </span>
                                                    </div>

                                                    {limitType === 'limited' && limitValue && (
                                                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-300 ${
                                                                    (currentUsage / limitValue) >= 1
                                                                        ? 'bg-red-500'
                                                                        : (currentUsage / limitValue) >= 0.7
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-indigo-500'
                                                                }`}
                                                                style={{ width: `${Math.min(100, (currentUsage / limitValue) * 100)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Action Link */}
                                            {isFeatureEnabled ? (
                                                <Link
                                                    href="/features/export-reports"
                                                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 sm:mt-1 self-start sm:self-auto"
                                                >
                                                    Open App Page ➜
                                                </Link>
                                            ) : (
                                                <Link
                                                    href="/pricing"
                                                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 sm:mt-1 self-start sm:self-auto"
                                                >
                                                    Upgrade Plan ➜
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Interactive Simulation triggers */}
                        <div className="md:col-span-1">
                            <DashboardClient subscriptionId={subscription.id} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
