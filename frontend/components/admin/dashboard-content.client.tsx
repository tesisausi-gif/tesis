'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Wrench, Clock, FileText, CheckCircle,
  Wifi, WifiOff, ArrowRight, ClipboardCheck, Building2,
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

// ── Animated counter (RAF, cubic ease-out) ────────────────────────────────────

function AnimatedCounter({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0)
  const prevRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    const start = performance.now()
    const duration = 900

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

// ── Dark stat card (from 21st.dev StatCard pattern) ───────────────────────────

const HALO_DURATIONS = [8, 10, 7, 12, 9, 11, 8.5, 10.5]

function DarkStatCard({
  value, label, icon, glowColor, href, index = 0,
}: {
  value: number
  label: string
  icon: React.ReactNode
  glowColor: string
  href?: string
  index?: number
}) {
  const haloDuration = HALO_DURATIONS[index % HALO_DURATIONS.length]

  const inner = (
    <div
      className="relative h-full rounded-2xl overflow-hidden p-px"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)' }}
    >
      {/* Moving halo orb */}
      <motion.div
        className="pointer-events-none absolute w-24 h-24 rounded-full blur-2xl"
        style={{ background: glowColor, opacity: 0.5 }}
        animate={{
          top: ['5%', '5%', '60%', '60%', '5%'],
          left: ['5%', '65%', '65%', '5%', '5%'],
        }}
        transition={{ duration: haloDuration, repeat: Infinity, ease: 'linear' }}
      />

      {/* Inner card */}
      <div className="relative h-full rounded-[calc(1rem-1px)] bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
        {/* Rotating blur ray */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[calc(1rem-1px)] blur-3xl"
          style={{ background: glowColor, opacity: 0.06 }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        />

        {/* Subtle top line */}
        <motion.div
          className="pointer-events-none absolute top-[10%] left-[10%] right-[10%] h-px"
          style={{ background: `linear-gradient(to right, transparent, ${glowColor}50, transparent)` }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 5, repeat: Infinity }}
        />

        <div className="relative flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background: `${glowColor}20` }}
            >
              {icon}
            </div>
            {href && (
              <ArrowRight className="h-3.5 w-3.5 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>

          <motion.div
            className="text-4xl font-black text-white tabular-nums leading-none"
            animate={{
              textShadow: [
                `0 0 24px ${glowColor}`,
                `0 0 4px transparent`,
                `0 0 24px ${glowColor}`,
              ],
            }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <AnimatedCounter value={value} />
          </motion.div>

          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            {label}
          </p>
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="group block h-full">
        {inner}
      </Link>
    )
  }
  return inner
}

// ── Stagger variants ──────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
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

  const accionesPendientes = stats.incidentesPendientes + stats.presupuestosPendientes + stats.conformidadesPendientes
  const totalActivos = stats.incidentesPendientes + stats.incidentesEnProceso

  return (
    <div
      className="-m-6 relative overflow-hidden"
      style={{ background: '#07070b', minHeight: 'calc(100vh - 4rem)' }}
    >
      {/* ── Background grid ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* ── Ambient glow blobs ──────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full blur-[160px]"
        style={{ background: 'radial-gradient(ellipse, rgba(217,119,6,0.1) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 w-[500px] h-[400px] rounded-full blur-[140px]"
        style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)' }}
      />

      <div className="relative p-6">

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl mb-4 p-8"
          style={{
            background: 'radial-gradient(120% 120% at 30% 10%, #1c1810 0%, #0e0d12 55%, #080a10 100%)',
          }}
        >
          {/* Hero grid overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          {/* Hero bottom glow */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
            style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(217,119,6,0.3) 0%, transparent 65%)' }}
          />

          {/* Ambient rotating orb */}
          <motion.div
            className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.22) 0%, transparent 70%)', filter: 'blur(40px)' }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/70">
                  Panel de administración
                </span>
                <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                  conectado
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                    : 'text-neutral-500 border-neutral-700 bg-neutral-800/50'
                }`}>
                  {conectado
                    ? <><Wifi className="h-2.5 w-2.5" /> En vivo</>
                    : <><WifiOff className="h-2.5 w-2.5" /> Conectando...</>
                  }
                </div>
              </div>

              {/* Big hero number */}
              <motion.div
                className="text-8xl font-black text-white tabular-nums leading-none"
                animate={{
                  textShadow: [
                    '0 0 60px rgba(217,119,6,0.5)',
                    '0 0 12px rgba(217,119,6,0.1)',
                    '0 0 60px rgba(217,119,6,0.5)',
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <AnimatedCounter value={accionesPendientes} />
              </motion.div>

              <p className="text-xl font-semibold text-neutral-300 mt-2 mb-4">
                {accionesPendientes === 1 ? 'acción pendiente' : 'acciones pendientes'}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {[
                  { val: stats.incidentesPendientes, label: 'sin asignar', color: 'text-amber-400' },
                  { val: stats.presupuestosPendientes, label: 'presupuestos', color: 'text-blue-400' },
                  { val: stats.conformidadesPendientes, label: 'conformidades', color: 'text-violet-400' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="h-1 w-1 rounded-full bg-neutral-700" />}
                    <span className={`text-sm font-bold tabular-nums ${item.color}`}>
                      {item.val}
                    </span>
                    <span className="text-sm text-neutral-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total activos pill */}
            <div
              className="self-start sm:self-auto rounded-2xl px-5 py-4 text-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="text-3xl font-black text-white tabular-nums">
                <AnimatedCounter value={totalActivos} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mt-1">
                incidentes activos
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── ACTION STAT CARDS ────────────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"
        >
          <motion.div variants={itemVariants} className="h-36">
            <DarkStatCard
              value={stats.incidentesPendientes}
              label="Sin técnico asignado"
              icon={<Clock className="h-4 w-4 text-amber-400" />}
              glowColor="rgba(217,119,6,0.8)"
              href="/dashboard/incidentes?tab=pendiente"
              index={0}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="h-36">
            <DarkStatCard
              value={stats.presupuestosPendientes}
              label="Presupuestos a aprobar"
              icon={<FileText className="h-4 w-4 text-blue-400" />}
              glowColor="rgba(59,130,246,0.8)"
              href="/dashboard/incidentes"
              index={1}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="h-36">
            <DarkStatCard
              value={stats.conformidadesPendientes}
              label="Conformidades pendientes"
              icon={<ClipboardCheck className="h-4 w-4 text-violet-400" />}
              glowColor="rgba(139,92,246,0.8)"
              href="/dashboard/incidentes"
              index={2}
            />
          </motion.div>
        </motion.div>

        {/* ── OVERVIEW ROW ─────────────────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4"
        >
          {[
            { value: stats.incidentesEnProceso, label: 'En proceso', icon: <Wrench className="h-3.5 w-3.5 text-orange-400" />, href: '/dashboard/incidentes?tab=en_proceso', color: 'rgba(251,146,60,0.6)' },
            { value: stats.incidentesResueltos, label: 'Finalizados', icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />, href: '/dashboard/incidentes?tab=finalizado', color: 'rgba(52,211,153,0.6)' },
            { value: stats.propiedades, label: 'Propiedades', icon: <Building2 className="h-3.5 w-3.5 text-neutral-400" />, href: undefined, color: 'rgba(156,163,175,0.4)' },
            { value: stats.clientes + stats.tecnicos, label: 'Usuarios', icon: <Users className="h-3.5 w-3.5 text-sky-400" />, href: '/dashboard/clientes', color: 'rgba(56,189,248,0.6)' },
          ].map((item, i) => (
            <motion.div key={i} variants={itemVariants}>
              {item.href ? (
                <Link href={item.href} className="group block">
                  <div
                    className="rounded-2xl p-4 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                    style={{ background: 'rgba(255,255,255,0.035)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                           style={{ background: `${item.color}25` }}>
                        {item.icon}
                      </div>
                    </div>
                    <div className="text-2xl font-black text-white tabular-nums">
                      <AnimatedCounter value={item.value} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mt-1.5">
                      {item.label}
                    </p>
                  </div>
                </Link>
              ) : (
                <div
                  className="rounded-2xl p-4 border border-white/[0.06]"
                  style={{ background: 'rgba(255,255,255,0.035)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                         style={{ background: `${item.color}25` }}>
                      {item.icon}
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white tabular-nums">
                    <AnimatedCounter value={item.value} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mt-1.5">
                    {item.label}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* ── ENTITY CARDS ─────────────────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-3 mb-4"
        >
          <motion.div variants={itemVariants}>
            <Link href="/dashboard/clientes" className="group block">
              <div
                className="rounded-2xl p-5 border border-white/[0.06] hover:border-violet-500/30 transition-colors flex items-center gap-4"
                style={{ background: 'rgba(139,92,246,0.06)' }}
              >
                <div className="h-11 w-11 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white tabular-nums">
                    <AnimatedCounter value={stats.clientes} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mt-0.5">
                    Clientes activos
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link href="/dashboard/tecnicos" className="group block">
              <div
                className="rounded-2xl p-5 border border-white/[0.06] hover:border-sky-500/30 transition-colors flex items-center gap-4"
                style={{ background: 'rgba(14,165,233,0.06)' }}
              >
                <div className="h-11 w-11 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white tabular-nums">
                    <AnimatedCounter value={stats.tecnicos} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mt-0.5">
                    Técnicos activos
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* ── NOTIFICATIONS ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="px-5 pt-4 pb-1">
            <NotificacionesPanel notificaciones={notificaciones} rol="admin" />
          </div>
        </motion.div>

      </div>
    </div>
  )
}
