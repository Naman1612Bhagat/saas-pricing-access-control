import React from 'react'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isSubscriptionActive, normalizeKey } from '@/utilities/subscriptionHelpers'
import DashboardClient from './DashboardClient'
import { Shield, Clock, CreditCard, Activity, ArrowRight, FileDown, Sparkles, Headphones, BarChart2, Layers } from 'lucide-react'

const IconMap: Record<string, React.ComponentType<any>> = {
    Shield,
    Clock,
    CreditCard,
    Activity,
    FileDown,
    Sparkles,
    Headphones,
    BarChart2,
    Layers,
}

export const dynamic = 'force-dynamic'
export default async function DashboardPage() {
    const headers = await getHeaders()
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    let user: any = null
    try {
        const authResult = await payload.auth({ headers })
        user = authResult.user
    } catch {
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

    const displayFeatures: any[] = []
    let reportsUsed = 0

    if (subscription && subscription.plan) {
        const featureLimits = subscription.plan.featureLimits || []
        for (const limit of featureLimits) {
            if (!limit.feature) continue

            const feat = typeof limit.feature === 'object' ? limit.feature : null
            if (!feat) continue

            const featKey = feat.key
            const normKey = normalizeKey(featKey)
            const limitType = limit.limitType
            const limitValue = limit.limitValue

            if (limitType === 'disabled') continue

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
                                equals: feat.id,
                            },
                        },
                    ],
                },
                limit: 1,
            })
            const usageCount = usagesResult.docs[0]?.count || 0

            if (normKey === 'export_reports') {
                reportsUsed = usageCount
            }

            let isEnabled = false
            let statusBadge = ''
            let lockReasonText = ''
            let buttonText = 'Open'
            let buttonHref = '#'
            let isButtonDisabled = false

            if (!isSubActive) {
                const endedDate = new Intl.DateTimeFormat('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                }).format(new Date(subscription.expiryDate))
                lockReasonText = `Subscription expired on ${endedDate}.`
                statusBadge = 'Locked'
                buttonText = 'Upgrade Plan'
                buttonHref = '/pricing'
            } else if (limitType === 'limited' && limitValue !== null && usageCount >= limitValue) {
                lockReasonText = `Usage limit reached (${usageCount} / ${limitValue} used).`
                statusBadge = 'Limit Reached'
                buttonText = 'Upgrade Plan'
                buttonHref = '/pricing'
            } else {
                isEnabled = true
                statusBadge = 'Enabled'

                if (normKey === 'export_reports') {
                    buttonText = 'Export'
                    buttonHref = '/features/export-reports'
                } else if (normKey === 'priority_support') {
                    buttonText = 'Contact Support'
                    buttonHref = 'mailto:support@accessshield.com'
                } else if (normKey === 'advanced_analytics') {
                    buttonText = 'Analytics Enabled'
                    buttonHref = '#'
                    isButtonDisabled = true
                } else {
                    buttonText = 'Active'
                    buttonHref = '#'
                }
            }

            let description = feat.description || ''
            if (!description) {
                if (normKey === 'export_reports') {
                    description = 'Generates printable PDF reports from raw account telemetry charts.'
                } else if (normKey === 'priority_support') {
                    description = 'Priority support channel with direct access to our engineering team.'
                } else if (normKey === 'advanced_analytics') {
                    description = 'Deep-dive charts and analytics detailing access logs and request flows.'
                } else {
                    description = 'Access to plan-specific feature limits.'
                }
            }

            let iconName = 'Sparkles'
            if (normKey === 'export_reports') {
                iconName = 'FileDown'
            } else if (normKey === 'priority_support') {
                iconName = 'Headphones'
            } else if (normKey === 'advanced_analytics') {
                iconName = 'BarChart2'
            }

            displayFeatures.push({
                id: feat.id,
                name: feat.name,
                key: featKey,
                normKey,
                description,
                limitType,
                limitValue,
                usageCount,
                isEnabled,
                statusBadge,
                lockReason: lockReasonText,
                buttonText,
                buttonHref,
                isButtonDisabled,
                iconName,
            })
        }
    }

    const paymentsResult = await payload.find({
        collection: 'payments',
        where: {
            and: [
                {
                    user: {
                        equals: user.id,
                    },
                },
                {
                    status: {
                        equals: 'paid',
                    },
                },
            ],
        },
        limit: 100,
    })
    const totalSpent = paymentsResult.docs.reduce((acc, curr: any) => acc + (curr.amount || 0), 0)

    let daysRemaining = 0
    let formattedStart = ''
    let formattedExpiry = ''
    let progressPercentage = 0

    if (subscription) {
        const start = new Date(subscription.startDate || subscription.createdAt)
        const expiry = new Date(subscription.expiryDate)
        const now = new Date()

        const totalDuration = expiry.getTime() - start.getTime()
        const elapsed = now.getTime() - start.getTime()

        progressPercentage = totalDuration > 0
            ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)))
            : 100

        daysRemaining = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

        const dateOnlyFormatter = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        formattedStart = dateOnlyFormatter.format(start)
        formattedExpiry = dateOnlyFormatter.format(expiry)
    }

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <div className="bg-[#0b0f19] py-12 px-4 sm:px-6 lg:px-8 flex-grow">
            <div className="max-w-5xl mx-auto space-y-10">

                {/* SECTION 1: Welcome Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-[#1f293d]/40 pb-6">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-extrabold text-white tracking-tight">
                                Welcome back, {user.name.split(' ')[0]} 👋
                            </h1>
                            {subscription ? (
                                <>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                        {subscription.plan?.name}
                                    </span>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        Active
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-500/10 border border-slate-500/20 text-slate-400">
                                        No Active Plan
                                    </span>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-red-500/10 border border-red-500/20 text-red-400">
                                        Inactive
                                    </span>
                                </>
                            )}
                        </div>
                        <p className="text-[13px] text-slate-500 font-medium">{user.email}</p>
                        <p className="text-sm text-slate-400 mt-1.5">
                            Manage your subscription, billing, reports and feature usage limits.
                        </p>
                    </div>
                </div>
                {/* SECTION 2: Metric Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Metric 1: Active Plan */}
                    <div className="bg-[#121824]/50 border border-[#1f293d]/50 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:border-[#1f293d] hover:bg-[#121824]/80 transition-all duration-200">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Plan</span>
                            <div className="text-base font-extrabold text-white">
                                {subscription?.plan?.name || 'No Active Plan'}
                            </div>
                            <div className={`text-[10px] font-bold ${isSubActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {isSubActive ? 'Premium Active' : 'No active service'}
                            </div>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <Shield size={18} />
                        </div>
                    </div>
                    {/* Metric 2: Days Remaining */}
                    <div className="bg-[#121824]/50 border border-[#1f293d]/50 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:border-[#1f293d] hover:bg-[#121824]/80 transition-all duration-200">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Days Remaining</span>
                            <div className="text-base font-extrabold text-white">
                                {isSubActive ? `${daysRemaining} Days` : '0 Days'}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500">
                                {isSubActive ? `Expires: ${formattedExpiry}` : 'Plan expired'}
                            </div>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <Clock size={18} />
                        </div>
                    </div>
                    {/* Metric 3: Total Payments */}
                    <div className="bg-[#121824]/50 border border-[#1f293d]/50 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:border-[#1f293d] hover:bg-[#121824]/80 transition-all duration-200">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Payments</span>
                            <div className="text-base font-extrabold text-white">
                                {formatPrice(totalSpent)}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500">
                                Lifetime billed sum
                            </div>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <CreditCard size={18} />
                        </div>
                    </div>
                    {/* Metric 4: Reports Used */}
                    <div className="bg-[#121824]/50 border border-[#1f293d]/50 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:border-[#1f293d] hover:bg-[#121824]/80 transition-all duration-200">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reports Exported</span>
                            <div className="text-base font-extrabold text-white">
                                {reportsUsed}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500">
                                Current Billing Cycle
                            </div>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <Activity size={18} />
                        </div>
                    </div>
                </div>
                {/* Main Dashboard Workspace Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                        {!subscription ? (
                            <div className="bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 p-10 rounded-3xl text-center space-y-6">
                                <div className="w-14 h-14 bg-slate-800/40 border border-slate-700/30 rounded-2xl flex items-center justify-center text-xl mx-auto shadow-inner">
                                    💳
                                </div>
                                <div className="space-y-2 max-w-sm mx-auto">
                                    <h2 className="text-lg font-bold text-white">No Active Plan</h2>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        You are currently on a free, inactive tier. Upgrade your account to unlock premium PDF reporting features.
                                    </p>
                                </div>
                                <Link
                                    href="/pricing"
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-sm shadow-indigo-600/10 cursor-pointer inline-block"
                                >
                                    Explore Pricing Plans
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-[#1f293d]/40 pb-4">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Shield className="text-indigo-400" size={16} />
                                            <span>Active Subscription Period</span>
                                        </h3>
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                            {isSubActive ? 'Active' : 'Expired'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs border-b border-[#1f293d]/30 pb-6">
                                        <div>
                                            <span className="text-slate-500 font-bold block">Plan Name</span>
                                            <span className="text-white font-extrabold text-sm mt-1 block">{subscription.plan?.name}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 font-bold block">Start Date</span>
                                            <span className="text-slate-300 font-semibold mt-1 block">{formattedStart}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 font-bold block">Renewal Date</span>
                                            <span className="text-slate-300 font-semibold mt-1 block">{formattedExpiry}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 font-bold block">Days Remaining</span>
                                            <span className="text-indigo-400 font-extrabold text-sm mt-1 block">
                                                {isSubActive ? `${daysRemaining} Days` : 'Expired'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center justify-between text-[11px] font-semibold">
                                            <span className="text-indigo-400 font-bold">{daysRemaining} Days Remaining</span>
                                            <span className="text-slate-500">{progressPercentage}% elapsed</span>
                                        </div>
                                        <div className="w-full bg-[#1f293d]/40 h-2 rounded-full overflow-hidden border border-[#2d3a54]/20 shadow-inner">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-550"
                                                style={{ width: `${progressPercentage}%` }}
                                            />
                                        </div>
                                        {isSubActive && (
                                            <p className="text-[10px] text-slate-500 italic pt-1">
                                                Your subscription is valid for {subscription.plan?.validityDays || 0} total days.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
                                    <div className="border-b border-[#1f293d]/40 pb-4">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Layers className="text-indigo-400" size={16} />
                                            <span>Feature Usage & Limits</span>
                                        </h3>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Monitor resource consumption against your active subscription plan.
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        {displayFeatures.length === 0 ? (
                                            <div className="text-center py-6 border border-dashed border-[#1f293d]/50 rounded-2xl bg-[#0d121f]/30">
                                                <p className="text-xs text-slate-500">No active features configured for your plan.</p>
                                            </div>
                                        ) : (
                                            displayFeatures.map((feat) => {
                                                const IconComponent = IconMap[feat.iconName] || Sparkles
                                                return (
                                                    <div key={feat.id} className="space-y-2.5 bg-[#0d121f]/50 border border-[#1f293d]/20 p-5 rounded-2xl">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                            <div className="space-y-0.5">
                                                                <h4 className="font-bold text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                                    <IconComponent size={14} className="text-indigo-400" />
                                                                    <span>{feat.name}</span>
                                                                    {feat.statusBadge === 'Enabled' && (
                                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                                            🔓 Unlocked
                                                                        </span>
                                                                    )}
                                                                    {feat.statusBadge === 'Limit Reached' && (
                                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                                                            ⚠️ Limit Reached
                                                                        </span>
                                                                    )}
                                                                    {feat.statusBadge === 'Locked' && (
                                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                                                                            🔒 Locked
                                                                        </span>
                                                                    )}
                                                                </h4>
                                                                {feat.lockReason && (
                                                                    <p className="text-[10px] text-red-400/80 font-medium">
                                                                        Reason: {feat.lockReason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className="font-semibold text-slate-300">
                                                                {feat.limitType === 'unlimited' ? `${feat.usageCount} / Unlimited` : `${feat.usageCount} / ${feat.limitValue ?? 0}`}
                                                            </span>
                                                        </div>

                                                        {feat.limitType !== 'disabled' && (
                                                            <div className="w-full bg-[#1f293d]/30 h-1.5 rounded-full overflow-hidden border border-[#2d3a54]/10">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-300 ${feat.limitType === 'unlimited'
                                                                        ? 'bg-indigo-500'
                                                                        : (feat.usageCount / (feat.limitValue || 1)) >= 1
                                                                            ? 'bg-red-500'
                                                                            : 'bg-indigo-500'
                                                                        }`}
                                                                    style={{
                                                                        width: `${feat.limitType === 'unlimited' ? Math.min(100, feat.usageCount * 10) : Math.min(100, (feat.usageCount / (feat.limitValue || 1)) * 100)}%`
                                                                    }}
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between items-center pt-2">
                                                            <p className="text-[10px] text-slate-500 max-w-sm">
                                                                {feat.description}
                                                            </p>
                                                            {feat.isButtonDisabled ? (
                                                                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-0.5 cursor-not-allowed">
                                                                    <span>{feat.buttonText}</span>
                                                                </span>
                                                            ) : (
                                                                <Link href={feat.buttonHref} className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                                                                    <span>{feat.buttonText}</span> <span>➜</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="md:col-span-1 space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                                Quick Actions
                            </h3>

                            <div className="space-y-3">
                                <Link
                                    href="/dashboard/billing"
                                    className="group p-4 bg-[#121824]/50 border border-[#1f293d]/50 hover:border-indigo-500/40 hover:bg-[#121824] rounded-2xl transition-all duration-300 flex items-start gap-3.5 cursor-pointer shadow-sm"
                                >
                                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-105 transition-transform">
                                        <CreditCard size={15} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                                            <span>Billing History</span>
                                            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                        </h4>
                                        <p className="text-[10px] text-slate-400 leading-normal">View payment history and details.</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/features/export-reports"
                                    className="group p-4 bg-[#121824]/50 border border-[#1f293d]/50 hover:border-indigo-500/40 hover:bg-[#121824] rounded-2xl transition-all duration-300 flex items-start gap-3.5 cursor-pointer shadow-sm"
                                >
                                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-105 transition-transform">
                                        <FileDown size={15} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                                            <span>Premium Reports</span>
                                            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                        </h4>
                                        <p className="text-[10px] text-slate-400 leading-normal">Access documents and charts.</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/pricing"
                                    className="group p-4 bg-[#121824]/50 border border-[#1f293d]/50 hover:border-indigo-500/40 hover:bg-[#121824] rounded-2xl transition-all duration-300 flex items-start gap-3.5 cursor-pointer shadow-sm"
                                >
                                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-105 transition-transform">
                                        <Sparkles size={15} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                                            <span>Upgrade Plan</span>
                                            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                        </h4>
                                        <p className="text-[10px] text-slate-400 leading-normal">Compare plans and pricing details.</p>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                                Interactive Simulation
                            </h3>
                            <DashboardClient subscriptionId={subscription?.id || 'no_active_sub'} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
