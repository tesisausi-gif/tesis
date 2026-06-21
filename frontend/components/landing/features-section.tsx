'use client'

import { motion } from 'framer-motion'
import { AlertCircle, Clock, UserCheck, LayoutDashboard, Shield, Bell } from 'lucide-react'

const features = [
  {
    icon: AlertCircle,
    title: 'Reportá incidentes',
    description: 'Creá reportes con fotos y descripción desde cualquier dispositivo. Rápido, claro y sin fricciones.',
    span: 'lg:col-span-2',
    animation: 'float 6s ease-in-out infinite',
  },
  {
    icon: Clock,
    title: 'Seguimiento en tiempo real',
    description: 'Monitorea el estado de cada incidente y recibí notificaciones automáticas ante cada cambio.',
    span: 'lg:col-span-1',
    animation: 'pulse-soft 4s ease-in-out infinite',
  },
  {
    icon: UserCheck,
    title: 'Técnicos calificados',
    description: 'Profesionales especializados, asignados automáticamente según la categoría del incidente.',
    span: 'lg:col-span-1',
    animation: 'tilt 5s ease-in-out infinite',
  },
  {
    icon: LayoutDashboard,
    title: 'Panel centralizado',
    description: 'Gestioná propiedades, técnicos, presupuestos y cobros desde un único dashboard unificado.',
    span: 'lg:col-span-2',
    animation: 'float 7s ease-in-out infinite',
  },
  {
    icon: Shield,
    title: 'Conformidades y cierre',
    description: 'Flujo completo: inspección → presupuesto → trabajo → conformidad firmada → cobro.',
    span: 'lg:col-span-1',
    animation: 'pulse-soft 5s ease-in-out infinite',
  },
  {
    icon: Bell,
    title: 'Notificaciones push',
    description: 'Alertas en tiempo real en la app web. Instalable como PWA en cualquier dispositivo móvil.',
    span: 'lg:col-span-1',
    animation: 'tilt 6s ease-in-out infinite',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-24 md:py-32" style={{ background: '#060d1a' }}>
      <style>{`
        @keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6%) } }
        @keyframes pulse-soft { 0%,100% { transform:scale(1);opacity:.85 } 50% { transform:scale(1.08);opacity:1 } }
        @keyframes tilt { 0% { transform:rotate(-3deg) } 50% { transform:rotate(3deg) } 100% { transform:rotate(-3deg) } }
        @keyframes bento-in { 0% { opacity:0;transform:translateY(20px) scale(.97) } 100% { opacity:1;transform:translateY(0) scale(1) } }
      `}</style>

      <div className="max-w-5xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-blue-400/60 mb-3"
            style={{ fontFamily: 'var(--font-outfit)' }}>
            Capacidades
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white leading-[1.25]"
            style={{ fontFamily: 'var(--font-syne)', letterSpacing: '-0.02em', transform: 'scaleY(1.2)', transformOrigin: 'top left' }}>
            <span className="block">Todo lo que necesitás,</span>
            <span className="block" style={{ color: '#60a5fa' }}>en un solo lugar.</span>
          </h2>
        </motion.div>

        {/* Bento grid — from 21st.dev Bento Monochrome pattern */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 auto-rows-[minmax(160px,auto)]">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{ duration: 0.5, delay: index * 0.06, ease: 'easeOut' }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 ${feature.span}`}
                style={{
                  background: 'rgba(14,25,41,0.7)',
                  borderColor: 'rgba(255,255,255,0.07)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Ambient glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                  style={{ background: 'radial-gradient(ellipse 60% 80% at 10% 0%, rgba(37,99,235,0.12), transparent 70%)' }} />

                <div className="relative flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                    style={{ background: '#0e1929', border: '1px solid rgba(59,130,246,0.15)' }}>
                    <Icon
                      className="h-5 w-5 text-blue-300"
                      strokeWidth={1.5}
                      style={{ animation: feature.animation }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-blue-400/50 mb-1"
                      style={{ fontFamily: 'var(--font-outfit)' }}>
                      Feature
                    </p>
                    <h3 className="text-base font-bold text-white tracking-tight"
                      style={{ fontFamily: 'var(--font-syne)' }}>
                      {feature.title}
                    </h3>
                  </div>
                </div>

                <p className="relative text-sm text-slate-400 leading-relaxed mt-4"
                  style={{ fontFamily: 'var(--font-outfit)' }}>
                  {feature.description}
                </p>

                {/* Corner accent */}
                <div className="absolute bottom-0 right-0 w-16 h-16 rounded-tl-3xl pointer-events-none opacity-20"
                  style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)' }} />
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
