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

// ── Dark stat card ────────────────────────────────────────────────────────────

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
        {/* Moving halo */}
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
          {/* Rotating ray */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[calc(1rem-1px)] blur-3xl"
            style={{ background: glowColor, opacity: 0.06 }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          />

          {/* Top accent line */}
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
                textShadow: [
                  `0 0 20px ${glowColor}`,
                  '0 0 4px transparent',
                  `0 0 20px ${glowColor}`,
                ],
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

// ── Stagger variants ──────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
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
    <div className="pb-4" style={{ background: '#07070b', minHeight: '100vh' }}>

      {/* ── Background grid ───────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10">

        {/* ── HERO SECTION ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden px-5 pt-8 pb-8 mb-1"
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

          <div className="relative flex items-start gap-4">
            {/* Avatar */}
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border"
              style={{ background: 'rgba(217,119,6,0.12)', borderColor: 'rgba(217,119,6,0.25)' }}
            >
              <span className="text-base font-black text-amber-300">{iniciales}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/70 mb-1">
                Bienvenido
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white leading-tight">
                  {nombre} {apellido}
                </h1>
                {calificacionPromedio != null && (
                  <motion.span
                    className="inline-flex items-center gap-1 text-xs font-bold text-yellow-400 px-2.5 py-1 rounded-full border"
                    style={{ background: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.2)' }}
                    animate={{ boxShadow: ['0 0 12px rgba(250,204,21,0.15)', '0 0 4px transparent', '0 0 12px rgba(250,204,21,0.15)'] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {calificacionPromedio.toFixed(1)}
                  </motion.span>
                )}
              </div>
              {especialidadesLabel && (
                <p className="text-xs text-neutral-500 mt-1">{especialidadesLabel}</p>
              )}
            </div>
          </div>
        </motion.div>

        <div className="px-4 space-y-3 pt-3">

          {/* ── ALERT ─────────────────────────────────────────────────── */}
          {trabajosPendientes > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring' as const, stiffness: 260, damping: 22 }}
            >
              <Link href="/tecnico/trabajos">
                <div
                  className="rounded-2xl p-4 flex items-center gap-3 border"
                  style={{ background: 'rgba(217,119,6,0.1)', borderColor: 'rgba(217,119,6,0.25)' }}
                >
                  <motion.div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(217,119,6,0.2)' }}
                    animate={{ boxShadow: ['0 0 16px rgba(217,119,6,0.4)', '0 0 4px transparent', '0 0 16px rgba(217,119,6,0.4)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Bell className="h-4 w-4 text-amber-400" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-300">
                      {trabajosPendientes === 1
                        ? '1 trabajo listo para subir conformidad'
                        : `${trabajosPendientes} trabajos listos para subir conformidad`}
                    </p>
                    <p className="text-xs text-amber-500/70 mt-0.5">Tocá para ir a Trabajos →</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* ── STAT CARDS ────────────────────────────────────────────── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 gap-2.5"
            style={{ height: '120px' }}
          >
            <motion.div variants={itemVariants} className="h-full">
              <DarkStatCard
                value={cntAsignado}
                label="Asignaciones"
                icon={<UserCheck className="h-3 w-3 text-sky-400" />}
                glowColor="rgba(56,189,248,0.8)"
                href="/tecnico/disponibles"
                index={0}
              />
            </motion.div>

            <motion.div variants={itemVariants} className="h-full">
              <DarkStatCard
                value={cntEnProceso}
                label="En proceso"
                icon={<Wrench className="h-3 w-3 text-orange-400" />}
                glowColor="rgba(251,146,60,0.8)"
                href="/tecnico/trabajos"
                index={1}
              />
            </motion.div>

            <motion.div variants={itemVariants} className="h-full">
              <DarkStatCard
                value={cntFinalizado}
                label="Finalizados"
                icon={<CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                glowColor="rgba(52,211,153,0.8)"
                href="/tecnico/trabajos?filtro=resueltos"
                index={2}
              />
            </motion.div>
          </motion.div>

          {/* ── CTA: ir a disponibles ─────────────────────────────────── */}
          {cntAsignado > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, type: 'spring' as const, stiffness: 260, damping: 24 }}
            >
              <Link href="/tecnico/disponibles">
                <motion.div
                  className="rounded-2xl p-4 flex items-center justify-between border"
                  style={{
                    background: 'linear-gradient(130deg, rgba(217,119,6,0.18) 0%, rgba(180,83,9,0.12) 100%)',
                    borderColor: 'rgba(217,119,6,0.3)',
                  }}
                  whileTap={{ scale: 0.98 }}
                  animate={{ boxShadow: ['0 0 20px rgba(217,119,6,0.1)', '0 0 40px rgba(217,119,6,0.2)', '0 0 20px rgba(217,119,6,0.1)'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <div>
                    <p className="text-sm font-bold text-amber-300">
                      Tenés {cntAsignado} {cntAsignado === 1 ? 'asignación disponible' : 'asignaciones disponibles'}
                    </p>
                    <p className="text-xs text-amber-500/70 mt-0.5">
                      Revisá los detalles y agendá tu visita
                    </p>
                  </div>
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(217,119,6,0.2)' }}
                  >
                    <ArrowRight className="h-4 w-4 text-amber-400" />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          )}

          {/* ── NOTIFICATIONS ─────────────────────────────────────────── */}
          <div
            className="rounded-2xl border border-white/[0.07] overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="px-4 pt-4 pb-2">
              <NotificacionesPanel notificaciones={notificaciones} rol="tecnico" />
            </div>
          </div>

          {/* ── AGENDA ────────────────────────────────────────────────── */}
          <AgendaTecnico franjas={compromisos} />

        </div>
      </div>
    </div>
  )
}
