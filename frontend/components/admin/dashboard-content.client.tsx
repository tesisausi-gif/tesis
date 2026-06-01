'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Wrench, Clock, CheckCircle, ArrowRight,
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

// ── Stagger config ────────────────────────────────────────────────────────────

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 34 } },
}

// ── Stat card (white minimal) ─────────────────────────────────────────────────

function StatCard({
  href,
  accent,
  label,
  value,
  icon: Icon,
  valueColor,
}: {
  href: string
  accent: string
  label: string
  value: number
  icon: React.ElementType
  valueColor: string
}) {
  return (
    <Link href={href} className="group block">
      <motion.div
        whileHover={{ y: -3, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.10)' }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 pt-4 pb-3.5"
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${accent}`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-gray-200 group-hover:text-gray-400 transition-colors" />
        </div>
        <div className={`text-3xl font-black tabular-nums leading-none mb-1.5 ${valueColor}`}>
          <AnimatedCounter value={value} />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{label}</p>
      </motion.div>
    </Link>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardContent({
  stats: initialStats,
  notificaciones,
}: DashboardContentProps) {
  const [stats, setStats] = useState<Stats>(initialStats)
  const refreshingRef = useRef(false)

  const refrescarStats = async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    try {
      const nuevosStats = await getDashboardStats()
      setStats(nuevosStats)
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
        refrescarStats()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidentes' }, () => refrescarStats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'asignaciones_tecnico' }, () => refrescarStats())
      .subscribe()

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
        className="-mx-6 px-6 pt-9 pb-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, #0c0b1a 0%, #130f28 60%, #0e0d1f 100%)',
        }}
      >
        <div
          className="absolute -top-28 -right-28 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)' }}
        />

        <div className="relative">
          <h1 className="text-[2.15rem] font-black text-white leading-none tracking-tighter mb-3">
            Inicio
          </h1>
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${totalActivos > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="text-sm text-white/45">
              {totalActivos > 0
                ? `${totalActivos} incidente${totalActivos !== 1 ? 's' : ''} activo${totalActivos !== 1 ? 's' : ''}`
                : 'Sin incidentes activos'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── STAT CARDS — incidentes ──────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-3 gap-2.5">
        <StatCard
          href="/dashboard/incidentes?tab=pendiente"
          accent="bg-amber-500"
          label="Pendientes"
          value={stats.incidentesPendientes}
          icon={Clock}
          valueColor="text-slate-900"
        />
        <StatCard
          href="/dashboard/incidentes?tab=en_proceso"
          accent="bg-orange-500"
          label="En Proceso"
          value={stats.incidentesEnProceso}
          icon={Wrench}
          valueColor="text-slate-900"
        />
        <StatCard
          href="/dashboard/incidentes?tab=finalizado"
          accent="bg-emerald-500"
          label="Finalizados"
          value={stats.incidentesResueltos}
          icon={CheckCircle}
          valueColor="text-slate-900"
        />
      </motion.div>

      {/* ── ENTIDADES ────────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-2 gap-2.5">
        <StatCard
          href="/dashboard/clientes"
          accent="bg-violet-500"
          label="Clientes"
          value={stats.clientes}
          icon={Users}
          valueColor="text-slate-900"
        />
        <StatCard
          href="/dashboard/tecnicos"
          accent="bg-blue-500"
          label="Técnicos"
          value={stats.tecnicos}
          icon={Wrench}
          valueColor="text-slate-900"
        />
      </motion.div>

      {/* ── NOTIFICACIONES ──────────────────────────────────────────────── */}
      <motion.div variants={cardVariants}>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3">
            <NotificacionesPanel notificaciones={notificaciones} rol="admin" />
          </div>
        </div>
      </motion.div>

      <div className="h-2" />
    </motion.div>
  )
}
