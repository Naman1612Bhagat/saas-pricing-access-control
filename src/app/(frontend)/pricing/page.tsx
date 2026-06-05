import React from 'react'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import SubscribeButton from './SubscribeButton'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
    const headers = await getHeaders()
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    // 1. Get current logged in user
    let user: any = null
    try {
        const authResult = await payload.auth({ headers })
        user = authResult.user
    } catch (e) {
        // Not logged in
    }

    // 2. Fetch active plans
    const plansResult = await payload.find({
        collection: 'plans',
        where: {
            isActive: {
                equals: true,
            },
        },
        depth: 2,
    })
    const plans = plansResult.docs

    // 3. Fetch all features
    const featuresResult = await payload.find({
        collection: 'features',
        limit: 50,
    })
    const features = featuresResult.docs

    // 4. Fetch current user's active subscription (if any)
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

    return (
        <div className="bg-[#0b0f19] py-16 px-4 sm:px-6 lg:px-8 flex-grow">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                        Simple, Transparent Plans
                    </h1>
                    <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
                        Choose a pricing tier that fits your needs. Lock or unlock features with clear monthly usage limits.
                    </p>
                </div>

                {/* Pricing Grid */}
                {plans.length === 0 ? (
                    <div className="text-center py-12 bg-[#121824]/50 border border-[#1f293d]/50 rounded-2xl max-w-md mx-auto">
                        <p className="text-slate-400">No active pricing plans found.</p>
                        <p className="text-xs text-slate-500 mt-2">Log in to the Admin Panel to create plans.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 max-w-6xl mx-auto items-stretch">
                        {plans.map((plan: any) => {
                            const isActiveUserPlan = currentPlanId && String(currentPlanId) === String(plan.id)

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative flex flex-col justify-between bg-[#121824]/80 backdrop-blur border rounded-3xl p-8 shadow-lg transition-all hover:translate-y-[-4px] hover:shadow-indigo-500/5 ${
                                        isActiveUserPlan
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                                            : 'border-[#1f293d]/70'
                                    }`}
                                >
                                    {isActiveUserPlan && (
                                        <span className="absolute top-0 right-8 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                            Current Active
                                        </span>
                                    )}

                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                                        <div className="flex items-baseline my-6">
                                            <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                                                ₹{plan.price}
                                            </span>
                                            <span className="text-slate-400 ml-2">/{plan.validityDays} days</span>
                                        </div>

                                        <hr className="border-[#1f293d]/50 my-6" />

                                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                                            Included Limits
                                        </h4>

                                        <ul className="space-y-3 mb-8">
                                            {features.map((feature: any) => {
                                                const limit = plan.featureLimits?.find((l: any) => {
                                                    const fid = typeof l.feature === 'object' ? l.feature.id : l.feature
                                                    return String(fid) === String(feature.id)
                                                })

                                                const limitType = limit?.limitType || 'disabled'
                                                const limitValue = limit?.limitValue

                                                return (
                                                    <li key={feature.id} className="flex items-center gap-3 text-sm">
                                                        {limitType === 'disabled' ? (
                                                            <>
                                                                <span className="text-slate-600">❌</span>
                                                                <span className="text-slate-500 line-through">{feature.name}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="text-indigo-400">✅</span>
                                                                <span className="text-slate-300">
                                                                    {feature.name}:{' '}
                                                                    <strong className="text-white font-semibold">
                                                                        {limitType === 'unlimited' ? 'Unlimited' : `${limitValue} / mo`}
                                                                    </strong>
                                                                </span>
                                                            </>
                                                        )}
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>

                                    <SubscribeButton
                                        planId={plan.id}
                                        isLoggedIn={!!user}
                                        currentPlanId={currentPlanId}
                                    />
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Plan Comparison Matrix */}
                {plans.length > 0 && (
                    <div className="max-w-4xl mx-auto mt-16 hidden sm:block">
                        <h3 className="text-2xl font-bold text-white text-center mb-8">Features Comparison</h3>
                        <div className="bg-[#121824]/50 border border-[#1f293d]/50 rounded-2xl overflow-hidden backdrop-blur">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#1f293d]">
                                        <th className="p-5 text-sm font-semibold text-slate-400">Feature</th>
                                        {plans.map((plan: any) => (
                                            <th key={plan.id} className="p-5 text-sm font-bold text-white text-center">
                                                {plan.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {features.map((feature: any) => (
                                        <tr key={feature.id} className="border-b border-[#1f293d]/30 hover:bg-[#161c2a]/20">
                                            <td className="p-5">
                                                <div className="font-semibold text-white text-sm">{feature.name}</div>
                                                <div className="text-xs text-slate-400 mt-1">{feature.description}</div>
                                            </td>
                                            {plans.map((plan: any) => {
                                                const limit = plan.featureLimits?.find((l: any) => {
                                                    const fid = typeof l.feature === 'object' ? l.feature.id : l.feature
                                                    return String(fid) === String(feature.id)
                                                })

                                                const limitType = limit?.limitType || 'disabled'
                                                const limitValue = limit?.limitValue

                                                return (
                                                    <td key={plan.id} className="p-5 text-center text-sm font-semibold">
                                                        {limitType === 'disabled' && (
                                                            <span className="text-slate-600">Disabled</span>
                                                        )}
                                                        {limitType === 'unlimited' && (
                                                            <span className="text-indigo-400 flex items-center justify-center gap-1">
                                                                <span>✅</span> Unlimited
                                                            </span>
                                                        )}
                                                        {limitType === 'limited' && (
                                                            <span className="text-slate-300">
                                                                {limitValue} / mo
                                                            </span>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}