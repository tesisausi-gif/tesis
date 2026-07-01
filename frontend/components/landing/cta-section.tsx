'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { User, Wrench, CheckCircle, ArrowRight } from 'lucide-react'

const card = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

export function CTASection() {
  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden"
      style={{ background: '#060d1a' }}
    >
      {/* Top separator line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(59,130,246,0.3), transparent)' }} />

      <div className="max-w-5xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-blue-400/60 mb-3"
            style={{ fontFamily: 'var(--font-outfit)' }}>
            Comenzá ahora
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight"
            style={{ fontFamily: 'var(--font-syne)', letterSpacing: '-0.02em', transform: 'scaleY(1.2)', transformOrigin: 'top center' }}>
            Elegí cómo usar la plataforma
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-5 md:grid-cols-2 max-w-2xl mx-auto">

          {/* Cliente */}
          <motion.div
            variants={card}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.05 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="rounded-2xl p-8 flex flex-col relative overflow-hidden"
            style={{
              background: 'rgba(14,25,41,0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />

            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: '#0e1929', border: '1px solid rgba(59,130,246,0.15)' }}>
              <User className="h-6 w-6 text-blue-300" />
            </div>
            <h3 className="text-xl font-black text-white mb-1.5"
              style={{ fontFamily: 'var(--font-syne)' }}>
              Soy Cliente
            </h3>
            <p className="text-slate-400 text-sm mb-6"
              style={{ fontFamily: 'var(--font-outfit)' }}>
              Reportá incidentes en tus propiedades
            </p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {['Reportes con foto y descripción', 'Seguí el estado desde tu portal', 'Calificá el servicio recibido'].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-400"
                  style={{ fontFamily: 'var(--font-outfit)' }}>
                  <CheckCircle className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register?tipo=cliente"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', fontFamily: 'var(--font-syne)' }}
            >
              Registrarme como Cliente
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Técnico */}
          <motion.div
            variants={card}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.05 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="rounded-2xl p-8 flex flex-col relative overflow-hidden"
            style={{
              background: 'rgba(14,25,41,0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />

            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: '#0e1929', border: '1px solid rgba(59,130,246,0.15)' }}>
              <Wrench className="h-6 w-6 text-blue-300" />
            </div>
            <h3 className="text-xl font-black text-white mb-1.5"
              style={{ fontFamily: 'var(--font-syne)' }}>
              Soy Técnico
            </h3>
            <p className="text-slate-400 text-sm mb-6"
              style={{ fontFamily: 'var(--font-outfit)' }}>
              Ofrecé tus servicios profesionales
            </p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {['Trabajos según tu especialidad', 'Gestioná tus asignaciones', 'Construí tu reputación'].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-400"
                  style={{ fontFamily: 'var(--font-outfit)' }}>
                  <CheckCircle className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register?tipo=tecnico"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm transition-all hover:bg-white/10 active:scale-95"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.75)',
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
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-10 text-center text-sm text-slate-600"
          style={{ fontFamily: 'var(--font-outfit)' }}
        >
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
            Iniciá sesión aquí
          </Link>
        </motion.p>
      </div>
    </section>
  )
}
