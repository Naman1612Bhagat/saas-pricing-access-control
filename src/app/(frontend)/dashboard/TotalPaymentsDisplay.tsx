'use client'

import { useBillingRegion } from '@/hooks/useBillingRegion'
import { formatCurrency } from '@/utilities/currencyHelpers'
import { CreditCard } from 'lucide-react'

interface TotalPaymentsDisplayProps {
    inrTotal: number
    usdTotal: number
}

export default function TotalPaymentsDisplay({ inrTotal, usdTotal }: TotalPaymentsDisplayProps) {
    const { currency } = useBillingRegion()

    const displayTotal = currency === 'USD' ? usdTotal : inrTotal
    const formatted = formatCurrency(displayTotal, currency)

    return (
        <div className="bg-[#121824]/50 border border-[#1f293d]/50 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:border-[#1f293d] hover:bg-[#121824]/80 transition-all duration-200">
            <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Payments</span>
                <div className="text-base font-extrabold text-white">
                    {formatted}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                    Lifetime billed sum
                </div>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <CreditCard size={18} />
            </div>
        </div>
    )
}
