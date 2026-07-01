'use client'

import { motion } from 'framer-motion'
import { InfiniteSlider } from '@/components/ui/infinite-slider'

const stats = [
  { value: '100%', label: 'trazabilidad del incidente' },
  { value: '3 roles', label: 'cliente · técnico · admin' },
  { value: 'PWA', label: 'instalable en móvil' },
  { value: 'Multi-inmueble', label: 'por cliente' },
]

export function StatsSection() {
  return (
    <div
      className="relative overflow-hidden py-5 border-y"
      style={{
        background: '#0b1527',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
        style={{ background: 'linear-gradient(to right, #0b1527, transparent)' }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
        style={{ background: 'linear-gradient(to left, #0b1527, transparent)' }} />

      <InfiniteSlider gap={0} speed={45} speedOnHover={15}>
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            className="flex items-center gap-3 px-8"
            whileHover={{ scale: 1.02 }}
          >
            <span
              className="text-sm font-black text-white whitespace-nowrap"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {stat.value}
            </span>
            <span
              className="text-[11px] text-slate-500 whitespace-nowrap uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-outfit)' }}
            >
              {stat.label}
            </span>
            <span className="w-1 h-1 rounded-full bg-blue-600/50 shrink-0" />
          </motion.div>
        ))}
      </InfiniteSlider>
    </div>
  )
}
