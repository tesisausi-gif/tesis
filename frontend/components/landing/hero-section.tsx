'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, User, Wrench } from 'lucide-react'
import { BlurText } from '@/components/ui/blur-text'
import { InstallPWAButton } from '@/components/pwa/InstallPWAButton'

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden flex flex-col items-center justify-center"
      style={{ background: '#060d1a', minHeight: '100svh' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      />

      {/* Ambient glows */}
      <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)' }} />
      <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(14,25,41,0.8) 0%, transparent 70%)' }} />

      {/* Decorative vertical lines */}
      <div className="absolute inset-y-0 left-[10%] w-px pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, transparent 100%)' }} />
      <div className="absolute inset-y-0 right-[10%] w-px pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, transparent 100%)' }} />

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="font-black" style={{
          fontFamily: 'var(--font-syne)',
          fontSize: 'min(40vw, 400px)',
          color: 'rgba(255,255,255,0.018)',
          letterSpacing: '-0.06em',
          lineHeight: 1,
        }}>
          Traki
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-7"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
            style={{
              border: '1px solid rgba(59,130,246,0.25)',
              color: '#93c5fd',
              background: 'rgba(14,25,41,0.8)',
              fontFamily: 'var(--font-outfit)',
              letterSpacing: '0.04em',
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" />
            Traki — Sistema activo
          </div>
        </motion.div>

        {/* Headline — blur-text from 21st.dev */}
        <h1 className="text-5xl sm:text-6xl md:text-[4.5rem] font-black text-white leading-[1.08] tracking-[-0.03em] mb-6"
          style={{ fontFamily: 'var(--font-syne)' }}>
          <span className="block"><BlurText text="Gestioná tus" delay={55} direction="bottom" /></span>
          <span className="block" style={{ color: '#60a5fa' }}><BlurText text="incidentes" delay={55} direction="bottom" /></span>
          <span className="block"><BlurText text="sin fricciones." delay={55} direction="bottom" /></span>
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="text-slate-400 text-lg md:text-xl mb-10 max-w-lg leading-relaxed"
          style={{ fontFamily: 'var(--font-outfit)' }}
        >
          Plataforma centralizada para propietarios, técnicos y administradores.
          Reportes, seguimiento y resolución — todo en un lugar.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.05 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-6 w-full sm:w-auto"
        >
          <Link
            href="/register?tipo=cliente"
            className="flex items-center gap-2 w-full sm:w-auto justify-center px-7 py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', fontFamily: 'var(--font-syne)' }}
          >
            <User className="h-4 w-4" />
            Soy Cliente
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register?tipo=tecnico"
            className="flex items-center gap-2 w-full sm:w-auto justify-center px-7 py-3.5 rounded-2xl font-bold text-sm transition-all hover:bg-white/10 active:scale-95"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.75)',
              fontFamily: 'var(--font-syne)',
            }}
          >
            <Wrench className="h-4 w-4" />
            Soy Técnico
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          className="text-sm"
          style={{ color: '#475569', fontFamily: 'var(--font-outfit)' }}
        >
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            Iniciá sesión
          </Link>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.5 }}
          className="mt-4"
        >
          <InstallPWAButton />
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #060d1a)' }} />
    </section>
  )
}
