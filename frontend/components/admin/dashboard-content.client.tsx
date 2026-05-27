'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Users, Wrench, Clock, AlertCircle, CheckCircle, Activity,
  ArrowRight, Wifi, WifiOff, Send, MapPin,
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
  pendiente:             { badge: 'bg-amber-100 text-amber-800 ring-amber-200',   label: 'Pendiente' },
  asignacion_solicitada: { badge: 'bg-blue-100 text-blue-800 ring-blue-200',      label: 'Asig. Solicitada' },
  en_proceso:            { badge: 'bg-orange-100 text-orange-800 ring-orange-200', label: 'En Proceso' },
  finalizado:            { badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200', label: 'Finalizado' },
  resuelto:              { badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200', label: 'Finalizado' },
}

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
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-400 mt-0.5">Sistema de gestión ISBA</p>
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${
          conectado
            ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
            : 'text-slate-400 border-slate-200 bg-slate-50'
        }`}>
          {conectado
            ? <><Wifi className="h-3 w-3" /> En vivo</>
            : <><WifiOff className="h-3 w-3" /> Conectando...</>
          }
        </div>
      </div>

      {/* ── Stat cards — incidentes ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/dashboard/incidentes?tab=pendiente" className="group">
          <div className="rounded-2xl border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-50/70 to-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes</span>
              <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums text-amber-700">{stats.incidentesPendientes}</div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              Requieren asignación <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </Link>

        <Link href="/dashboard/incidentes?tab=en_proceso" className="group">
          <div className="rounded-2xl border-l-4 border-l-orange-400 bg-gradient-to-r from-orange-50/70 to-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Proceso</span>
              <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center">
                <Wrench className="h-3.5 w-3.5 text-orange-600" />
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums text-orange-700">{stats.incidentesEnProceso}</div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              Siendo atendidos <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </Link>

        <Link href="/dashboard/incidentes?tab=finalizado" className="group">
          <div className="rounded-2xl border-l-4 border-l-emerald-400 bg-gradient-to-r from-emerald-50/70 to-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Finalizados</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums text-emerald-700">{stats.incidentesResueltos}</div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              Completados <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </Link>
      </div>

      {/* ── Entidades: clientes + técnicos ───────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/clientes" className="group">
          <div className="rounded-2xl bg-gradient-to-r from-violet-50/60 to-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <div className="text-xl font-bold tabular-nums text-violet-700">{stats.clientes}</div>
              <p className="text-[11px] text-slate-400">Clientes activos</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/tecnicos" className="group">
          <div className="rounded-2xl bg-gradient-to-r from-blue-50/60 to-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold tabular-nums text-blue-700">{stats.tecnicos}</div>
              <p className="text-[11px] text-slate-400">Técnicos activos</p>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Notificaciones ────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-1">
          <NotificacionesPanel notificaciones={notificaciones} rol="admin" />
        </div>
      </div>

      {/* ── Actividad reciente ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
      </div>
    </div>
  )
}
