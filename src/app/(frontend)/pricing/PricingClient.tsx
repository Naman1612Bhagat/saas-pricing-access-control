'use client'

import React, { useState } from 'react'
import SubscribeButton from './SubscribeButton'

interface FeatureLimit {
    feature: any
    limitType: 'disabled' | 'limited' | 'unlimited'
    limitValue?: number
}

interface Plan {
    id: string | number
    name: string
    price: number
    validityDays: number
    featureLimits?: FeatureLimit[]
    isActive?: boolean
}

interface Feature {
    id: string | number
    name: string
    description?: string | null
}

interface PricingClientProps {
    plans: Plan[]
    features: Feature[]
    currentPlanId?: string | number | null
    currentPlanExpiryDate?: string | null
    isLoggedIn: boolean
}

function getPlanDescription(planName: string): string {
    const name = planName.toLowerCase()
    if (name.includes('basic') || name.includes('free') || name.includes('hobby') || name.includes('starter')) {
        return 'Perfect for individuals and small teams getting started with AccessShield.'
    }
    if (name.includes('intermediate') || name.includes('pro')) {
        return 'Designed for growing businesses that need higher limits and priority support.'
    }
    if (name.includes('premium')) {
        return 'Advanced features, unlimited usage, and premium support for power users.'
    }
    return 'Designed for growing businesses that need higher limits and priority support.'
}

function getPlanSummary(planName: string): string {
    const name = planName.toLowerCase()
    if (name.includes('basic') || name.includes('free') || name.includes('hobby') || name.includes('starter')) {
        return '3 Features Included'
    }
    if (name.includes('intermediate') || name.includes('pro')) {
        return 'Growing Business Plan'
    }
    if (name.includes('premium')) {
        return 'Unlimited Access'
    }
    return ''
}

export default function PricingClient({ plans, features, currentPlanId, currentPlanExpiryDate, isLoggedIn }: PricingClientProps) {
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
    const [openFaq, setOpenFaq] = useState<number | null>(0) // First FAQ item open by default

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index)
    }

    const faqs = [
        {
            q: 'How does billing work?',
            a: 'All subscriptions are billed upfront for the specified validity period (e.g., 28 days). There are no hidden fees or auto-recurring contracts unless you manually authorize payment renewals.',
        },
        {
            q: 'Can I upgrade anytime?',
            a: 'Yes, you can upgrade to a higher tier plan at any point. Your old active plan will be automatically deactivated and replaced with the new plan\'s features and limit allocations immediately.',
        },
        {
            q: 'Do I receive invoices?',
            a: 'Absolutely. A detailed PDF invoice is generated for every successful payment. You can access and download them anytime from your Billing History in the dashboard.',
        },
        {
            q: 'Which payment methods are supported?',
            a: 'We support multiple secure payment methods including Razorpay (Credit/Debit Cards, UPI, Netbanking, Wallets) and Cashfree (UPI, Cards, and popular wallets).',
        },
        {
            q: 'What happens when my subscription expires?',
            a: 'Once your subscription period expires, your account will fall back to the free tier limits. Your data remains safe, and you can re-subscribe to any plan to reactivate premium features.',
        },
    ]

    return (
        <div className="bg-[#0b0f19] py-12 px-4 sm:px-6 lg:px-8 flex-grow">
            <div className="max-w-7xl mx-auto space-y-16">
                
                {/* 1. Header (Reduced Whitespace) */}
                <div className="relative text-center max-w-3xl mx-auto py-8 overflow-hidden">
                    {/* Radial Glow Effect */}
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_60%)] blur-3xl pointer-events-none" />
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-none">
                        Simple, Transparent Plans
                    </h1>
                    <p className="mt-4 text-base text-slate-400">
                        Choose a pricing tier that fits your needs. Lock or unlock features with clear usage limits.
                    </p>
                </div>

                {/* 2. Billing Toggle & Credibility Section */}
                <div className="flex flex-col items-center space-y-6">
                    <div className="relative bg-[#121824]/90 p-1 rounded-full border border-slate-800 flex items-center space-x-1">
                        <button
                            onClick={() => setBillingPeriod('monthly')}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                                billingPeriod === 'monthly'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingPeriod('yearly')}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                                billingPeriod === 'yearly'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span>Yearly</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-pulse">
                                Save 20%
                            </span>
                        </button>
                    </div>

                    {/* Small Credibility Section */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-slate-500 py-1 text-[10px] uppercase font-bold tracking-widest">
                        <span>Trusted Payments Powered By</span>
                        <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400">
                            {/* Razorpay Badge */}
                            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#121824] border border-slate-800/80 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                <span className="text-[10px] font-bold text-purple-300 normal-case">Razorpay</span>
                            </div>
                            {/* Cashfree Badge */}
                            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#121824] border border-slate-800/80 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-[10px] font-bold text-emerald-300 normal-case">Cashfree</span>
                            </div>
                            {/* SSL Secure Badge */}
                            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#121824] border border-slate-800/80 rounded-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <span className="text-[10px] font-bold text-indigo-300 normal-case">SSL Secured</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Pricing Cards Grid */}
                {plans.length === 0 ? (
                    <div className="text-center py-12 bg-[#121824]/50 border border-[#1f293d]/50 rounded-2xl max-w-md mx-auto">
                        <p className="text-slate-400">No active pricing plans found.</p>
                        <p className="text-xs text-slate-500 mt-2">Log in to the Admin Panel to create plans.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
                        {plans.map((plan: any) => {
                            const isPopular = plan.name.toLowerCase().includes('intermediate')
                            const isActiveUserPlan = currentPlanId && String(currentPlanId) === String(plan.id)

                            // Apply 20% discount on yearly toggle
                            const displayPrice = billingPeriod === 'yearly' ? Math.round(plan.price * 12 * 0.8) : plan.price
                            const isYearlyPlan = billingPeriod === 'yearly' || plan.validityDays === 365
                            const displayPeriodText = isYearlyPlan ? 'year' : `${plan.validityDays} days`

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative flex flex-col justify-between bg-[#121824]/80 backdrop-blur border rounded-3xl p-8 shadow-lg transition-all ${
                                        isActiveUserPlan
                                            ? 'border-indigo-500 bg-gradient-to-br from-[#1e294b] via-[#121824]/95 to-[#0b0f19] shadow-[0_0_30px_rgba(99,102,241,0.35)]'
                                            : 'border-[#1f293d]/70 md:hover:-translate-y-1 md:hover:border-indigo-500/60 md:hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] transition-all duration-300'
                                    }`}
                                >
                                    <div>
                                        {/* Badges Container (Both badges side-by-side cleanly) */}
                                        <div className="mb-4">
                                            <div className="flex flex-wrap gap-2 items-center min-h-[22px]">
                                                {isActiveUserPlan && (
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                                        Your Current Plan
                                                    </div>
                                                )}
                                                {isPopular && (
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-400">
                                                        <span>⭐</span> Most Popular
                                                    </div>
                                                )}
                                            </div>
                                            {isActiveUserPlan && currentPlanExpiryDate && (
                                                <div className="text-[10px] text-slate-400/90 font-medium mt-1.5 flex items-center gap-1">
                                                    <span>📅</span> Active until {new Date(currentPlanExpiryDate).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                        <p className="text-xs text-slate-400 mt-2.5 font-medium leading-relaxed">
                                            {getPlanDescription(plan.name)}
                                        </p>
                                        
                                        <div className="mt-3 text-[11px] font-bold text-indigo-400 tracking-wide">
                                            {getPlanSummary(plan.name)}
                                        </div>

                                        {/* Prominent Pricing Typography */}
                                        <div className="my-6">
                                            <div className="flex items-baseline">
                                                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                                                    ₹{displayPrice}
                                                </span>
                                                <span className="text-slate-400 text-xs ml-2">/ {displayPeriodText}</span>
                                            </div>
                                            {isYearlyPlan && (
                                                <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                                                    billed annually
                                                </div>
                                            )}
                                        </div>

                                        <hr className="border-[#1f293d]/50 my-6" />

                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
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
                                                    <li key={feature.id} className="flex items-center gap-2.5 text-xs">
                                                        {limitType === 'disabled' ? (
                                                            <>
                                                                <span className="text-red-500/60 text-[10px]">❌</span>
                                                                <span className="text-slate-500 line-through">{feature.name}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="text-emerald-500 text-[10px]">✓</span>
                                                                <span className="text-slate-300">
                                                                    {feature.name}:{' '}
                                                                    <strong className="text-white font-semibold">
                                                                        {limitType === 'unlimited' ? 'Unlimited' : `${limitValue}/mo`}
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
                                        isLoggedIn={isLoggedIn}
                                        currentPlanId={currentPlanId}
                                        ctaText="Subscribe"
                                    />
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* 4. Trust & Benefits Section */}
                <div className="max-w-6xl mx-auto py-4 border-y border-[#1f293d]/40">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-6 text-center">
                        {[
                            { label: 'Secure Payments', icon: '🔒' },
                            { label: 'Instant Activation', icon: '⚡' },
                            { label: 'PDF Invoice Downloads', icon: '🧾' },
                            { label: 'Razorpay Support', icon: '💳' },
                            { label: 'Cashfree Support', icon: '💸' },
                            { label: 'Cancel Anytime', icon: '✓' }
                        ].map((b, i) => (
                            <div key={i} className="flex flex-col items-center space-y-1.5">
                                <span className="text-lg">{b.icon}</span>
                                <span className="text-xs font-semibold text-slate-300">{b.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Plan Feature Comparison Matrix */}
                {plans.length > 0 && (
                    <div className="max-w-4xl mx-auto mt-8 hidden sm:block">
                        <h3 className="text-xl font-bold text-white text-center mb-8">Compare Plan Features</h3>
                        <div className="bg-[#121824]/60 border border-[#1f293d]/50 rounded-2xl overflow-hidden backdrop-blur shadow-xl">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="border-b border-[#1f293d]/60 bg-[#0e1320]/75">
                                        <th className="p-5 w-[35%] text-xs font-bold text-slate-400 uppercase tracking-wider">Feature</th>
                                        {plans.map((plan: any) => {
                                            const isPremium = plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('pro')
                                            return (
                                                <th key={plan.id} className={`p-5 text-sm font-bold text-center ${isPremium ? 'text-indigo-400 bg-indigo-500/5' : 'text-white'}`}>
                                                    {plan.name}
                                                </th>
                                            )
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {features.map((feature: any) => (
                                        <tr key={feature.id} className="border-b border-[#1f293d]/25 hover:bg-[#161c2a]/20 transition-colors">
                                            <td className="p-5">
                                                <div className="font-semibold text-white text-sm">{feature.name}</div>
                                                {feature.description && (
                                                    <div className="text-[11px] text-slate-400 mt-1 leading-normal">{feature.description}</div>
                                                )}
                                            </td>
                                            {plans.map((plan: any) => {
                                                const isPremium = plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('pro')
                                                const limit = plan.featureLimits?.find((l: any) => {
                                                    const fid = typeof l.feature === 'object' ? l.feature.id : l.feature
                                                    return String(fid) === String(feature.id)
                                                })

                                                const limitType = limit?.limitType || 'disabled'
                                                const limitValue = limit?.limitValue

                                                return (
                                                    <td key={plan.id} className={`p-5 text-center text-xs font-semibold ${isPremium ? 'bg-indigo-500/5' : ''}`}>
                                                        {limitType === 'disabled' && (
                                                            <span className="text-slate-600 text-sm font-bold">✕</span>
                                                        )}
                                                        {limitType === 'unlimited' && (
                                                            <span className="text-indigo-400 flex items-center justify-center gap-1 font-bold">
                                                                <span className="text-emerald-500">✓</span> Unlimited
                                                            </span>
                                                        )}
                                                        {limitType === 'limited' && (
                                                            <span className="text-slate-300 font-semibold">
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

                {/* 6. Payment Trust Badges */}
                <div className="max-w-xl mx-auto flex flex-col items-center space-y-3 py-6">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Secure Payments Partnered With</p>
                    <div className="flex items-center space-x-6">
                        {/* Razorpay Badge */}
                        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#121824] border border-slate-800 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span className="text-xs font-bold text-purple-300">Razorpay</span>
                        </div>
                        {/* Cashfree Badge */}
                        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#121824] border border-slate-800 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-xs font-bold text-emerald-300">Cashfree</span>
                        </div>
                        {/* SSL Secure Badge */}
                        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#121824] border border-slate-800 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span className="text-xs font-bold text-indigo-300">SSL Secured</span>
                        </div>
                    </div>
                </div>

                {/* Support CTA Section */}
                <div className="max-w-3xl mx-auto p-8 bg-gradient-to-r from-[#121824]/40 via-[#182035]/30 to-[#121824]/40 border border-[#1f293d]/50 rounded-2xl text-center space-y-3">
                    <h4 className="text-lg font-bold text-white">Still have questions?</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        Contact support and we'll help you choose the right plan.
                    </p>
                    <a
                        href="mailto:support@accessshield.com"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-semibold text-xs rounded-xl transition-all cursor-pointer mt-1"
                    >
                        <span>Contact Support</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </a>
                </div>

                {/* 7. Collapsible FAQ Section */}
                <div className="max-w-3xl mx-auto mt-12">
                    <h3 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h3>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => {
                            const isOpen = openFaq === index
                            return (
                                <div
                                    key={index}
                                    className="bg-[#121824]/60 border border-[#1f293d]/50 rounded-2xl overflow-hidden transition-all duration-200"
                                >
                                    <button
                                        onClick={() => toggleFaq(index)}
                                        className="w-full flex justify-between items-center p-5 text-left font-bold text-white text-sm hover:bg-[#161c2a]/20 cursor-pointer"
                                    >
                                        <span>{faq.q}</span>
                                        <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                        </span>
                                    </button>
                                    <div
                                        className={`grid transition-all duration-300 ease-in-out ${
                                            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                        }`}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="p-5 pt-0 border-t border-[#1f293d]/20 text-xs text-slate-400 font-medium leading-relaxed bg-[#0d121f]/35">
                                                {faq.a}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    )
}
