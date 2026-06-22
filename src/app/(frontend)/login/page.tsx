'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginUser } from '@/app/actions'

const initialState = {
    success: false,
    error: '',
}

export default function LoginPage() {
    const router = useRouter()
    const [state, formAction, isPending] = useActionState(loginUser, initialState)

    useEffect(() => {
        if (state.success) {
            router.push('/dashboard')
            router.refresh()
        }
    }, [state.success, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] px-4 py-12 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Left Side: Product Overview Panel */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-br from-[#121824]/90 to-[#161c2a]/80 border border-[#1f293d]/50 p-6 lg:p-10 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.1),transparent_50%)]" />
                    
                    <div className="space-y-4 lg:space-y-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                            🛡️ AccessShield Portal
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
                            Welcome back
                        </h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Access your workspace, manage subscriptions, review billing activity, and control feature access from a single dashboard.
                        </p>
                        
                        <div className="border-t border-[#1f293d]/50 pt-4 lg:pt-6">
                            <ul className="space-y-3 lg:space-y-4">
                                {[
                                    'Manage your subscription plan',
                                    'View billing and invoices',
                                    'Secure multi-gateway payments',
                                    'Access premium features instantly',
                                    'Track account activity'
                                ].map((item, index) => (
                                    <li key={index} className="flex items-center gap-3 text-sm text-slate-300">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">✓</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    
                    <div className="mt-6 lg:mt-0 text-xs text-slate-500 font-medium hidden lg:block">
                        Trusted subscription management platform
                    </div>
                </div>

                {/* Right Side: Form Container */}
                <div className="lg:col-span-7 bg-[#121824]/80 backdrop-blur border border-[#1f293d]/70 p-8 lg:p-10 rounded-3xl shadow-xl flex flex-col justify-center">
                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-8">
                            <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome Back</h1>
                            <p className="text-slate-400 mt-2">Sign in to manage your subscription and features</p>
                        </div>

                        <form action={formAction} className="space-y-6">
                            {state.error && (
                                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                                    {state.error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="w-full bg-[#0d121f] border border-[#1f293d] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-600 text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    className="w-full bg-[#0d121f] border border-[#1f293d] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-600 text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 cursor-pointer text-center text-sm shadow-lg shadow-indigo-600/10"
                            >
                                {isPending ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-sm text-slate-400 border-t border-[#1f293d]/30 pt-6">
                            Don't have an account?{' '}
                            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-all">
                                Register here
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
