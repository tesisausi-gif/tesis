'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Plus, ChevronRight, Calendar, Clock,
  AlertCircle, CreditCard, Building2, CheckCircle2,
  Home, FileText, Zap, Wrench,
} from 'lucide-react'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/shared/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Animated number counter ───────────────────────────────────────────────────

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

// ── Next visit label ──────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

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
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="space-y-3 -mt-4"
    >

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <motion.div
        variants={cardVariants}
        className="-mx-4 px-5 pt-8 pb-9 relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, #1c1a17 0%, #252018 60%, #1a1f2e 100%)',
        }}
      >
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.6) 0%, transparent 70%)' }}
        />

        <div className="relative">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-amber-500/70 mb-2.5">
            {fechaHoy}
          </p>
          <h1 className="text-[1.85rem] font-black text-white leading-none tracking-tighter mb-3">
            Hola, {nombre}.
          </h1>

          {todoEnOrden ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-900/35 border border-emerald-600/30 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Todo en orden
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 bg-amber-900/35 border border-amber-600/30 px-3 py-1.5 rounded-full">
              <Zap className="h-3 w-3" />
              {stats.activos > 0
                ? `${stats.activos} incidente${stats.activos !== 1 ? 's' : ''} activo${stats.activos !== 1 ? 's' : ''}`
                : 'Hay acciones pendientes'}
            </span>
          )}
        </div>
      </motion.div>

      {/* ── BANNERS DE ACCIÓN ─────────────────────────────────────────────── */}
      {presupuestosPendientes > 0 && (
        <motion.div variants={cardVariants}>
          <Link href="/cliente/presupuestos">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-2xl p-4 border-l-[3px] border-l-amber-500 border border-amber-200/50 bg-gradient-to-r from-amber-50/80 to-white"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">
                  {presupuestosPendientes === 1
                    ? 'Tenés un presupuesto para revisar'
                    : `${presupuestosPendientes} presupuestos para revisar`}
                </p>
                <p className="text-xs text-amber-700/70">Tu aprobación está pendiente</p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
            </motion.div>
          </Link>
        </motion.div>
      )}

      {pagosPendientes > 0 && (
        <motion.div variants={cardVariants}>
          <Link href="/cliente/pagos">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-2xl p-4 border-l-[3px] border-l-rose-500 border border-rose-200/50 bg-gradient-to-r from-rose-50/70 to-white"
            >
              <div className="h-9 w-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rose-900">
                  {pagosPendientes === 1 ? '1 pago pendiente' : `${pagosPendientes} pagos pendientes`}
                </p>
                <p className="text-xs text-rose-700/70">Completá el pago del servicio</p>
              </div>
              <ChevronRight className="h-4 w-4 text-rose-400 shrink-0" />
            </motion.div>
          </Link>
        </motion.div>
      )}

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants} className="grid grid-cols-3 gap-2">
        {[
          { label: 'Activos',  value: stats.activos,     Icon: AlertCircle,  iconColor: 'text-amber-500',   tab: 'pendiente' },
          { label: 'En curso', value: stats.en_proceso,  Icon: Wrench,       iconColor: 'text-blue-500',    tab: 'en_proceso' },
          { label: 'Cerrados', value: stats.finalizados, Icon: CheckCircle2, iconColor: 'text-emerald-500', tab: 'finalizado' },
        ].map(({ label, value, Icon, iconColor, tab }) => (
          <Link key={label} href={`/cliente/incidentes?tab=${tab}`} className="block">
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

      {/* ── PRÓXIMA VISITA ────────────────────────────────────────────────── */}
      {proximaVisita && (
        <motion.div variants={cardVariants}>
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(140deg, #0f2044 0%, #152854 100%)' }}
          >
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)',
                transform: 'translate(35%, -35%)',
              }}
            />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-blue-300" />
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-blue-300">
                    Próxima visita
                  </p>
                </div>
                {/* Large day number decoration */}
                <div className="text-right">
                  <p className="text-[2.2rem] font-black leading-none text-blue-400/25">
                    {format(parseISO(proximaVisita.fecha), 'd')}
                  </p>
                  <p className="text-[10px] uppercase font-black tracking-widest text-blue-400/25 -mt-1">
                    {format(parseISO(proximaVisita.fecha), 'MMM', { locale: es })}
                  </p>
                </div>
              </div>

              <p className="text-xl font-black text-white capitalize tracking-tight leading-snug">
                {labelVisitaFecha(proximaVisita.fecha)}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="h-3 w-3 text-blue-300/60" />
                <p className="text-xs text-blue-200/70">
                  {proximaVisita.hora_inicio}
                  {proximaVisita.hora_fin ? ` — ${proximaVisita.hora_fin}` : ''}
                </p>
              </div>

              {proximaVisita.inmueble && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-blue-200/50 truncate">{proximaVisita.inmueble}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── CTA REPORTAR ─────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants}>
        <Link href="/cliente/incidentes/nuevo">
          <motion.div
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            className="rounded-2xl p-5 flex items-center justify-between"
            style={{ background: 'linear-gradient(130deg, #d97706 0%, #b45309 100%)' }}
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[13px] font-black text-white uppercase tracking-wide leading-tight">
                  Reportar incidente
                </p>
                <p className="text-xs text-amber-200/70 mt-0.5">Informá un problema en tu inmueble</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/50 shrink-0" />
          </motion.div>
        </Link>
      </motion.div>

      {/* ── VER INCIDENTES (link secundario) ─────────────────────────────── */}
      <motion.div variants={cardVariants}>
        <Link href="/cliente/incidentes">
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl px-5 py-4 flex items-center justify-between bg-white border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-gray-500" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Ver todos mis incidentes</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
          </motion.div>
        </Link>
      </motion.div>

      {/* ── MIS PROPIEDADES ──────────────────────────────────────────────── */}
      {propiedades.length > 0 && (
        <motion.div variants={cardVariants} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em]">
              Mis propiedades
            </p>
            <Link href="/cliente/propiedades" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
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
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/cliente/incidentes">
                  <div className={cn(
                    'flex items-center gap-3 bg-white rounded-xl p-3.5 border-l-[3px] border border-r-gray-100 border-t-gray-100 border-b-gray-100',
                    tieneProblemas ? 'border-l-amber-400' : 'border-l-emerald-400',
                  )}>
                    <div className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                      tieneProblemas ? 'bg-amber-50' : 'bg-emerald-50',
                    )}>
                      <Building2 className={cn(
                        'h-4 w-4',
                        tieneProblemas ? 'text-amber-500' : 'text-emerald-500',
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{prop.tipo}</p>
                      <p className="text-xs text-gray-400 truncate">{prop.direccion}</p>
                    </div>
                    {tieneProblemas ? (
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        {prop.incidentes_activos} activo{prop.incidentes_activos !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* ── SIN INMUEBLES ─────────────────────────────────────────────────── */}
      {totalInmuebles === 0 && (
        <motion.div variants={cardVariants}>
          <Link href="/cliente/propiedades">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="rounded-2xl border-2 border-dashed border-gray-200 p-5 flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Home className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600">Registrá un inmueble primero</p>
                <p className="text-xs text-gray-400 mt-0.5">Es necesario antes de reportar incidentes</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
            </motion.div>
          </Link>
        </motion.div>
      )}

      <div className="h-2" />
    </motion.div>
  )
}
