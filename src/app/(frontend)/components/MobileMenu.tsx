'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

interface NavLink {
  href: string
  label: string
}

interface MobileMenuProps {
  navLinks: NavLink[]
  isLoggedIn: boolean
}

export function MobileMenu({ navLinks, isLoggedIn }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()

  // Close menu whenever the route changes (link was tapped)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Hamburger / Close button — visible only on mobile */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
        onClick={() => setIsOpen((prev) => !prev)}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:text-white hover:bg-[#1f293d] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      {/* Backdrop */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="md:hidden fixed inset-0 top-16 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
      {/* Drawer */}
      <div
        id="mobile-nav-drawer"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`
          md:hidden fixed left-0 right-0 top-16 z-50
          bg-[#0d1324] border-b border-[#1f293d]/70
          shadow-2xl shadow-black/50
          transition-all duration-300 ease-in-out
          ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}
        `}
      >
        <nav aria-label="Mobile navigation" className="flex flex-col px-4 py-4 gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${pathname === link.href
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-[#1f293d] active:bg-[#2d3a54]'
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              `}
            >
              {link.label}
            </Link>
          ))}
          {/* Auth links for unauthenticated mobile users */}
          {!isLoggedIn && (
            <div className="mt-3 pt-3 border-t border-[#1f293d]/60 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center px-4 py-3 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-[#1f293d] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center px-4 py-3 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </>
  )
}
