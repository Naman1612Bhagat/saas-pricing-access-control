'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
    planId: string | number
    isLoggedIn: boolean
    currentPlanId?: string | number | null
    ctaText?: string
    currency: 'INR' | 'USD'
    conversionRate: number | null
}

interface EnabledGateway {
    gateway: 'razorpay' | 'cashfree' | 'paypal'
    displayName: string
    description?: string | null
}

export default function SubscribeButton({ planId, isLoggedIn, currentPlanId, ctaText, currency, conversionRate }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [enabledGateways, setEnabledGateways] = useState<EnabledGateway[]>([])
    const [isLoadingGateways, setIsLoadingGateways] = useState(true)

    useEffect(() => {
        let isMounted = true
        fetch('/api/payments/gateways')
            .then((res) => res.json())
            .then((data) => {
                if (isMounted) {
                    setEnabledGateways(data)
                    setIsLoadingGateways(false)
                }
            })
            .catch((err) => {
                console.error('Failed to fetch active payment gateways:', err)
                if (isMounted) {
                    setIsLoadingGateways(false)
                }
            })
        return () => {
            isMounted = false
        }
    }, [])
    const [error, setError] = useState<string | null>(null)
    const [showGatewaySelection, setShowGatewaySelection] = useState(false)
    const [payPalOrderId, setPayPalOrderId] = useState<string | null>(null)
    const [showPayPalButtons, setShowPayPalButtons] = useState(false)

    useEffect(() => {
        if (showPayPalButtons && payPalOrderId && (window as any).paypal) {
            const container = document.getElementById('paypal-button-container')
            if (container) {
                container.innerHTML = ''
                ;(window as any).paypal.Buttons({
                    createOrder: function(_data: any, _actions: any) {
                        return payPalOrderId
                    },
                    onApprove: async function(_data: any, _actions: any) {
                        setIsLoading(true)
                        try {
                            const res = await fetch('/api/payments/paypal/capture', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ orderId: payPalOrderId }),
                            })
                            const verifyData = await res.json()
                            if (!res.ok) {
                                setError(verifyData.error || 'PayPal payment capture failed.')
                                return
                            }
                            router.refresh()
                            router.push('/dashboard')
                        } catch (err) {
                            console.error('PayPal capture err:', err)
                            setError('PayPal payment capture failed.')
                        } finally {
                            setIsLoading(false)
                        }
                    },
                    onError: function(err: any) {
                        console.error('PayPal Buttons onError:', err)
                        setError('PayPal checkout encountered an error.')
                        setShowPayPalButtons(false)
                        setPayPalOrderId(null)
                    },
                    onCancel: function(_data: any) {
                        setError('Payment cancelled.')
                        setShowPayPalButtons(false)
                        setPayPalOrderId(null)
                        fetch('/api/payments/cancel', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ orderId: payPalOrderId }),
                        }).catch((err) => {
                            console.error('Failed to report payment cancellation:', err)
                        })
                    }
                }).render('#paypal-button-container')
            }
        }
    }, [showPayPalButtons, payPalOrderId, router])

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

    const loadCashfreeScript = () => {
        return new Promise<boolean>((resolve) => {
            const script = document.createElement('script')
            script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
            script.onload = () => resolve(true)
            script.onerror = () => resolve(false)
            document.body.appendChild(script)
        })
    }

    const handleSubscribe = async (gateway: 'razorpay' | 'cashfree' | 'paypal') => {
        if (!isLoggedIn) {
            router.push('/login')
            return
        }

        setError(null)
        setIsLoading(true)

        try {
            if (gateway === 'paypal') {
                const orderRes = await fetch('/api/payments/create-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ planId, gateway, currency }),
                })

                const orderData = await orderRes.json()

                if (!orderRes.ok) {
                    setError(orderData.error || 'Failed to create payment order.')
                    setIsLoading(false)
                    return
                }

                const loaded = await new Promise<boolean>((resolve) => {
                    if ((window as any).paypal) {
                        resolve(true)
                        return
                    }
                    const script = document.createElement('script')
                    script.src = `https://www.paypal.com/sdk/js?client-id=${orderData.paypalClientId}&currency=USD`
                    script.onload = () => resolve(true)
                    script.onerror = () => resolve(false)
                    document.body.appendChild(script)
                })

                if (!loaded) {
                    setError('Failed to load PayPal SDK. Please try again.')
                    setIsLoading(false)
                    return
                }

                setPayPalOrderId(orderData.orderId)
                setShowPayPalButtons(true)
                setIsLoading(false)
                return
            }

            if (gateway === 'cashfree') {
                const loaded = await loadCashfreeScript()

                if (!loaded) {
                    setError('Failed to load Cashfree. Please try again.')
                    setIsLoading(false)
                    return
                }

                const orderRes = await fetch('/api/payments/create-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ planId, gateway, currency }),
                })

                const orderData = await orderRes.json()

                if (!orderRes.ok) {
                    setError(orderData.error || 'Failed to create payment order.')
                    return
                }

                try {
                    const cashfree = new (window as any).Cashfree({
                        mode: orderData.mode === 'production' ? 'production' : 'sandbox',
                    })

                    await cashfree.checkout({
                        paymentSessionId: orderData.paymentSessionId,
                        redirectTarget: '_modal',
                    })
                } catch (checkoutErr) {
                    console.error('Cashfree checkout modal error:', checkoutErr)
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
                    return
                }

                const verifyRes = await fetch('/api/payments/cashfree/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ orderId: orderData.orderId }),
                })

                const verifyData = await verifyRes.json()

                if (!verifyRes.ok) {
                    setError(verifyData.error || 'Payment verification failed.')
                    return
                }

                router.refresh()
                router.push('/dashboard')
                return
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
                body: JSON.stringify({ planId, gateway, currency }),
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

    const activeGateways = enabledGateways.filter((g) => {
        if (currency === 'INR') {
            return g.gateway === 'razorpay' || g.gateway === 'cashfree'
        } else {
            return g.gateway === 'paypal' && conversionRate !== null && conversionRate > 0
        }
    })

    if (!isLoadingGateways && activeGateways.length === 0) {
        return (
            <div className="w-full">
                <p className="text-center text-xs text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl leading-relaxed">
                    No payment gateways are available for the selected currency.
                </p>
            </div>
        )
    }

    if (showPayPalButtons) {
        return (
            <div className="w-full bg-[#111827]/60 border border-slate-700/40 p-4 rounded-xl space-y-4 text-left">
                <p className="text-xs font-semibold text-slate-300 text-center uppercase tracking-wider">Pay with PayPal</p>
                {error && (
                    <p className="text-red-400 text-xs text-center">{error}</p>
                )}
                {isLoading && (
                    <p className="text-slate-400 text-xs text-center">Processing capture...</p>
                )}
                <div id="paypal-button-container" className="w-full min-h-[150px]"></div>
                <button
                    onClick={() => {
                        setShowPayPalButtons(false)
                        setPayPalOrderId(null)
                        setError(null)
                    }}
                    disabled={isLoading}
                    className="w-full text-xs text-slate-400 hover:text-slate-200 text-center font-medium mt-2 transition-colors cursor-pointer"
                >
                    Back to payment methods
                </button>
            </div>
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
                    {activeGateways.map((g) => {
                        const isRazorpay = g.gateway === 'razorpay'
                        const isPayPal = g.gateway === 'paypal'
                        const themeClasses = isRazorpay
                            ? "bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-200"
                            : isPayPal
                            ? "bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-200"
                            : "bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-200"
                        const badgeClasses = isRazorpay
                            ? "text-indigo-400 bg-indigo-500/10"
                            : isPayPal
                            ? "text-blue-400 bg-blue-500/10"
                            : "text-emerald-400 bg-emerald-500/10"
                        const badgeText = isRazorpay ? "Popular" : isPayPal ? "International" : "Available"

                        return (
                            <button
                                key={g.gateway}
                                onClick={() => handleSubscribe(g.gateway)}
                                disabled={isLoading}
                                className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-semibold py-2.5 px-4 rounded-xl active:scale-[0.98] transition-all cursor-pointer text-sm disabled:opacity-50 ${themeClasses}`}
                            >
                                <div className="flex flex-col text-left min-w-0">
                                    <span>{g.displayName}</span>
                                    {g.description && (
                                        <span className="text-[9px] font-normal text-slate-400 mt-0.5 max-w-full leading-snug break-words">
                                            {g.description}
                                        </span>
                                    )}
                                </div>
                                <span className={`self-start sm:self-auto text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeClasses} shrink-0`}>
                                    {badgeText}
                                </span>
                            </button>
                        )
                    })}
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
                    if (isLoadingGateways) return
                    if (!isLoggedIn) {
                        router.push('/login')
                        return
                    }
                    setError(null)
                    if (activeGateways.length === 1) {
                        handleSubscribe(activeGateways[0].gateway)
                    } else {
                        setShowGatewaySelection(true)
                    }
                }}
                disabled={isLoading || isLoadingGateways}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all cursor-pointer text-center text-sm disabled:opacity-50"
            >
                {isLoading ? 'Processing...' : isLoadingGateways ? 'Loading...' : (ctaText || (isLoggedIn ? 'Subscribe Now' : 'Sign in to Subscribe'))}
            </button>
        </div>
    )
}