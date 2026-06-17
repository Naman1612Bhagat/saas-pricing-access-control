import React from 'react'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import Link from 'next/link'
import { logoutUser } from '@/app/actions'
import { redirect } from 'next/navigation'
import { MobileMenu } from './components/MobileMenu'
import { AccessShieldLogo } from './components/AccessShieldLogo'
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
    // Suppress auth error if no token is found
  }

  async function handleLogout() {
    'use server'
    await logoutUser()
    redirect('/login')
  }

  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0f19] text-[#f3f4f6] min-h-screen flex flex-col font-sans antialiased">
        <header className="sticky top-0 z-50 w-full border-b border-[#1f293d]/50 bg-[#0b0f19]/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <AccessShieldLogo showText={true} iconSize={36} textClassName="text-lg sm:text-xl group-hover:text-indigo-400 transition-colors" />
            </Link>

            {/* Desktop navigation links — hidden on mobile */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
              <Link href="/pricing" className="hover:text-indigo-400 transition-colors">
                Pricing
              </Link>
              {user && (
                <>
                  <Link href="/dashboard" className="hover:text-indigo-400 transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/features/export-reports" className="hover:text-indigo-400 transition-colors">
                    Premium Reports
                  </Link>
                </>
              )}
            </nav>

            {/* Right-side controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-bold text-white leading-tight">{user.name}</span>
                      <span className="text-[11px] text-slate-500 font-medium">{user.email}</span>
                    </div>
                    {/* Circle Initials Avatar */}
                    <div className="w-8 h-8 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center select-none">
                      {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                    </div>
                  </div>
                  <form action={handleLogout}>
                    <button
                      type="submit"
                      className="bg-[#121824] hover:bg-[#1f293d] text-slate-300 hover:text-white border border-[#1f293d] text-xs font-bold px-3.5 py-2 rounded-lg transition-all duration-200 cursor-pointer shadow-sm shadow-black/10"
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

              {/* Mobile hamburger — rendered client-side, hidden on md+ */}
              <MobileMenu
                navLinks={[
                  { href: '/pricing', label: 'Pricing Plans' },
                  ...(user
                    ? [
                        { href: '/dashboard', label: 'Dashboard' },
                        { href: '/dashboard/billing', label: 'Billing History' },
                        { href: '/features/export-reports', label: 'Premium Reports' },
                      ]
                    : []),
                ]}
                isLoggedIn={!!user}
              />
            </div>
          </div>
        </header>

        <main className="flex-grow flex flex-col">{children}</main>

        <footer className="border-t border-[#1f293d]/50 bg-[#070a12] py-8 text-center text-sm text-slate-600">
          <p>© {new Date().getFullYear()} AccessShield SaaS. All rights reserved.</p>
        </footer>
      </body>
    </html>
  )
}
