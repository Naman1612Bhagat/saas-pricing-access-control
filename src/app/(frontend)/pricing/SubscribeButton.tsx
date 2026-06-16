'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
    planId: string | number
    isLoggedIn: boolean
    currentPlanId?: string | number | null
}

export default function SubscribeButton({ planId, isLoggedIn, currentPlanId }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showGatewaySelection, setShowGatewaySelection] = useState(false)

    const isCurrentPlan = currentPlanId && String(currentPlanId) === String(planId)

    const loadRazorpayScript = () => {
        return new Promise<boolean>((resolve) => {
            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.onload = () => resolve(true)
            script.onerror = () => resolve(false)
            document.body.appendChild(script)
        })
    }

    const handleSubscribe = async (gateway: 'razorpay' | 'cashfree') => {
        if (!isLoggedIn) {
            router.push('/login')
            return
        }

        setError(null)
        setIsLoading(true)

        try {
            if (gateway === 'cashfree') {
                throw new Error('Cashfree payment is not supported yet.')
            }

            const loaded = await loadRazorpayScript()

            if (!loaded) {
                setError('Failed to load Razorpay. Please try again.')
                return
            }

            const orderRes = await fetch('/api/payments/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ planId, gateway }),
            })

            const orderData = await orderRes.json()

            if (!orderRes.ok) {
                setError(orderData.error || 'Failed to create payment order.')
                return
            }

            const options: RazorpayOptions = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Access Shield',
                description: `${orderData.planName} Subscription`,
                order_id: orderData.orderId,

                handler: async function (response: RazorpayResponse) {
                    const verifyRes = await fetch('/api/payments/verify', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(response),
                    })

                    const verifyData = await verifyRes.json()

                    if (!verifyRes.ok) {
                        setError(verifyData.error || 'Payment verification failed.')
                        return
                    }

                    router.refresh()
                    router.push('/dashboard')
                },

                modal: {
                    ondismiss: function () {
                        setError('Payment cancelled.')
                        fetch('/api/payments/cancel', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ orderId: orderData.orderId }),
                        }).catch((err) => {
                            console.error('Failed to report payment cancellation:', err)
                        })
                    },
                },

                theme: {
                    color: '#4f46e5',
                },
            }

            const razorpay = new window.Razorpay(options)
            razorpay.open()
        } catch (err) {
            console.error('Payment error in button handler:', err)
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

    if (showGatewaySelection) {
        return (
            <div className="w-full bg-[#111827]/60 border border-slate-700/40 p-4 rounded-xl space-y-3 text-left">
                <p className="text-xs font-semibold text-slate-300 text-center uppercase tracking-wider">Select Payment Method</p>
                
                {error && (
                    <p className="text-red-400 text-xs mt-1 mb-1 text-center">{error}</p>
                )}

                <div className="space-y-2">
                    <button
                        onClick={() => handleSubscribe('razorpay')}
                        disabled={isLoading}
                        className="w-full flex items-center justify-between bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-200 font-semibold py-2.5 px-4 rounded-xl active:scale-[0.98] transition-all cursor-pointer text-sm disabled:opacity-50"
                    >
                        <span>Razorpay</span>
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-bold">Popular</span>
                    </button>
                    
                    <button
                        disabled
                        className="w-full flex items-center justify-between bg-slate-800/20 border border-slate-700/20 text-slate-400 font-semibold py-2.5 px-4 rounded-xl cursor-not-allowed text-sm"
                    >
                        <span>Cashfree</span>
                        <span className="text-[10px] uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">Coming Soon</span>
                    </button>
                </div>
                
                <button
                    onClick={() => {
                        setError(null)
                        setShowGatewaySelection(false)
                    }}
                    disabled={isLoading}
                    className="w-full text-xs text-slate-400 hover:text-slate-200 text-center font-medium mt-1 transition-colors cursor-pointer"
                >
                    Cancel
                </button>
            </div>
        )
    }

    return (
        <div className="w-full">
            {error && (
                <p className="text-red-400 text-xs mt-1 mb-2 text-center">{error}</p>
            )}
            <button
                onClick={async () => {
                    if (!isLoggedIn) {
                        router.push('/login')
                        return
                    }
                    setError(null)
                    setShowGatewaySelection(true)
                }}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all cursor-pointer text-center text-sm disabled:opacity-50"
            >
                {isLoading ? 'Processing...' : isLoggedIn ? 'Subscribe Now' : 'Sign in to Subscribe'}
            </button>
        </div>
    )
}