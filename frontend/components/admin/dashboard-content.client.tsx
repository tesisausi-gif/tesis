'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Wrench, Clock, CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'
import { getDashboardStats } from '@/features/incidentes/incidentes.service'
import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

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

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  href,
  iconColor,
  label,
  value,
  icon: Icon,
}: {
  href: string
  iconColor: string
  label: string
  value: number
  icon: React.ElementType
}) {
  return (
    <Link href={href} className="block">
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
      className="space-y-3"
    >

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants}>
        <AdminPageHeader title="Panel de Control" subtitle="Resumen general del sistema Mantis" />
      </motion.div>

      {/* ── STATUS LINE ──────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="flex items-center gap-1.5 pb-1">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${totalActivos > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
        <span className="text-xs text-gray-400">
          {totalActivos > 0
            ? `${totalActivos} incidente${totalActivos !== 1 ? 's' : ''} activo${totalActivos !== 1 ? 's' : ''}`
            : 'Sin incidentes activos'}
        </span>
      </motion.div>

      {/* ── STAT CARDS — incidentes ──────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-3 gap-2.5">
        <StatCard href="/dashboard/incidentes?tab=pendiente" iconColor="text-amber-500" label="Pendientes" value={stats.incidentesPendientes} icon={Clock} />
        <StatCard href="/dashboard/incidentes?tab=en_proceso" iconColor="text-orange-500" label="En Proceso" value={stats.incidentesEnProceso} icon={Wrench} />
        <StatCard href="/dashboard/incidentes?tab=finalizado" iconColor="text-emerald-500" label="Finalizados" value={stats.incidentesResueltos} icon={CheckCircle} />
      </motion.div>

      {/* ── ENTIDADES ────────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-2 gap-2.5">
        <StatCard href="/dashboard/clientes" iconColor="text-violet-500" label="Clientes" value={stats.clientes} icon={Users} />
        <StatCard href="/dashboard/tecnicos" iconColor="text-blue-500" label="Técnicos" value={stats.tecnicos} icon={Wrench} />
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
