import React from 'react'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Payment } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function BillingHistoryPage() {
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

    // 2. Fetch user's payments (depth=1 to retrieve plan details, sorted by newest first)
    const paymentsResult = await payload.find({
        collection: 'payments',
        where: {
            user: {
                equals: user.id,
            },
        },
        depth: 1,
        sort: '-createdAt',
    })

    const payments = paymentsResult.docs as any[]

    // Helper to format currency values
    const formatPrice = (amount: number, currency: string) => {
        try {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: currency || 'INR',
                minimumFractionDigits: 0,
            }).format(amount)
        } catch {
            return `${currency} ${amount}`
        }
    }

    // Helper to format date strings explicitly in Asia/Kolkata timezone
    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr)
            const formatter = new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            })
            const parts = formatter.formatToParts(d)
            const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]))
            
            const day = partMap.day
            const month = partMap.month
            const year = partMap.year
            const hour = partMap.hour
            const minute = partMap.minute
            const dayPeriod = (partMap.dayPeriod || '').toUpperCase()
            
            return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`
        } catch (err) {
            console.error('Error formatting date:', err)
            return dateStr
        }
    }

    // Helper to render status badges with precise colors
    const renderStatusBadge = (status: Payment['status']) => {
        switch (status) {
            case 'paid':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Paid
                    </span>
                )
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        Failed
                    </span>
                )
            case 'created':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Created
                    </span>
                )
        }
    }

    return (
        <div className="bg-[#0b0f19] py-12 px-4 sm:px-6 lg:px-8 flex-grow">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header navigation & title */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1f293d]/50 pb-6">
                    <div>
                        <Link
                            href="/dashboard"
                            className="text-indigo-400 hover:text-indigo-300 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 mb-2 transition-colors"
                        >
                            <span>&larr;</span> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">Billing History</h1>
                        <p className="text-slate-400 text-sm mt-1">Review all your subscription payments and orders.</p>
                    </div>
                </div>

                {payments.length === 0 ? (
                    /* Empty State: No Payment History */
                    <div className="bg-[#121824]/50 border border-[#1f293d]/50 p-12 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12">
                        <div className="w-16 h-16 bg-slate-800/40 rounded-full flex items-center justify-center text-2xl mx-auto">
                            🧾
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-white">No payment history found</h2>
                            <p className="text-sm text-slate-400">
                                You haven't made any plan transactions yet. If you recently attempted a checkout, it will appear here.
                            </p>
                        </div>
                        <Link
                            href="/pricing"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer inline-block text-sm"
                        >
                            Subscribe to a Plan
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Desktop & Tablet Table (Visible on sm screens and up) */}
                        <div className="hidden sm:block overflow-hidden bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 rounded-3xl">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[#1f293d]/50 text-left">
                                    <thead>
                                        <tr className="bg-[#0e1320]/80">
                                            <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Name</th>
                                            <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                                            <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Gateway</th>
                                            <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Order / Payment ID</th>
                                            <th scope="col" className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1f293d]/40">
                                        {payments.map((payment) => {
                                            const planName = payment.plan && typeof payment.plan === 'object' 
                                                ? payment.plan.name 
                                                : 'Unknown Plan'
                                            return (
                                                <tr key={payment.id} className="hover:bg-[#182030]/30 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                                                        {planName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-300">
                                                        {formatPrice(payment.amount, payment.currency)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">
                                                        {payment.gateway === 'razorpay' ? 'Razorpay' : payment.gateway}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {renderStatusBadge(payment.status)}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-mono text-slate-500 space-y-1">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Order:</span>
                                                            <span className="text-slate-400">{payment.razorpayOrderId}</span>
                                                        </div>
                                                        {payment.razorpayPaymentId && (
                                                            <div className="flex flex-col pt-0.5">
                                                                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Payment:</span>
                                                                <span className="text-indigo-400">{payment.razorpayPaymentId}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                                                        {formatDate(payment.createdAt)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile Cards View (Visible on extra-small screens below sm) */}
                        <div className="block sm:hidden space-y-4">
                            {payments.map((payment) => {
                                const planName = payment.plan && typeof payment.plan === 'object' 
                                    ? payment.plan.name 
                                    : 'Unknown Plan'
                                return (
                                    <div 
                                        key={payment.id} 
                                        className="bg-[#121824]/80 backdrop-blur border border-[#1f293d]/50 p-5 rounded-2xl space-y-4 shadow-sm"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-white text-base">{planName}</h3>
                                                <span className="text-xs text-slate-500 font-medium">{formatDate(payment.createdAt)}</span>
                                            </div>
                                            <div>
                                                {renderStatusBadge(payment.status)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1f293d]/30 text-xs">
                                            <div>
                                                <span className="block text-slate-500 font-medium">Amount Paid</span>
                                                <span className="font-semibold text-white text-sm mt-0.5 block">
                                                    {formatPrice(payment.amount, payment.currency)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-500 font-medium">Gateway</span>
                                                <span className="text-slate-300 font-semibold mt-0.5 block">
                                                    {payment.gateway === 'razorpay' ? 'Razorpay' : payment.gateway}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-[#0d121f]/50 p-3 rounded-xl space-y-2 border border-[#1f293d]/20 text-[11px] font-mono">
                                            <div>
                                                <span className="block text-slate-600 font-bold uppercase tracking-wider text-[9px]">Order ID</span>
                                                <span className="text-slate-400 break-all">{payment.razorpayOrderId}</span>
                                            </div>
                                            {payment.razorpayPaymentId && (
                                                <div className="border-t border-[#1f293d]/20 pt-1.5">
                                                    <span className="block text-slate-600 font-bold uppercase tracking-wider text-[9px]">Payment ID</span>
                                                    <span className="text-indigo-400 break-all">{payment.razorpayPaymentId}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
