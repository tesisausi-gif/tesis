'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { User, Wrench, CheckCircle, ArrowRight } from 'lucide-react'

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function CTASection() {
  return (
    <section className="py-20 md:py-28" style={{ background: 'white' }}>
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
            Comenzá ahora
          </h2>
          <p className="text-slate-500 text-base md:text-lg" style={{ fontFamily: 'var(--font-outfit)' }}>
            Elegí cómo querés usar la plataforma
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-5 md:grid-cols-2 max-w-2xl mx-auto">
          {/* Cliente */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="rounded-2xl p-8 flex flex-col"
            style={{
              background: '#F7F6F3',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(37,99,235,0.1)' }}
            >
              <User className="h-6 w-6" style={{ color: '#2563eb' }} />
            </div>
            <h3
              className="text-xl font-bold text-slate-900 mb-1"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Soy Cliente
            </h3>
            <p className="text-slate-500 text-sm mb-5" style={{ fontFamily: 'var(--font-outfit)' }}>
              Reportá incidentes en tus propiedades
            </p>
            <ul className="space-y-2.5 mb-7 flex-1">
              {['Crea reportes de incidentes', 'Seguí el estado en tiempo real', 'Calificá el servicio recibido'].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600" style={{ fontFamily: 'var(--font-outfit)' }}>
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register?tipo=cliente"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
              style={{ background: '#2563eb', fontFamily: 'var(--font-syne)' }}
            >
              Registrarme como Cliente
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Técnico */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-8 flex flex-col"
            style={{
              background: '#F7F6F3',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(217,119,6,0.1)' }}
            >
              <Wrench className="h-6 w-6" style={{ color: '#d97706' }} />
            </div>
            <h3
              className="text-xl font-bold text-slate-900 mb-1"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Soy Técnico
            </h3>
            <p className="text-slate-500 text-sm mb-5" style={{ fontFamily: 'var(--font-outfit)' }}>
              Ofrecé tus servicios profesionales
            </p>
            <ul className="space-y-2.5 mb-7 flex-1">
              {['Recibí trabajos según tu especialidad', 'Gestioná tus asignaciones', 'Construí tu reputación'].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600" style={{ fontFamily: 'var(--font-outfit)' }}>
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register?tipo=tecnico"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                border: '1px solid rgba(0,0,0,0.12)',
                color: '#374151',
                fontFamily: 'var(--font-syne)',
              }}
            >
              Solicitar registro como Técnico
            </Link>
          </motion.div>
        </div>

        {/* Login link */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 text-center text-sm text-slate-500"
          style={{ fontFamily: 'var(--font-outfit)' }}
        >
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
            Inicia sesión aquí
          </Link>
        </motion.p>
      </div>
    </section>
  )
}
