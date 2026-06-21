'use client'

import { motion } from 'framer-motion'
import { AlertCircle, Clock, UserCheck, LayoutDashboard, Shield, Sparkles } from 'lucide-react'

type Feature = {
  icon: typeof AlertCircle
  title: string
  description: string
  accent?: boolean
}

const features: Feature[] = [
  {
    icon: AlertCircle,
    title: 'Reportá incidentes',
    description: 'Creá reportes con fotos y descripción desde cualquier dispositivo.',
  },
  {
    icon: Clock,
    title: 'Seguimiento del estado',
    description: 'Mantenete al tanto del avance: inspección, presupuesto, trabajo y cierre.',
  },
  {
    icon: Sparkles,
    title: 'Walter, tu asistente IA',
    description: 'Pedile métricas, listados o ayuda en lenguaje natural. Walter razona sobre tus datos y responde al instante.',
    accent: true,
  },
  {
    icon: UserCheck,
    title: 'Sugerencia inteligente',
    description: 'El sistema te propone los técnicos más afines según especialidad y tipo de incidente. Vos decidís a quién asignar.',
  },
  {
    icon: LayoutDashboard,
    title: 'Panel centralizado',
    description: 'Gestioná propiedades, técnicos, presupuestos y cobros desde un único dashboard.',
  },
  {
    icon: Shield,
    title: 'Conformidades y cierre',
    description: 'Flujo completo: inspección, presupuesto, trabajo, conformidad y cobro.',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28" style={{ background: '#060d1a' }}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="mb-12 md:mb-16"
        >
          <p
            className="text-[10px] font-bold tracking-[0.3em] uppercase text-blue-400/60 mb-3"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            Capacidades
          </p>
          <h2
            className="text-3xl md:text-4xl font-black text-white leading-[1.25]"
            style={{
              fontFamily: 'var(--font-syne)',
              letterSpacing: '-0.02em',
              transform: 'scaleY(1.2)',
              transformOrigin: 'top left',
            }}
          >
            <span className="block">Todo lo que necesitás,</span>
            <span className="block" style={{ color: '#60a5fa' }}>en un solo lugar.</span>
          </h2>
        </motion.div>

        {/* Grid uniforme — alturas equal-height, sin spans desparejos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.45, delay: index * 0.05, ease: 'easeOut' }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="group relative flex flex-col rounded-2xl border p-6 h-full overflow-hidden"
                style={{
                  background: feature.accent
                    ? 'linear-gradient(180deg, rgba(29,78,216,0.10) 0%, rgba(14,25,41,0.6) 70%)'
                    : 'rgba(14,25,41,0.55)',
                  borderColor: feature.accent ? 'rgba(96,165,250,0.30)' : 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Glow sutil en hover (siempre visible si es accent) */}
                <div
                  className={`absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-500 ${
                    feature.accent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={{
                    background:
                      'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.10), transparent 70%)',
                  }}
                />

                {/* Header: icono + badge IA si corresponde */}
                <div className="relative flex items-center justify-between mb-5">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                    style={{
                      background: feature.accent
                        ? 'rgba(37,99,235,0.20)'
                        : 'rgba(255,255,255,0.04)',
                      border: feature.accent
                        ? '1px solid rgba(96,165,250,0.35)'
                        : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Icon
                      className={feature.accent ? 'h-4 w-4 text-blue-200' : 'h-4 w-4 text-blue-300'}
                      strokeWidth={1.75}
                    />
                  </div>
                  {feature.accent && (
                    <span
                      className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-1 rounded-full"
                      style={{
                        fontFamily: 'var(--font-outfit)',
                        color: '#93c5fd',
                        background: 'rgba(59,130,246,0.10)',
                        border: '1px solid rgba(59,130,246,0.25)',
                      }}
                    >
                      IA
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  className="relative text-base font-bold text-white tracking-tight mb-2"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p
                  className="relative text-sm text-slate-400 leading-relaxed"
                  style={{ fontFamily: 'var(--font-outfit)' }}
                >
                  {feature.description}
                </p>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
