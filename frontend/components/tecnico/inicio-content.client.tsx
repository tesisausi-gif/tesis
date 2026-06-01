'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  CheckCircle2, Star, UserCheck, Wrench, Bell, Zap,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'
import { AgendaTecnico } from '@/components/tecnico/agenda-tecnico.client'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'
import type { FranjaAgenda } from '@/features/disponibilidad/disponibilidad.types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InicioTecnicoProps {
  nombre: string
  iniciales: string
  especialidadesLabel: string
  calificacionPromedio: number | null
  cntAsignado: number
  cntEnProceso: number
  cntFinalizado: number
  trabajosPendientes: number
  notificaciones: Notificacion[]
  compromisos: FranjaAgenda[]
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

// ── Stagger config ────────────────────────────────────────────────────────────

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 34 } },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InicioTecnicoContent({
  nombre,
  iniciales,
  especialidadesLabel,
  calificacionPromedio,
  cntAsignado,
  cntEnProceso,
  cntFinalizado,
  trabajosPendientes,
  notificaciones,
  compromisos,
}: InicioTecnicoProps) {
  const totalActivos = cntAsignado + cntEnProceso
  const todoAlDia = totalActivos === 0 && trabajosPendientes === 0

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="space-y-3 -mt-4"
    >

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <motion.div
        variants={cardVariants}
        className="-mx-4 px-5 pt-8 pb-9 relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, #0e1929 0%, #131e32 60%, #0f1e2e 100%)',
        }}
      >
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)' }}
        />

        <div className="relative">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-400/70 mb-2.5">
            Técnico
          </p>
          <h1 className="text-[1.85rem] font-black text-white leading-none tracking-tighter mb-3">
            Hola, {nombre}.
          </h1>

          <div className="flex items-center gap-2 flex-wrap">
            {todoAlDia ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-900/35 border border-emerald-600/30 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                Todo al día
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-200 bg-blue-900/35 border border-blue-600/30 px-3 py-1.5 rounded-full">
                <Zap className="h-3 w-3" />
                {cntAsignado > 0
                  ? `${cntAsignado} asignación${cntAsignado !== 1 ? 'es' : ''} pendiente${cntAsignado !== 1 ? 's' : ''}`
                  : 'Trabajos en curso'}
              </span>
            )}

            {calificacionPromedio != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-300 bg-yellow-900/30 border border-yellow-600/25 px-2 py-1 rounded-full cursor-default select-none">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {calificacionPromedio.toFixed(1)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Tu calificación promedio</TooltipContent>
              </Tooltip>
            )}
          </div>

          {especialidadesLabel && (
            <p className="text-[11px] text-blue-300/40 mt-2 truncate">{especialidadesLabel}</p>
          )}
        </div>
      </motion.div>

      {/* ── ALERTA CONFORMIDAD ───────────────────────────────────────────── */}
      {trabajosPendientes > 0 && (
        <motion.div variants={cardVariants}>
          <Link href="/tecnico/trabajos">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-2xl p-4 border-l-[3px] border-l-amber-500 border border-amber-200/50 bg-gradient-to-r from-amber-50/80 to-white"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-amber-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900">
                  {trabajosPendientes === 1
                    ? '1 trabajo listo para subir conformidad'
                    : `${trabajosPendientes} trabajos listos para subir conformidad`}
                </p>
                <p className="text-xs text-amber-700/70">Tocá para ir a Trabajos →</p>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      )}

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-3 gap-2">
        {[
          { label: 'Asignaciones', value: cntAsignado,   href: '/tecnico/disponibles',               Icon: UserCheck,    iconColor: 'text-blue-500' },
          { label: 'En proceso',   value: cntEnProceso,  href: '/tecnico/trabajos',                  Icon: Wrench,       iconColor: 'text-orange-500' },
          { label: 'Finalizados',  value: cntFinalizado, href: '/tecnico/trabajos?filtro=resueltos', Icon: CheckCircle2, iconColor: 'text-emerald-500' },
        ].map(({ label, value, href, Icon, iconColor }) => (
          <Link key={label} href={href} className="block">
            <motion.div
              whileHover={{ y: -2, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.08)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
                <AnimatedCounter value={value} />
              </p>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* ── NOTIFICACIONES ──────────────────────────────────────────────── */}
      <motion.div variants={cardVariants}>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <NotificacionesPanel notificaciones={notificaciones} rol="tecnico" />
          </div>
        </div>
      </motion.div>

      {/* ── AGENDA ──────────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants}>
        <AgendaTecnico franjas={compromisos} />
      </motion.div>

      <div className="h-2" />
    </motion.div>
  )
}
