'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(11,17,32,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
      }}
    >
      <div className="max-w-5xl mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#2563eb' }}
          >
            <span
              className="text-white font-bold text-xs tracking-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              IS
            </span>
          </div>
          <span
            className="font-bold text-white text-sm tracking-tight"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            ISBA
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium transition-colors rounded-lg"
            style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-syne)' }}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ background: '#2563eb', fontFamily: 'var(--font-syne)' }}
          >
            Registrarse
          </Link>
        </nav>
      </div>
    </motion.header>
  )
}
