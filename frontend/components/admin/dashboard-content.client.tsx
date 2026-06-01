'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Wrench, Clock, CheckCircle,
  ArrowRight, Wifi, WifiOff, Zap,
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

// ── Colored stat card ─────────────────────────────────────────────────────────

function StatCard({
  href,
  gradient,
  label,
  sublabel,
  value,
  icon: Icon,
  decoration,
}: {
  href: string
  gradient: string
  label: string
  sublabel: string
  value: number
  icon: React.ElementType
  decoration: React.ReactNode
}) {
  return (
    <Link href={href} className="group block">
      <motion.div
        whileHover={{ scale: 1.025, y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative overflow-hidden rounded-2xl p-5"
        style={{ background: gradient }}
      >
        {decoration}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/60">{label}</span>
            <div className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center">
              <Icon className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="text-4xl font-black text-white tabular-nums leading-none mb-1.5">
            <AnimatedCounter value={value} />
          </div>
          <p className="text-xs text-white/55 flex items-center gap-1">
            {sublabel}
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </div>
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
  const [conectado, setConectado] = useState(false)
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
      .subscribe((status) => setConectado(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(canal) }
  }, [])

  const totalActivos = stats.incidentesPendientes + stats.incidentesEnProceso

  // Decoraciones SVG por card
  const decoPendientes = (
    <svg className="absolute right-0 top-0 w-40 h-40 pointer-events-none" viewBox="0 0 200 200" fill="none">
      <circle cx="170" cy="50" r="70" fill="white" fillOpacity="0.07" />
      <circle cx="210" cy="110" r="50" fill="white" fillOpacity="0.05" />
      <circle cx="140" cy="170" r="35" fill="white" fillOpacity="0.06" />
    </svg>
  )
  const decoEnProceso = (
    <svg className="absolute right-0 top-0 w-40 h-40 pointer-events-none" viewBox="0 0 200 200" fill="none">
      <ellipse cx="180" cy="60" rx="55" ry="30" fill="white" fillOpacity="0.07" />
      <circle cx="200" cy="130" r="45" fill="white" fillOpacity="0.05" />
      <rect x="130" y="20" width="60" height="30" rx="12" fill="white" fillOpacity="0.06" />
    </svg>
  )
  const decoFinalizados = (
    <svg className="absolute right-0 top-0 w-40 h-40 pointer-events-none" viewBox="0 0 200 200" fill="none">
      <polygon points="200,0 200,80 120,0" fill="white" fillOpacity="0.07" />
      <circle cx="175" cy="100" r="50" fill="white" fillOpacity="0.05" />
      <circle cx="145" cy="30" r="18" fill="white" fillOpacity="0.08" />
    </svg>
  )

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
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.40, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.4) 0%, transparent 68%)' }}
        />
        <div className="absolute top-5 right-5 flex gap-1 opacity-30">
          {[0, 1, 2].map(i => <div key={i} className="h-1 w-1 rounded-full bg-violet-400" />)}
        </div>

        <div className="relative">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-violet-400/70 mb-2.5">Sistema ISBA</p>
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
              {conectado ? <><Wifi className="h-3 w-3" /> En vivo</> : <><WifiOff className="h-3 w-3" /> Conectando...</>}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── STAT CARDS — incidentes ──────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-3 gap-2.5">
        <StatCard
          href="/dashboard/incidentes?tab=pendiente"
          gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          label="Pendientes"
          sublabel="Sin asignar"
          value={stats.incidentesPendientes}
          icon={Clock}
          decoration={decoPendientes}
        />
        <StatCard
          href="/dashboard/incidentes?tab=en_proceso"
          gradient="linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
          label="En Proceso"
          sublabel="Siendo atendidos"
          value={stats.incidentesEnProceso}
          icon={Wrench}
          decoration={decoEnProceso}
        />
        <StatCard
          href="/dashboard/incidentes?tab=finalizado"
          gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
          label="Finalizados"
          sublabel="Completados"
          value={stats.incidentesResueltos}
          icon={CheckCircle}
          decoration={decoFinalizados}
        />
      </motion.div>

      {/* ── ENTIDADES ────────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-2 gap-2.5">
        <StatCard
          href="/dashboard/clientes"
          gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
          label="Clientes"
          sublabel="Activos en el sistema"
          value={stats.clientes}
          icon={Users}
          decoration={
            <svg className="absolute right-0 top-0 w-36 h-36 pointer-events-none" viewBox="0 0 200 200" fill="none">
              <circle cx="160" cy="60" r="60" fill="white" fillOpacity="0.07" />
              <circle cx="190" cy="140" r="35" fill="white" fillOpacity="0.05" />
            </svg>
          }
        />
        <StatCard
          href="/dashboard/tecnicos"
          gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
          label="Técnicos"
          sublabel="Activos en el sistema"
          value={stats.tecnicos}
          icon={Wrench}
          decoration={
            <svg className="absolute right-0 top-0 w-36 h-36 pointer-events-none" viewBox="0 0 200 200" fill="none">
              <circle cx="165" cy="55" r="55" fill="white" fillOpacity="0.07" />
              <ellipse cx="185" cy="130" rx="38" ry="22" fill="white" fillOpacity="0.05" />
            </svg>
          }
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
