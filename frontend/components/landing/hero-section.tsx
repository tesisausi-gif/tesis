'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { User, Wrench, ArrowRight } from 'lucide-react'
import { InstallPWAButton } from '@/components/pwa/InstallPWAButton'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden flex items-center"
      style={{ background: '#0B1120', minHeight: '100svh' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Glow top-right */}
      <div
        className="absolute -top-40 -right-20 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 65%)' }}
      />

      {/* Glow bottom-left */}
      <div
        className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 65%)' }}
      />

      {/* Watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ transform: 'rotate(-8deg)' }}
      >
        <span
          className="font-bold"
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: 'min(32vw, 300px)',
            color: 'rgba(255,255,255,0.02)',
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}
        >
          ISBA
        </span>
      </div>

      {/* Content */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-5xl mx-auto px-6 py-28 text-center"
      >
        {/* Status badge */}
        <motion.div variants={fadeUp} className="flex justify-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs"
            style={{
              border: '1px solid rgba(59,130,246,0.3)',
              color: '#93c5fd',
              background: 'rgba(37,99,235,0.1)',
              fontFamily: 'var(--font-outfit)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"
              style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
            />
            Inmobiliaria ISBA — Sistema Activo
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-[1.05]"
          style={{ fontFamily: 'var(--font-syne)', letterSpacing: '-0.02em' }}
        >
          Gestión de<br />
          <span style={{ color: '#60a5fa' }}>Incidentes</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="text-slate-400 text-lg md:text-xl mb-10 max-w-md mx-auto leading-relaxed"
          style={{ fontFamily: 'var(--font-outfit)' }}
        >
          Plataforma centralizada para el seguimiento y resolución de incidentes de tu propiedad.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8"
        >
          <Link
            href="/register?tipo=cliente"
            className="flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3.5 rounded-xl font-semibold text-white text-sm transition-all"
            style={{ background: '#2563eb', fontFamily: 'var(--font-syne)' }}
          >
            <User className="h-4 w-4" />
            Soy Cliente
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register?tipo=tecnico"
            className="flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: 'var(--font-syne)',
            }}
          >
            <Wrench className="h-4 w-4" />
            Soy Técnico
          </Link>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="text-sm"
          style={{ color: '#64748b', fontFamily: 'var(--font-outfit)' }}
        >
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            Inicia sesión
          </Link>
        </motion.p>

        {/* PWA install button — only shows when Chrome offers install */}
        <motion.div variants={fadeUp} className="flex justify-center mt-4">
          <InstallPWAButton />
        </motion.div>
      </motion.div>
    </section>
  )
}
