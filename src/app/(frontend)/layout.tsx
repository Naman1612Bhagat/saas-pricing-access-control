import React from 'react'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import Link from 'next/link'
import { logoutUser } from '@/app/actions'
import { redirect } from 'next/navigation'
import { MobileMenu } from './components/MobileMenu'
import { AccessShieldLogo } from './components/AccessShieldLogo'
import CurrencySelector from './components/CurrencySelector'
import CurrencyToast from './components/CurrencyToast'
import './styles.css'

export const metadata = {
  description: 'A SaaS Pricing-Plan Access Control System using Payload CMS 3.x',
  title: 'SaaS Access Shield',
}


export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  
  let user: any = null
  try {
    const authResult = await payload.auth({ headers })
    user = authResult.user
  } catch (e) {
  }

  async function handleLogout() {
    'use server'
    await logoutUser()
    redirect('/login')
  }

  const navLinks = [
    { href: '/pricing', label: 'Pricing' },
    ...(user
      ? [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/features/export-reports', label: 'Premium Reports' },
        ]
      : []),
  ]

  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0f19] text-[#f3f4f6] min-h-screen flex flex-col font-sans antialiased">
        <header className="sticky top-0 z-50 w-full border-b border-[#1f293d]/50 bg-[#0b0f19]/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center group">
              <AccessShieldLogo showText={true} iconSize={36} textClassName="text-base sm:text-xl group-hover:text-indigo-400 transition-colors" />
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-indigo-400 transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="hidden sm:flex items-center gap-3 min-w-0 max-w-[180px] md:max-w-[240px]">
                    <div className="flex flex-col text-right min-w-0">
                      <span className="text-sm font-bold text-white leading-tight truncate" title={user.name}>{user.name}</span>
                      <span className="text-[11px] text-slate-500 font-medium truncate" title={user.email}>{user.email}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center select-none shrink-0">
                      {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                    </div>
                  </div>
                  <form action={handleLogout} className="shrink-0">
                    <button
                      type="submit"
                      className="bg-[#121824] hover:bg-[#1f293d] text-slate-300 hover:text-white border border-[#1f293d] text-[10px] sm:text-xs font-bold px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all duration-200 cursor-pointer shadow-sm shadow-black/10"
                    >
                      Sign Out
                    </button>
                  </form>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    href="/login"
                    className="text-slate-300 hover:text-white text-sm font-semibold px-3 py-2 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Register
                  </Link>
                </div>
              )}

              <MobileMenu
                navLinks={navLinks}
                isLoggedIn={!!user}
              />
            </div>
          </div>
        </header>

        <main className="flex-grow flex flex-col">{children}</main>

        <footer className="border-t border-[#1f293d]/50 bg-[#070a12] py-10 text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-left">
              <p className="text-sm text-slate-400 font-medium">
                AccessShield is a SaaS platform for managing subscriptions, feature access, billing, invoices, and payment gateways.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 text-left">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Product</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href="/pricing" className="hover:text-indigo-400 transition-colors">Pricing</Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="hover:text-indigo-400 transition-colors">Dashboard</Link>
                  </li>
                  <li>
                    <Link href="/features/export-reports" className="hover:text-indigo-400 transition-colors">Premium Reports</Link>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Features</h4>
                <ul className="space-y-2 text-xs text-slate-500">
                  <li>Subscriptions</li>
                  <li>Billing & Invoices</li>
                  <li>Feature Access</li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Payments</h4>
                <ul className="space-y-2 text-xs text-slate-500">
                  <li>Razorpay</li>
                  <li>Cashfree</li>
                  <li>PayPal</li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Currency Display</h4>
                <div className="mt-3">
                  <CurrencySelector />
                </div>
              </div>
            </div>

            <div className="border-t border-[#1f293d]/30 pt-6 text-left text-xs text-slate-600">
              <p>© 2026 AccessShield. All rights reserved.</p>
            </div>
          </div>
        </footer>

        <CurrencyToast />
      </body>
    </html>
  )
}
