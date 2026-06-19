import React from 'react'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import Link from 'next/link'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  
  let user: any = null
  try {
    const authResult = await payload.auth({ headers })
    user = authResult.user
  } catch (e) {
  }

  return (
    <div className="bg-[#0b0f19] flex-grow flex flex-col justify-center items-center px-4 py-20 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-3xl -z-10" />

      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
          🚀 Pricing-Based Feature Access
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-none">
          SaaS Pricing-Plan Based{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
            Access Control
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Pricing plans, feature-based access control, usage limits, and subscription management in one platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/pricing"
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-center"
          >
            View Pricing Plans
          </Link>

          {user ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto bg-[#1f293d] hover:bg-[#2d3a54] text-white border border-[#2d3a54] font-bold px-8 py-4 rounded-xl transition-all text-center"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/register"
              className="w-full sm:w-auto bg-[#1f293d] hover:bg-[#2d3a54] text-white border border-[#2d3a54] font-bold px-8 py-4 rounded-xl transition-all text-center"
            >
              Get Started Free
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="bg-[#121824]/50 border border-[#1f293d]/50 p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 font-bold text-lg">
              🛡️
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Gate Access Control</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Secure endpoints and client pages dynamically based on active subscription rules and dates.
            </p>
          </div>

          <div className="bg-[#121824]/50 border border-[#1f293d]/50 p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 mb-4 font-bold text-lg">
              📊
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Granular Feature Limits</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Define whether features are completely disabled, limited to a usage count, or unlimited.
            </p>
          </div>

          <div className="bg-[#121824]/50 border border-[#1f293d]/50 p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 mb-4 font-bold text-lg">
              ⏱️
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dynamic Expiry Checking</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Validate validity durations dynamically during queries without writing to the database on reads.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
