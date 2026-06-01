'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Star, Bell, UserCheck, Wrench, CheckCircle2, ArrowRight,
} from 'lucide-react'
import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'
import { AgendaTecnico } from '@/components/tecnico/agenda-tecnico.client'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'

export interface TecnicoInicioContentProps {
  nombre: string
  apellido: string
  iniciales: string
  especialidadesLabel: string
  calificacionPromedio: number | null
  cntAsignado: number
  cntEnProceso: number
  cntFinalizado: number
  trabajosPendientes: number
  notificaciones: Notificacion[]
  compromisos: any[]
}

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimatedCounter({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0)
  const prevRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    const duration = 700
    const start = performance.now()

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayed(Math.round(from + (to - from) * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else prevRef.current = to
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  return <>{displayed}</>
}

// ── Stagger variants ──────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TecnicoInicioContent({
  nombre,
  apellido,
  iniciales,
  especialidadesLabel,
  calificacionPromedio,
  cntAsignado,
  cntEnProceso,
  cntFinalizado,
  trabajosPendientes,
  notificaciones,
  compromisos,
}: TecnicoInicioContentProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden px-5 pt-6 pb-7"
        style={{
          background: 'radial-gradient(ellipse at 88% 0%, rgba(217,119,6,0.22) 0%, transparent 52%), linear-gradient(148deg, #1c1a17 0%, #252018 60%, #1a1f2e 100%)',
        }}
      >
        {/* Ambient orb */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.28, 0.42, 0.28] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.35) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-start gap-3">
          {/* Avatar */}
          <div className="h-11 w-11 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-amber-300">{iniciales}</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-400/80">Bienvenido</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <h1 className="text-xl font-bold text-white leading-tight">
                {nombre} {apellido}
              </h1>
              {calificacionPromedio != null && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/25">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {calificacionPromedio.toFixed(1)}
                </span>
              )}
            </div>
            {especialidadesLabel && (
              <p className="text-xs text-slate-400 mt-0.5">{especialidadesLabel}</p>
            )}
          </div>
        </div>
      </motion.div>

      <div className="px-4 space-y-4 pt-4">

        {/* ── Alerta: conformidad pendiente ────────────────────────────── */}
        {trabajosPendientes > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' as const, stiffness: 260, damping: 22 }}
          >
            <Link href="/tecnico/trabajos">
              <div className="rounded-2xl border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-50/70 to-white shadow-sm p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-amber-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">
                    {trabajosPendientes === 1
                      ? '1 trabajo listo para subir conformidad'
                      : `${trabajosPendientes} trabajos listos para subir conformidad`}
                  </p>
                  <p className="text-xs text-amber-600">Tocá para ir a Trabajos →</p>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 gap-2.5"
        >
          <motion.div variants={cardVariants}>
            <Link href="/tecnico/disponibles" className="block h-full">
              <motion.div
                whileHover={{ rotateY: 5, rotateX: -2, scale: 1.03 }}
                style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
                className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow h-full"
              >
                <div className="text-2xl font-black tabular-nums text-blue-600">
                  <AnimatedCounter value={cntAsignado} />
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <UserCheck className="h-3 w-3 text-blue-400 shrink-0" />
                  <span className="text-[11px] text-slate-500 leading-tight">Asignaciones</span>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Link href="/tecnico/trabajos" className="block h-full">
              <motion.div
                whileHover={{ rotateY: 5, rotateX: -2, scale: 1.03 }}
                style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
                className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow h-full"
              >
                <div className="text-2xl font-black tabular-nums text-orange-600">
                  <AnimatedCounter value={cntEnProceso} />
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Wrench className="h-3 w-3 text-orange-400 shrink-0" />
                  <span className="text-[11px] text-slate-500 leading-tight">En proceso</span>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Link href="/tecnico/trabajos?filtro=resueltos" className="block h-full">
              <motion.div
                whileHover={{ rotateY: 5, rotateX: -2, scale: 1.03 }}
                style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
                className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow h-full"
              >
                <div className="text-2xl font-black tabular-nums text-emerald-600">
                  <AnimatedCounter value={cntFinalizado} />
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-slate-500 leading-tight">Finalizados</span>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>

        {/* ── CTA: ir a disponibles ─────────────────────────────────────── */}
        {cntAsignado > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring' as const, stiffness: 260, damping: 24 }}
          >
            <Link href="/tecnico/disponibles">
              <div
                className="rounded-2xl p-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(130deg, #d97706 0%, #b45309 100%)' }}
              >
                <div>
                  <p className="text-sm font-bold text-white">
                    Tenés {cntAsignado} {cntAsignado === 1 ? 'asignación disponible' : 'asignaciones disponibles'}
                  </p>
                  <p className="text-xs text-amber-100/80">Revisá los detalles y agendá tu visita</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── Notificaciones ────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <NotificacionesPanel notificaciones={notificaciones} rol="tecnico" />
          </div>
        </div>

        {/* ── Agenda ───────────────────────────────────────────────────── */}
        <AgendaTecnico franjas={compromisos} />

      </div>
    </div>
  )
}
