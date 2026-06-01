'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Wrench, Clock, FileText, CheckCircle,
  Wifi, WifiOff, ArrowRight, ClipboardCheck,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'
import { getDashboardStats } from '@/features/incidentes/incidentes.service'
import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'

interface Stats {
  incidentesPendientes: number
  incidentesEnProceso: number
  incidentesResueltos: number
  propiedades: number
  clientes: number
  tecnicos: number
  presupuestosPendientes: number
  conformidadesPendientes: number
}

interface DashboardContentProps {
  stats: Stats
  notificaciones: Notificacion[]
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

export function DashboardContent({ stats: initialStats, notificaciones }: DashboardContentProps) {
  const [stats, setStats] = useState<Stats>(initialStats)
  const [conectado, setConectado] = useState(false)
  const refreshingRef = useRef(false)

  const refrescarDatos = async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    try {
      setStats(await getDashboardStats())
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presupuestos' }, () => refrescarDatos())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conformidades' }, () => refrescarDatos())
      .subscribe((status) => setConectado(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(canal) }
  }, [])

  const totalActivos = stats.incidentesPendientes + stats.incidentesEnProceso
  const accionesPendientes = stats.incidentesPendientes + stats.presupuestosPendientes + stats.conformidadesPendientes

  return (
    <div className="space-y-4">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl px-6 py-7"
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

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-400/80 mb-1">Panel de administración</p>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
              {accionesPendientes > 0
                ? `${accionesPendientes} ${accionesPendientes === 1 ? 'acción pendiente' : 'acciones pendientes'}`
                : 'Todo al día'
              }
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {totalActivos} incidente{totalActivos !== 1 ? 's' : ''} activo{totalActivos !== 1 ? 's' : ''} en el sistema
            </p>
          </div>

          {/* Realtime badge */}
          <div className={`shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${
            conectado
              ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
              : 'text-slate-500 border-slate-600/40 bg-slate-800/40'
          }`}>
            {conectado
              ? <><Wifi className="h-3 w-3" /> En vivo</>
              : <><WifiOff className="h-3 w-3" /> Conectando...</>
            }
          </div>
        </div>
      </motion.div>

      {/* ── Action stats ─────────────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <motion.div variants={cardVariants}>
          <Link href="/dashboard/incidentes?tab=pendiente" className="group block h-full">
            <motion.div
              whileHover={{ rotateY: 5, rotateX: -2, scale: 1.02 }}
              style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
              className="h-full rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sin técnico</span>
                <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                </div>
              </div>
              <div className="text-3xl font-black tabular-nums text-amber-600">
                <AnimatedCounter value={stats.incidentesPendientes} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                Requieren asignación
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </p>
            </motion.div>
          </Link>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Link href="/dashboard/incidentes?tab=en_proceso" className="group block h-full">
            <motion.div
              whileHover={{ rotateY: 5, rotateX: -2, scale: 1.02 }}
              style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
              className="h-full rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presupuestos</span>
                <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                </div>
              </div>
              <div className="text-3xl font-black tabular-nums text-blue-600">
                <AnimatedCounter value={stats.presupuestosPendientes} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                Esperando aprobación
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </p>
            </motion.div>
          </Link>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Link href="/dashboard/incidentes" className="group block h-full">
            <motion.div
              whileHover={{ rotateY: 5, rotateX: -2, scale: 1.02 }}
              style={{ transformStyle: 'preserve-3d', perspective: '700px' }}
              className="h-full rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conformidades</span>
                <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <ClipboardCheck className="h-3.5 w-3.5 text-violet-500" />
                </div>
              </div>
              <div className="text-3xl font-black tabular-nums text-violet-600">
                <AnimatedCounter value={stats.conformidadesPendientes} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                Pendientes de firma
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </p>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Overview stats ───────────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-3"
      >
        <motion.div variants={cardVariants}>
          <Link href="/dashboard/incidentes?tab=en_proceso" className="block h-full">
            <div className="rounded-2xl border-l-4 border-l-orange-400 bg-gradient-to-r from-orange-50/60 to-white p-4 shadow-sm hover:shadow-md transition-shadow h-full">
              <div className="text-2xl font-bold tabular-nums text-orange-700">
                <AnimatedCounter value={stats.incidentesEnProceso} />
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Wrench className="h-3 w-3 text-orange-500 shrink-0" />
                <span className="text-[11px] text-slate-500 leading-tight">En proceso</span>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Link href="/dashboard/incidentes?tab=finalizado" className="block h-full">
            <div className="rounded-2xl border-l-4 border-l-emerald-400 bg-gradient-to-r from-emerald-50/60 to-white p-4 shadow-sm hover:shadow-md transition-shadow h-full">
              <div className="text-2xl font-bold tabular-nums text-emerald-700">
                <AnimatedCounter value={stats.incidentesResueltos} />
              </div>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="text-[11px] text-slate-500 leading-tight">Finalizados</span>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={cardVariants}>
          <div className="rounded-2xl border-l-4 border-l-slate-300 bg-gradient-to-r from-slate-50/60 to-white p-4 shadow-sm h-full">
            <div className="text-2xl font-bold tabular-nums text-slate-700">
              <AnimatedCounter value={stats.propiedades} />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[11px] text-slate-500 leading-tight">Propiedades</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Entity cards ─────────────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3"
      >
        <motion.div variants={cardVariants}>
          <Link href="/dashboard/clientes" className="group block">
            <div className="rounded-2xl bg-gradient-to-r from-violet-50/60 to-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <div className="text-xl font-bold tabular-nums text-violet-700">
                  <AnimatedCounter value={stats.clientes} />
                </div>
                <p className="text-[11px] text-slate-400">Clientes activos</p>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Link href="/dashboard/tecnicos" className="group block">
            <div className="rounded-2xl bg-gradient-to-r from-blue-50/60 to-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold tabular-nums text-blue-700">
                  <AnimatedCounter value={stats.tecnicos} />
                </div>
                <p className="text-[11px] text-slate-400">Técnicos activos</p>
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Notifications ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-1">
          <NotificacionesPanel notificaciones={notificaciones} rol="admin" />
        </div>
      </div>

    </div>
  )
}
