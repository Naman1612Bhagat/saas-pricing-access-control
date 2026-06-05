import React from 'react'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import Link from 'next/link'
import { logoutUser } from '@/app/actions'
import { redirect } from 'next/navigation'
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
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
                S
              </div>
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                AccessShield
              </span>
            </Link>

            {/* Navigation links */}
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

            {/* Auth Actions */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-sm font-semibold text-white">{user.name}</span>
                    <span className="text-xs text-slate-500">{user.email}</span>
                  </div>
                  <form action={handleLogout}>
                    <button
                      type="submit"
                      className="bg-[#1f293d] hover:bg-[#2d3a54] text-white border border-[#2d3a54] text-sm font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center gap-3">
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
