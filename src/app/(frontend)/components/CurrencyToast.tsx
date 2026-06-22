'use client'

import { useState, useEffect, useRef } from 'react'
import { useBillingRegion, Currency } from '@/hooks/useBillingRegion'
import { CheckCircle2, X } from 'lucide-react'

export default function CurrencyToast() {
    const { currency } = useBillingRegion()
    const [toast, setToast] = useState<{ show: boolean; msg: string | null }>({ show: false, msg: null })
    const prevCurrencyRef = useRef<Currency | null>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        // Detect if currency value actually changes after the initial mount
        if (prevCurrencyRef.current !== null && prevCurrencyRef.current !== currency) {
            const msg = currency === 'INR' 
                ? 'Currency changed to INR. Available payment methods updated.'
                : 'Currency changed to USD. Available payment methods updated.'
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }

            setToast({ show: true, msg })

            timeoutRef.current = setTimeout(() => {
                setToast({ show: false, msg: null })
            }, 4000)
        }
        
        // Store current currency value
        prevCurrencyRef.current = currency
    }, [currency])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    if (!toast.show || !toast.msg) return null

    return (
        <div className="fixed bottom-5 right-5 z-[9999] animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-3 bg-[#121824] border border-emerald-500/40 text-slate-100 p-4 rounded-xl shadow-2xl shadow-emerald-500/5 min-w-[300px] sm:min-w-[320px] max-w-[400px]">
                <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                    <CheckCircle2 size={18} />
                </div>
                <div className="flex-grow space-y-0.5">
                    <p className="text-xs font-bold text-white">Preference Updated</p>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{toast.msg}</p>
                </div>
                <button
                    onClick={() => setToast({ show: false, msg: null })}
                    className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer shrink-0"
                >
                    <X size={15} />
                </button>
            </div>
        </div>
    )
}
