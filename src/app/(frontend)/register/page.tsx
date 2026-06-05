'use client'

import React, { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerUser } from '@/app/actions'

const initialState = {
    success: false,
    error: '',
}

export default function RegisterPage() {
    const router = useRouter()
    const [state, formAction, isPending] = useActionState(registerUser, initialState)

    useEffect(() => {
        if (state.success) {
            router.push('/dashboard')
            router.refresh()
        }
    }, [state.success, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] px-4">
            <div className="w-full max-w-md bg-[#161c2a]/80 backdrop-blur-md border border-[#232d42] p-8 rounded-2xl shadow-xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h1>
                    <p className="text-slate-400 mt-2">Get started with our SaaS platform</p>
                </div>

                <form action={formAction} className="space-y-5">
                    {state.error && (
                        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                            {state.error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            required
                            className="w-full bg-[#0d121f] border border-[#232d42] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-600"
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            required
                            className="w-full bg-[#0d121f] border border-[#232d42] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-600"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            className="w-full bg-[#0d121f] border border-[#232d42] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-600"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 cursor-pointer text-center"
                    >
                        {isPending ? 'Registering...' : 'Register'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-slate-400">
                    Already have an account?{' '}
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-all">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    )
}
