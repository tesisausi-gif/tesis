'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Plus, ChevronRight, Calendar, Clock,
  CreditCard, Building2, CheckCircle2,
  Home, FileText, Zap,
} from 'lucide-react'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface InicioContentProps {
  nombre: string
  fechaHoy: string
  stats: { activos: number; en_proceso: number; finalizados: number }
  proximaVisita: {
    fecha: string
    hora_inicio: string
    hora_fin: string
    descripcion: string
    inmueble: string
  } | null
  presupuestosPendientes: number
  pagosPendientes: number
  propiedades: {
    id_inmueble: number
    tipo: string
    direccion: string
    incidentes_activos: number
  }[]
  totalInmuebles: number
}

// ── Animated counter ───────────────────────────────────────────────────────────

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

// ── Dark stat card (same pattern as técnico) ────────────────────────────────

const HALO_DURATIONS = [8, 10, 7]

function DarkStatCard({
  value, label, icon, glowColor, href, index = 0,
}: {
  value: number
  label: string
  icon: React.ReactNode
  glowColor: string
  href: string
  index?: number
}) {
  const haloDuration = HALO_DURATIONS[index % HALO_DURATIONS.length]

  return (
    <Link href={href} className="group block h-full">
      <div
        className="relative h-full rounded-2xl overflow-hidden p-px"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)' }}
      >
        <motion.div
          className="pointer-events-none absolute w-20 h-20 rounded-full blur-2xl"
          style={{ background: glowColor, opacity: 0.5 }}
          animate={{
            top: ['5%', '5%', '60%', '60%', '5%'],
            left: ['5%', '65%', '65%', '5%', '5%'],
          }}
          transition={{ duration: haloDuration, repeat: Infinity, ease: 'linear' }}
        />

        <div className="relative h-full rounded-[calc(1rem-1px)] bg-gradient-to-br from-neutral-900 to-neutral-950 p-4">
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[calc(1rem-1px)] blur-3xl"
            style={{ background: glowColor, opacity: 0.06 }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          />

          <motion.div
            className="pointer-events-none absolute top-[8%] left-[8%] right-[8%] h-px"
            style={{ background: `linear-gradient(to right, transparent, ${glowColor}60, transparent)` }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          <div className="relative flex flex-col items-center justify-center h-full gap-2 py-2">
            <motion.div
              className="text-3xl font-black text-white tabular-nums leading-none"
              animate={{
                textShadow: [`0 0 20px ${glowColor}`, '0 0 4px transparent', `0 0 20px ${glowColor}`],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <AnimatedCounter value={value} />
            </motion.div>
            <div className="flex items-center gap-1.5">
              {icon}
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Stagger variants ────────────────────────────────────────────────────────

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

function labelVisitaFecha(iso: string): string {
  try {
    const d = parseISO(iso)
    if (isToday(d)) return 'Hoy'
    if (isTomorrow(d)) return 'Mañana'
    return format(d, "EEEE d 'de' MMMM", { locale: es })
  } catch {
    return iso
  }
}

// ── Main component ──────────────────────────────────────────────────────────

export function InicioContent({
  nombre,
  fechaHoy,
  stats,
  proximaVisita,
  presupuestosPendientes,
  pagosPendientes,
  propiedades,
  totalInmuebles,
}: InicioContentProps) {
  const tieneAcciones = presupuestosPendientes > 0 || pagosPendientes > 0
  const todoEnOrden = stats.activos === 0 && !tieneAcciones

  return (
    <div style={{ background: '#07070b', minHeight: '100vh' }}>

      {/* ── Background grid ──────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 space-y-3"
      >

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="-mx-4 -mt-4 px-5 pt-8 pb-9 relative overflow-hidden"
          style={{
            background: 'radial-gradient(120% 120% at 30% 10%, #1c1810 0%, #0e0d12 55%, #080a10 100%)',
          }}
        >
          {/* Grid overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          {/* Bottom glow */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
            style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(217,119,6,0.28) 0%, transparent 65%)' }}
          />

          {/* Ambient orb */}
          <motion.div
            className="pointer-events-none absolute -top-12 -right-12 h-52 w-52 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-500/70 mb-2.5">
              {fechaHoy}
            </p>
            <h1 className="text-[2.1rem] font-black text-white leading-none tracking-tighter mb-4">
              Hola, {nombre}.
            </h1>

            {todoEnOrden ? (
              <motion.span
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 px-3 py-1.5 rounded-full border"
                style={{ background: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.25)' }}
                animate={{ boxShadow: ['0 0 12px rgba(52,211,153,0.15)', '0 0 4px transparent', '0 0 12px rgba(52,211,153,0.15)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <CheckCircle2 className="h-3 w-3" />
                Todo en orden
              </motion.span>
            ) : (
              <motion.span
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 px-3 py-1.5 rounded-full border"
                style={{ background: 'rgba(217,119,6,0.1)', borderColor: 'rgba(217,119,6,0.3)' }}
                animate={{ boxShadow: ['0 0 12px rgba(217,119,6,0.2)', '0 0 4px transparent', '0 0 12px rgba(217,119,6,0.2)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Zap className="h-3 w-3" />
                {stats.activos > 0
                  ? `${stats.activos} incidente${stats.activos !== 1 ? 's' : ''} activo${stats.activos !== 1 ? 's' : ''}`
                  : 'Hay acciones pendientes'}
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* ── ACTION BANNERS ───────────────────────────────────────────── */}
        {presupuestosPendientes > 0 && (
          <motion.div variants={itemVariants}>
            <Link href="/cliente/presupuestos">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 rounded-2xl p-4 border"
                style={{ background: 'rgba(217,119,6,0.1)', borderColor: 'rgba(217,119,6,0.25)' }}
                animate={{ boxShadow: ['0 0 16px rgba(217,119,6,0.1)', '0 0 32px rgba(217,119,6,0.18)', '0 0 16px rgba(217,119,6,0.1)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(217,119,6,0.2)' }}
                >
                  <FileText className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-300">
                    {presupuestosPendientes === 1
                      ? 'Tenés un presupuesto para revisar'
                      : `${presupuestosPendientes} presupuestos para revisar`}
                  </p>
                  <p className="text-xs text-amber-500/70 mt-0.5">Tu aprobación está pendiente</p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500/50 shrink-0" />
              </motion.div>
            </Link>
          </motion.div>
        )}

        {pagosPendientes > 0 && (
          <motion.div variants={itemVariants}>
            <Link href="/cliente/pagos">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 rounded-2xl p-4 border"
                style={{ background: 'rgba(244,63,94,0.1)', borderColor: 'rgba(244,63,94,0.25)' }}
              >
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(244,63,94,0.2)' }}
                >
                  <CreditCard className="h-4 w-4 text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-rose-300">
                    {pagosPendientes === 1 ? '1 pago pendiente' : `${pagosPendientes} pagos pendientes`}
                  </p>
                  <p className="text-xs text-rose-500/70 mt-0.5">Completá el pago del servicio</p>
                </div>
                <ChevronRight className="h-4 w-4 text-rose-500/50 shrink-0" />
              </motion.div>
            </Link>
          </motion.div>
        )}

        {/* ── STAT CARDS ───────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2.5" style={{ height: '110px' }}>
          <DarkStatCard
            value={stats.activos}
            label="Activos"
            icon={<Zap className="h-3 w-3 text-amber-400" />}
            glowColor="rgba(217,119,6,0.8)"
            href="/cliente/incidentes"
            index={0}
          />
          <DarkStatCard
            value={stats.en_proceso}
            label="En curso"
            icon={<Building2 className="h-3 w-3 text-sky-400" />}
            glowColor="rgba(56,189,248,0.8)"
            href="/cliente/incidentes"
            index={1}
          />
          <DarkStatCard
            value={stats.finalizados}
            label="Cerrados"
            icon={<CheckCircle2 className="h-3 w-3 text-emerald-400" />}
            glowColor="rgba(52,211,153,0.8)"
            href="/cliente/incidentes"
            index={2}
          />
        </motion.div>

        {/* ── PRÓXIMA VISITA ───────────────────────────────────────────── */}
        {proximaVisita && (
          <motion.div variants={itemVariants}>
            <div
              className="rounded-2xl p-5 relative overflow-hidden border"
              style={{
                background: 'radial-gradient(120% 120% at 80% 0%, rgba(59,130,246,0.15) 0%, rgba(15,32,68,0.9) 100%)',
                borderColor: 'rgba(59,130,246,0.2)',
              }}
            >
              <motion.div
                className="pointer-events-none absolute top-0 right-0 w-40 h-40 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%)', transform: 'translate(35%, -35%)' }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 6, repeat: Infinity }}
              />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-blue-400" />
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-blue-400">
                      Próxima visita
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[2rem] font-black leading-none text-blue-400/20">
                      {format(parseISO(proximaVisita.fecha), 'd')}
                    </p>
                    <p className="text-[10px] uppercase font-black tracking-widest text-blue-400/20 -mt-1">
                      {format(parseISO(proximaVisita.fecha), 'MMM', { locale: es })}
                    </p>
                  </div>
                </div>
                <p className="text-xl font-black text-white capitalize tracking-tight leading-snug">
                  {labelVisitaFecha(proximaVisita.fecha)}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="h-3 w-3 text-blue-400/50" />
                  <p className="text-xs text-blue-200/60">
                    {proximaVisita.hora_inicio}
                    {proximaVisita.hora_fin ? ` — ${proximaVisita.hora_fin}` : ''}
                  </p>
                </div>
                {proximaVisita.inmueble && (
                  <div className="mt-3 pt-3 border-t border-white/[0.08]">
                    <p className="text-xs text-blue-200/40 truncate">{proximaVisita.inmueble}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── CTA REPORTAR ─────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Link href="/cliente/incidentes/nuevo">
            <motion.div
              whileTap={{ scale: 0.97 }}
              className="rounded-2xl p-5 flex items-center justify-between border"
              style={{
                background: 'linear-gradient(130deg, rgba(217,119,6,0.25) 0%, rgba(180,83,9,0.18) 100%)',
                borderColor: 'rgba(217,119,6,0.35)',
              }}
              animate={{ boxShadow: ['0 0 20px rgba(217,119,6,0.12)', '0 0 40px rgba(217,119,6,0.22)', '0 0 20px rgba(217,119,6,0.12)'] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(217,119,6,0.25)' }}
                >
                  <Plus className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-[13px] font-black text-amber-300 uppercase tracking-wide leading-tight">
                    Reportar incidente
                  </p>
                  <p className="text-xs text-amber-500/60 mt-0.5">Informá un problema en tu inmueble</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-500/40 shrink-0" />
            </motion.div>
          </Link>
        </motion.div>

        {/* ── VER INCIDENTES ───────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Link href="/cliente/incidentes">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="rounded-2xl px-5 py-4 flex items-center justify-between border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <Building2 className="h-4 w-4 text-neutral-400" />
                </div>
                <span className="text-sm font-semibold text-neutral-300">Ver todos mis incidentes</span>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-600 shrink-0" />
            </motion.div>
          </Link>
        </motion.div>

        {/* ── MIS PROPIEDADES ──────────────────────────────────────────── */}
        {propiedades.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.18em]">
                Mis propiedades
              </p>
              <Link href="/cliente/propiedades" className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
                Ver todas
              </Link>
            </div>

            {propiedades.map((prop, idx) => {
              const tieneProblemas = prop.incidentes_activos > 0
              return (
                <motion.div
                  key={prop.id_inmueble}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18 + idx * 0.05, type: 'spring', stiffness: 360, damping: 30 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href="/cliente/incidentes">
                    <div
                      className="flex items-center gap-3 rounded-xl p-3.5 border-l-[3px]"
                      style={{
                        background: tieneProblemas ? 'rgba(217,119,6,0.07)' : 'rgba(52,211,153,0.07)',
                        borderLeftColor: tieneProblemas ? 'rgba(217,119,6,0.6)' : 'rgba(52,211,153,0.6)',
                        border: `1px solid ${tieneProblemas ? 'rgba(217,119,6,0.15)' : 'rgba(52,211,153,0.15)'}`,
                        borderLeft: `3px solid ${tieneProblemas ? 'rgba(217,119,6,0.6)' : 'rgba(52,211,153,0.6)'}`,
                      }}
                    >
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: tieneProblemas ? 'rgba(217,119,6,0.15)' : 'rgba(52,211,153,0.15)' }}
                      >
                        <Building2
                          className="h-4 w-4"
                          style={{ color: tieneProblemas ? 'rgb(251,191,36)' : 'rgb(52,211,153)' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-200 truncate">{prop.tipo}</p>
                        <p className="text-xs text-neutral-600 truncate">{prop.direccion}</p>
                      </div>
                      {tieneProblemas ? (
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                          style={{ background: 'rgba(217,119,6,0.2)', color: 'rgb(251,191,36)' }}
                        >
                          {prop.incidentes_activos} activo{prop.incidentes_activos !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* ── SIN INMUEBLES ──────────────────────────────────────────── */}
        {totalInmuebles === 0 && (
          <motion.div variants={itemVariants}>
            <Link href="/cliente/propiedades">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="rounded-2xl p-5 flex items-center gap-3 border border-dashed border-white/[0.08]"
                style={{ background: 'rgba(255,255,255,0.025)' }}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <Home className="h-5 w-5 text-neutral-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-400">Registrá un inmueble primero</p>
                  <p className="text-xs text-neutral-600 mt-0.5">Es necesario antes de reportar incidentes</p>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-700 shrink-0" />
              </motion.div>
            </Link>
          </motion.div>
        )}

        <div className="h-2" />
      </motion.div>
    </div>
  )
}
