'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Wrench, Clock, AlertCircle, CheckCircle, Activity,
  ArrowRight, Wifi, WifiOff, Send, MapPin, Zap,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'
import { getDashboardStats, getDashboardActividad } from '@/features/incidentes/incidentes.service'
import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'

interface Stats {
  incidentesPendientes: number
  incidentesEnProceso: number
  incidentesResueltos: number
  propiedades: number
  clientes: number
  tecnicos: number
}

interface IncidenteReciente {
  id_incidente: number
  descripcion_problema: string
  estado_actual: string
  fecha_registro: string
  clientes: { nombre: string; apellido: string } | null
  inmuebles: { calle: string | null; altura: string | null } | null
}

interface AsignacionReciente {
  id_asignacion: number
  fecha_asignacion: string
  fecha_creacion: string
  tecnicos: { nombre: string; apellido: string } | null
  incidentes: { id_incidente: number; descripcion_problema: string } | null
}

interface DashboardContentProps {
  stats: Stats
  incidentesRecientes: IncidenteReciente[]
  asignacionesRecientes: AsignacionReciente[]
  notificaciones: Notificacion[]
}

const ESTADO_CFG: Record<string, { badge: string; label: string }> = {
  pendiente:             { badge: 'bg-amber-100 text-amber-800 ring-amber-200',      label: 'Pendiente' },
  asignacion_solicitada: { badge: 'bg-blue-100 text-blue-800 ring-blue-200',         label: 'Asig. Solicitada' },
  en_proceso:            { badge: 'bg-orange-100 text-orange-800 ring-orange-200',   label: 'En Proceso' },
  finalizado:            { badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200', label: 'Finalizado' },
  resuelto:              { badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200', label: 'Finalizado' },
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
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 34 } },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardContent({
  stats: initialStats,
  incidentesRecientes: initialIncidentes,
  asignacionesRecientes: initialAsignaciones,
  notificaciones,
}: DashboardContentProps) {
  const [stats, setStats] = useState<Stats>(initialStats)
  const [incidentesRecientes, setIncidentesRecientes] = useState<IncidenteReciente[]>(initialIncidentes)
  const [asignacionesRecientes, setAsignacionesRecientes] = useState<AsignacionReciente[]>(initialAsignaciones)
  const [conectado, setConectado] = useState(false)
  const refreshingRef = useRef(false)

  const refrescarDatos = async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    try {
      const [nuevosStats, nuevaActividad] = await Promise.all([
        getDashboardStats(),
        getDashboardActividad(),
      ])
      setStats(nuevosStats)
      setIncidentesRecientes(nuevaActividad.incidentesRecientes as unknown as IncidenteReciente[])
      setAsignacionesRecientes(nuevaActividad.asignacionesRecientes as unknown as AsignacionReciente[])
    } catch {
      // silencioso
    } finally {
      refreshingRef.current = false
    }
  }

  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel('dashboard-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidentes' }, (payload) => {
        toast.info('Nuevo incidente reportado', {
          description: `Incidente #${payload.new.id_incidente} ingresado al sistema`,
          duration: 5000,
        })
        refrescarDatos()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidentes' }, () => refrescarDatos())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'asignaciones_tecnico' }, () => refrescarDatos())
      .subscribe((status) => setConectado(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(canal) }
  }, [])

  const totalActivos = stats.incidentesPendientes + stats.incidentesEnProceso

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
        className="-mx-6 px-6 pt-8 pb-9 relative overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 85% 0%, rgba(109,40,217,0.22) 0%, transparent 50%), linear-gradient(148deg, #0c0b1a 0%, #130f28 55%, #0e0d1f 100%)',
        }}
      >
        {/* Fine grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Ambient glow */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.40, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.4) 0%, transparent 68%)' }}
        />

        {/* Small accent dots */}
        <div className="absolute top-5 right-5 flex gap-1 opacity-30">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-1 w-1 rounded-full bg-violet-400" />
          ))}
        </div>

        <div className="relative">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-violet-400/70 mb-2.5">
            Sistema ISBA
          </p>
          <h1 className="text-[2.15rem] font-black text-white leading-none tracking-tighter mb-4">
            Panel de Control
          </h1>

          <div className="flex items-center gap-2 flex-wrap">
            {totalActivos > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200 bg-violet-900/35 border border-violet-600/30 px-3 py-1.5 rounded-full">
                <Zap className="h-3 w-3" />
                {totalActivos} incidente{totalActivos !== 1 ? 's' : ''} activo{totalActivos !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-900/35 border border-emerald-600/30 px-3 py-1.5 rounded-full">
                <CheckCircle className="h-3 w-3" />
                Sin pendientes
              </span>
            )}

            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              conectado
                ? 'text-emerald-300 border-emerald-600/30 bg-emerald-900/35'
                : 'text-slate-400 border-slate-600/30 bg-slate-900/35'
            }`}>
              {conectado
                ? <><Wifi className="h-3 w-3" /> En vivo</>
                : <><WifiOff className="h-3 w-3" /> Conectando...</>
              }
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── STAT CARDS — incidentes ──────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link href="/dashboard/incidentes?tab=pendiente" className="group block">
          <motion.div
            whileHover={{ rotateY: 5, rotateX: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
            className="rounded-2xl bg-white px-4 pt-4 pb-3.5 border border-gray-100 shadow-sm flex flex-col gap-1"
          >
            <div className="h-[3px] w-7 rounded-full mb-1 bg-amber-400" />
            <div className="flex items-center justify-between">
              <div className="text-3xl font-black tabular-nums text-amber-700">
                <AnimatedCounter value={stats.incidentesPendientes} />
              </div>
              <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] flex items-center gap-1">
              Pendientes <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </motion.div>
        </Link>

        <Link href="/dashboard/incidentes?tab=en_proceso" className="group block">
          <motion.div
            whileHover={{ rotateY: 5, rotateX: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
            className="rounded-2xl bg-white px-4 pt-4 pb-3.5 border border-gray-100 shadow-sm flex flex-col gap-1"
          >
            <div className="h-[3px] w-7 rounded-full mb-1 bg-orange-400" />
            <div className="flex items-center justify-between">
              <div className="text-3xl font-black tabular-nums text-orange-700">
                <AnimatedCounter value={stats.incidentesEnProceso} />
              </div>
              <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center">
                <Wrench className="h-3.5 w-3.5 text-orange-600" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] flex items-center gap-1">
              En Proceso <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </motion.div>
        </Link>

        <Link href="/dashboard/incidentes?tab=finalizado" className="group block">
          <motion.div
            whileHover={{ rotateY: 5, rotateX: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
            className="rounded-2xl bg-white px-4 pt-4 pb-3.5 border border-gray-100 shadow-sm flex flex-col gap-1"
          >
            <div className="h-[3px] w-7 rounded-full mb-1 bg-emerald-400" />
            <div className="flex items-center justify-between">
              <div className="text-3xl font-black tabular-nums text-emerald-700">
                <AnimatedCounter value={stats.incidentesResueltos} />
              </div>
              <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] flex items-center gap-1">
              Finalizados <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </motion.div>
        </Link>
      </motion.div>

      {/* ── ENTIDADES ────────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-2 gap-2">
        <Link href="/dashboard/clientes" className="block">
          <motion.div
            whileHover={{ rotateY: 5, rotateX: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
            className="rounded-2xl bg-white px-4 pt-4 pb-3.5 border border-gray-100 shadow-sm flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <div className="text-2xl font-black tabular-nums text-violet-700">
                <AnimatedCounter value={stats.clientes} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.10em]">Clientes</p>
            </div>
          </motion.div>
        </Link>

        <Link href="/dashboard/tecnicos" className="block">
          <motion.div
            whileHover={{ rotateY: 5, rotateX: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
            className="rounded-2xl bg-white px-4 pt-4 pb-3.5 border border-gray-100 shadow-sm flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-black tabular-nums text-blue-700">
                <AnimatedCounter value={stats.tecnicos} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.10em]">Técnicos</p>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* ── NOTIFICACIONES ──────────────────────────────────────────────── */}
      <motion.div variants={cardVariants}>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <NotificacionesPanel notificaciones={notificaciones} rol="admin" />
          </div>
        </div>
      </motion.div>

      {/* ── ACTIVIDAD RECIENTE ───────────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Incidentes recientes */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-sm text-slate-800">Actividad reciente</span>
            </div>
            <Link
              href="/dashboard/incidentes"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {incidentesRecientes.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {incidentesRecientes.map((inc) => {
                const ecfg = ESTADO_CFG[inc.estado_actual] ?? { badge: 'bg-slate-100 text-slate-600 ring-slate-200', label: inc.estado_actual }
                return (
                  <Link
                    key={inc.id_incidente}
                    href={`/dashboard/incidentes?highlight=${inc.id_incidente}`}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400 tabular-nums">#{inc.id_incidente}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-inset ${ecfg.badge}`}>
                          {ecfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-700 transition-colors">
                        {inc.descripcion_problema}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        {inc.clientes ? `${inc.clientes.nombre} ${inc.clientes.apellido}` : '—'}
                        {inc.inmuebles?.calle && (
                          <><span className="opacity-40">·</span><MapPin className="h-2.5 w-2.5" />{inc.inmuebles.calle}</>
                        )}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">
                      {formatDistanceToNow(new Date(inc.fecha_registro), { addSuffix: true, locale: es })}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Sin actividad reciente</p>
          )}
        </div>

        {/* Asignaciones recientes */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Send className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-sm text-slate-800">Asignaciones recientes</span>
          </div>

          {asignacionesRecientes.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {asignacionesRecientes.map((asig) => (
                <div key={asig.id_asignacion} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Wrench className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {asig.tecnicos ? `${asig.tecnicos.nombre} ${asig.tecnicos.apellido}` : 'Técnico desconocido'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Incidente #{asig.incidentes?.id_incidente} — {asig.incidentes?.descripcion_problema}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(asig.fecha_creacion || asig.fecha_asignacion), { addSuffix: true, locale: es })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Sin asignaciones recientes</p>
          )}
        </div>
      </motion.div>

      <div className="h-2" />
    </motion.div>
  )
}
