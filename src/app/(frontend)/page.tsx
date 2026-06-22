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
    <div className="bg-[#0b0f19] text-[#f3f4f6] min-h-screen relative overflow-hidden flex flex-col justify-center">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_60%)] blur-3xl -z-10 pointer-events-none" />

      {/* 1. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
          🚀 Subscription Access Shield
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto">
          Manage Subscriptions, Payments, and Feature Access
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          AccessShield helps SaaS teams manage plans, billing, invoices, and feature access through secure multi-gateway payments.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/pricing"
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-center text-xs"
          >
            View Pricing Plans
          </Link>

          {user ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto bg-[#1f293d] hover:bg-[#2d3a54] text-white border border-[#2d3a54] font-bold px-6 py-3.5 rounded-xl transition-all text-center text-xs"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/register"
              className="w-full sm:w-auto bg-[#1f293d] hover:bg-[#2d3a54] text-white border border-[#2d3a54] font-bold px-6 py-3.5 rounded-xl transition-all text-center text-xs"
            >
              Get Started Free
            </Link>
          )}
        </div>

        {/* Compact Trust Badges Row */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-6 text-[10px] text-slate-400 font-semibold">
          <div className="flex items-center space-x-1 px-2.5 py-1 bg-[#121824] border border-[#1f293d]/50 rounded-md">
            <span className="w-1 h-1 rounded-full bg-purple-500"></span>
            <span>Razorpay</span>
          </div>
          <div className="flex items-center space-x-1 px-2.5 py-1 bg-[#121824] border border-[#1f293d]/50 rounded-md">
            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
            <span>Cashfree</span>
          </div>
          <div className="flex items-center space-x-1 px-2.5 py-1 bg-[#121824] border border-[#1f293d]/50 rounded-md">
            <span className="w-1 h-1 rounded-full bg-blue-500"></span>
            <span>PayPal</span>
          </div>
          <div className="flex items-center space-x-1 px-2.5 py-1 bg-[#121824] border border-[#1f293d]/50 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>SSL Secured</span>
          </div>
        </div>
      </section>

      {/* 2. Compact Feature Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1f293d]/30">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Everything needed for subscription access</h2>
          <p className="mt-2 text-slate-400 text-xs sm:text-sm">Plans, payments, invoices, and feature gates connected in one workflow.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            {
              title: 'Plans & Subscriptions',
              desc: 'Create pricing tiers and manage active user subscriptions.',
              icon: '📋'
            },
            {
              title: 'Secure Payments',
              desc: 'Accept payments through Razorpay, Cashfree, and PayPal.',
              icon: '💳'
            },
            {
              title: 'Feature Access',
              desc: 'Unlock or restrict product features based on the active plan.',
              icon: '🛡️'
            },
            {
              title: 'Billing & Invoices',
              desc: 'Let users review payments and download invoices anytime.',
              icon: '🧾'
            }
          ].map((item, index) => (
            <div
              key={index}
              className="bg-[#121824]/50 border border-[#1f293d]/50 p-6 rounded-2xl md:hover:border-indigo-500/40 md:hover:bg-[#121824]/85 transition-all duration-300 shadow-sm space-y-3"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-base">
                {item.icon}
              </div>
              <h3 className="text-sm font-bold text-white">{item.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
