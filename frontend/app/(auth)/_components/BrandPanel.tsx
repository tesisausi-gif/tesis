'use client'

import { motion } from 'framer-motion'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const features = [
  'Seguimiento en tiempo real',
  'Asignación de técnicos',
  'Reportes y conformidades',
]

export function BrandPanel() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="hidden lg:flex lg:w-[45%] flex-shrink-0 flex-col justify-between p-12 relative overflow-hidden"
      style={{ background: '#0B1120' }}
    >
      {/* ── Decorative layers ── */}

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top-right circle rings */}
      <div className="absolute -top-32 -right-32 w-[560px] h-[560px] rounded-full border pointer-events-none" style={{ borderColor: 'rgba(59,130,246,0.10)' }} />
      <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full border pointer-events-none" style={{ borderColor: 'rgba(59,130,246,0.07)' }} />

      {/* Blue glow top-right */}
      <div
        className="absolute -top-28 -right-28 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 65%)' }}
      />

      {/* Blue glow bottom-left */}
      <div
        className="absolute -bottom-36 -left-20 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.13) 0%, transparent 65%)' }}
      />

      {/* Watermark ISBA */}
      <div
        className="absolute bottom-8 -right-6 pointer-events-none select-none leading-none"
        style={{
          fontFamily: 'var(--font-syne)',
          fontSize: '200px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.025)',
          letterSpacing: '-12px',
          transform: 'rotate(-6deg)',
        }}
      >
        ISBA
      </div>

      {/* Left accent line — animates height */}
      <motion.div
        className="absolute left-0 w-0.5"
        style={{ background: 'linear-gradient(to bottom, transparent, #3b82f6, transparent)', top: '20%', bottom: '20%' }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 0.7 }}
        transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' as const }}
      />

      {/* ── Content ── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="relative z-10">
        {/* Logo badge */}
        <motion.div variants={fadeUp} className="flex items-center gap-3 mb-16">
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#2563eb' }}
            whileHover={{ scale: 1.05 }}
            animate={{ boxShadow: ['0 0 0px rgba(37,99,235,0)', '0 0 18px rgba(37,99,235,0.55)', '0 0 0px rgba(37,99,235,0)'] }}
            transition={{ boxShadow: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const } }}
          >
            <span className="text-white font-bold text-sm tracking-tight" style={{ fontFamily: 'var(--font-syne)' }}>IS</span>
          </motion.div>
          <span className="text-white/35 text-xs tracking-[0.28em] uppercase" style={{ fontFamily: 'var(--font-outfit)' }}>
            ISBA
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={fadeUp}
          className="text-5xl xl:text-[58px] font-bold text-white leading-[1.08] mb-5"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          Gestión de<br />
          <span style={{ color: '#60a5fa' }}>Incidentes</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p variants={fadeUp} className="text-slate-400 text-[15px] leading-relaxed mb-10 max-w-[260px]">
          Plataforma centralizada para el seguimiento y resolución de incidentes de la inmobiliaria.
        </motion.p>

        {/* Feature bullets */}
        <div className="space-y-4">
          {features.map((label) => (
            <motion.div key={label} variants={fadeUp} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#3b82f6' }} />
              <span className="text-slate-300 text-sm">{label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        <div className="h-px mb-5" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <p className="text-slate-600 text-xs">© 2025 ISBA — Sistema de Gestión de Incidentes</p>
      </motion.div>
    </motion.div>
  )
}
