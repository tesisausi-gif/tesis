'use client'

import { motion } from 'framer-motion'
import { AlertCircle, Clock, UserCheck, LayoutDashboard } from 'lucide-react'

const features = [
  {
    icon: AlertCircle,
    title: 'Reporta Incidentes',
    description: 'Crea reportes detallados con fotos y descripción. Rápido y sencillo desde cualquier dispositivo.',
    accent: '#2563eb',
    bg: 'rgba(37,99,235,0.08)',
  },
  {
    icon: Clock,
    title: 'Seguimiento en Tiempo Real',
    description: 'Monitorea el estado de tus incidentes y recibe notificaciones de cada actualización.',
    accent: '#059669',
    bg: 'rgba(5,150,105,0.08)',
  },
  {
    icon: UserCheck,
    title: 'Técnicos Calificados',
    description: 'Profesionales especializados en distintas áreas listos para resolver tu problema.',
    accent: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
  },
  {
    icon: LayoutDashboard,
    title: 'Panel Centralizado',
    description: 'Gestiona propiedades, técnicos e incidentes desde un único lugar.',
    accent: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28" style={{ background: '#F7F6F3' }}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2
            className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
            style={{ fontFamily: 'var(--font-syne)', letterSpacing: '-0.02em' }}
          >
            Todo lo que necesitas
          </h2>
          <p className="text-slate-500 text-base md:text-lg max-w-sm mx-auto" style={{ fontFamily: 'var(--font-outfit)' }}>
            Una plataforma completa para la gestión de incidentes inmobiliarios
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: feature.bg }}
              >
                <feature.icon className="h-5 w-5" style={{ color: feature.accent }} />
              </div>
              <div>
                <h3
                  className="font-bold text-slate-900 mb-1.5 text-[15px]"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {feature.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-outfit)' }}>
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
