'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { subscribeToPlan } from '@/app/actions'

type Props = {
    planId: string | number
    isLoggedIn: boolean
    currentPlanId?: string | number | null
}

export default function SubscribeButton({ planId, isLoggedIn, currentPlanId }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isCurrentPlan = currentPlanId && String(currentPlanId) === String(planId)

    const handleSubscribe = async () => {
        if (!isLoggedIn) {
            router.push('/login')
            return
        }

        setError(null)
        setIsLoading(true)

        try {
            const res = await subscribeToPlan(planId)
            if (res.success) {
                router.refresh()
                router.push('/dashboard')
            } else {
                setError(res.error || 'Failed to subscribe. Please try again.')
            }
        } catch (err: any) {
            console.error('Subscription error in button handler:', err)
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    if (isCurrentPlan) {
        return (
            <button
                disabled
                className="w-full bg-[#1f293d] border border-[#2d3a54] text-slate-400 font-semibold py-3 px-4 rounded-xl cursor-default text-center text-sm"
            >
                Current Active Plan
            </button>
        )
    }

    return (
        <div className="w-full">
            {error && (
                <p className="text-red-400 text-xs mt-1 mb-2 text-center">{error}</p>
            )}
            <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all cursor-pointer text-center text-sm disabled:opacity-50"
            >
                {isLoading ? 'Processing...' : isLoggedIn ? 'Subscribe Now' : 'Sign in to Subscribe'}
            </button>
        </div>
    )
}
