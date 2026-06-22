'use client'

import { useBillingRegion } from '@/hooks/useBillingRegion'

export default function CurrencySelector() {
    const { currency, setCurrency } = useBillingRegion()

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none ${
                    currency === 'INR'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/15'
                        : 'bg-[#121824] border-[#1f293d] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
            >
                🇮🇳 INR
            </button>
            <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none ${
                    currency === 'USD'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/15'
                        : 'bg-[#121824] border-[#1f293d] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
            >
                🌎 USD
            </button>
        </div>
    )
}
