'use client'

import { motion } from 'framer-motion'

export function MobileBrandHeader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="lg:hidden relative overflow-hidden px-6 pt-10 pb-16"
      style={{ background: '#0B1120', minHeight: '200px' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Glow */}
      <div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 65%)' }}
      />
      <div
        className="absolute -bottom-16 -left-12 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)' }}
      />

      {/* Circle ring decoration */}
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full border pointer-events-none"
        style={{ borderColor: 'rgba(59,130,246,0.12)' }}
      />

      {/* Watermark */}
      <div
        className="absolute -bottom-2 -right-3 pointer-events-none select-none leading-none"
        style={{
          fontFamily: 'var(--font-syne)',
          fontSize: '110px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.03)',
          letterSpacing: '-6px',
        }}
      >
        ISBA
      </div>

      {/* Content */}
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' as const }}
          className="flex items-center gap-2.5 mb-5"
        >
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#2563eb' }}
            animate={{
              boxShadow: [
                '0 0 0px rgba(37,99,235,0)',
                '0 0 16px rgba(37,99,235,0.6)',
                '0 0 0px rgba(37,99,235,0)',
              ],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const }}
          >
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'var(--font-syne)' }}>IS</span>
          </motion.div>
          <span className="text-white/35 text-xs tracking-[0.25em] uppercase" style={{ fontFamily: 'var(--font-syne)' }}>
            ISBA
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4, ease: 'easeOut' as const }}
          className="text-3xl font-bold text-white leading-tight"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          Gestión de <span style={{ color: '#60a5fa' }}>Incidentes</span>
        </motion.h1>
      </div>
    </motion.div>
  )
}
