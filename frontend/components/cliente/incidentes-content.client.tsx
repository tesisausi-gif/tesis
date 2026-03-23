'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Plus, AlertCircle, Clock, Send, Wrench, CheckCircle,
  Bell, MapPin, ClipboardList, FileText,
} from 'lucide-react'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { createClient } from '@/shared/lib/supabase/client'
import type { Incidente } from '@/features/incidentes/incidentes.types'

interface IncidentesContentProps {
  incidentes: Incidente[]
  incidentesConPresupuestoPendiente: number[]
}

const STATUS_CONFIG: Record<string, {
  label: string
  borderColor: string
  pillBg: string
  pillText: string
  Icon: React.ElementType
}> = {
  pendiente:             { label: 'Pendiente',  borderColor: 'border-l-amber-400',  pillBg: 'bg-amber-100',  pillText: 'text-amber-700',  Icon: Clock },
  asignacion_solicitada: { label: 'Asignado',   borderColor: 'border-l-blue-400',   pillBg: 'bg-blue-100',   pillText: 'text-blue-700',   Icon: Send },
  en_proceso:            { label: 'En proceso', borderColor: 'border-l-orange-400', pillBg: 'bg-orange-100', pillText: 'text-orange-700', Icon: Wrench },
  resuelto:              { label: 'Finalizado',  borderColor: 'border-l-green-400',  pillBg: 'bg-green-100',  pillText: 'text-green-700',  Icon: CheckCircle },
  finalizado:            { label: 'Finalizado',  borderColor: 'border-l-green-400',  pillBg: 'bg-green-100',  pillText: 'text-green-700',  Icon: CheckCircle },
}

export function IncidentesContent({ incidentes, incidentesConPresupuestoPendiente }: IncidentesContentProps) {
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<string>('detalles')
  const [pendientesPresupuesto, setPendientesPresupuesto] = useState<Set<number>>(
    new Set(incidentesConPresupuestoPendiente)
  )
  const [filtro, setFiltro] = useState<string>('todos')

  // Realtime: escuchar cambios en presupuestos
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('presupuestos-cliente-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presupuestos' }, (payload) => {
        const next = payload.new as any
        const prev = payload.old as any
        const idIncidente: number | undefined = next?.id_incidente ?? prev?.id_incidente
        if (!idIncidente) return
        if (next?.estado_presupuesto === 'aprobado_admin') {
          setPendientesPresupuesto(s => new Set([...s, idIncidente]))
        } else if (prev?.estado_presupuesto === 'aprobado_admin') {
          setPendientesPresupuesto(s => { const n = new Set(s); n.delete(idIncidente); return n })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const abrirModal = (id: number, tab = 'detalles') => {
    setIncidenteSeleccionado(id)
    setModalTab(tab)
    setModalOpen(true)
    setPendientesPresupuesto(s => { const n = new Set(s); n.delete(id); return n })
  }

  const porEstado = {
    pendiente:             incidentes.filter(i => i.estado_actual === 'pendiente'),
    asignacion_solicitada: incidentes.filter(i => i.estado_actual === 'asignacion_solicitada'),
    en_proceso:            incidentes.filter(i => i.estado_actual === 'en_proceso'),
    resuelto:              incidentes.filter(i => i.estado_actual === 'resuelto' || i.estado_actual === 'finalizado'),
  }

  const incidentesFiltrados = filtro === 'todos'
    ? incidentes
    : filtro === 'resuelto'
      ? incidentes.filter(i => i.estado_actual === 'resuelto' || i.estado_actual === 'finalizado')
      : incidentes.filter(i => i.estado_actual === filtro)

  const filtros = [
    { id: 'todos',      label: 'Todos',       count: incidentes.length,           Icon: ClipboardList },
    { id: 'pendiente',  label: 'Pendiente',   count: porEstado.pendiente.length,  Icon: Clock },
    { id: 'en_proceso', label: 'En proceso',  count: porEstado.en_proceso.length, Icon: Wrench },
    { id: 'resuelto',   label: 'Finalizados', count: porEstado.resuelto.length,   Icon: CheckCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── Header ──────────────────────────────────── */}
      <div className="bg-white px-5 pt-6 pb-5 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Mis Incidentes</h1>
        <p className="text-sm text-gray-400 mb-4">Historial de incidentes reportados</p>
        <Link
          href="/cliente/incidentes/nuevo"
          className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white rounded-2xl py-4 text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          <Plus className="h-4 w-4" />
          Reportar Incidente
        </Link>
      </div>

      {incidentes.length === 0 ? (
        /* ── Empty state ──────────────────────────── */
        <div className="px-5 pt-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">Sin incidentes aún</h3>
          <p className="text-sm text-gray-400">
            Usá el botón de arriba para reportar un problema en tus inmuebles.
          </p>
        </div>
      ) : (
        <>
          {/* ── Stats strip ─────────────────────────── */}
          <div className="grid grid-cols-4 bg-white border-b border-gray-100">
            {[
              { label: 'Pendientes', count: porEstado.pendiente.length,             color: 'text-amber-500' },
              { label: 'Asignados',  count: porEstado.asignacion_solicitada.length, color: 'text-blue-500' },
              { label: 'En proceso', count: porEstado.en_proceso.length,            color: 'text-orange-500' },
              { label: 'Finaliz.',   count: porEstado.resuelto.length,              color: 'text-green-500' },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col items-center justify-center py-3 border-r border-gray-100 last:border-0">
                <span className={`text-xl font-bold ${stat.color}`}>{stat.count}</span>
                <span className="text-[9px] text-gray-400 font-medium leading-tight text-center mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* ── Filter chips ────────────────────────── */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b border-gray-100 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filtros.map(({ id, label, count, Icon }) => {
              const active = filtro === id
              return (
                <button
                  key={id}
                  onClick={() => setFiltro(id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                    active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-px ${
                      active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Incident list ────────────────────────── */}
          <div className="px-4 pt-3 space-y-3">
            {incidentesFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No hay incidentes en este estado
              </div>
            ) : (
              incidentesFiltrados.map(incidente => {
                const cfg = STATUS_CONFIG[incidente.estado_actual] ?? STATUS_CONFIG.pendiente
                const { Icon } = cfg
                const inmueble = incidente.inmuebles
                const direccionPartes = inmueble
                  ? [inmueble.calle, inmueble.altura, inmueble.piso && `Piso ${inmueble.piso}`, inmueble.dpto && `Dpto ${inmueble.dpto}`].filter(Boolean).join(' ')
                  : ''
                const ubicacion = inmueble ? [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ') : ''
                const direccion = ubicacion ? `${direccionPartes}, ${ubicacion}` : direccionPartes || 'Sin dirección'
                const tienePresupuestoPendiente = pendientesPresupuesto.has(incidente.id_incidente)

                return (
                  <div
                    key={incidente.id_incidente}
                    className={`bg-white rounded-2xl border-l-4 shadow-sm overflow-hidden ${cfg.borderColor}`}
                  >
                    {/* Presupuesto listo banner */}
                    {tienePresupuestoPendiente && (
                      <div className="flex items-center gap-2 bg-amber-500 px-4 py-2">
                        <Bell className="h-3.5 w-3.5 text-white animate-pulse flex-shrink-0" />
                        <span className="text-xs font-bold text-white">Presupuesto listo — tocá para revisar</span>
                      </div>
                    )}

                    <div className="px-4 py-4">
                      {/* Row 1: ID + status */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-gray-900">Incidente #{incidente.id_incidente}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.pillBg} ${cfg.pillText}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                      </div>

                      {/* Row 2: Description */}
                      <p className="text-sm text-gray-700 line-clamp-2 mb-3 leading-snug">
                        {incidente.descripcion_problema}
                      </p>

                      {/* Row 3: Address + date */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-xs text-gray-400 min-w-0">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{direccion}</span>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {format(new Date(incidente.fecha_registro), 'dd MMM yy', { locale: es })}
                        </span>
                      </div>

                      {/* Row 4: Category pill */}
                      {incidente.categoria && (
                        <div className="mt-2">
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {incidente.categoria}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── Acciones — 3 chips ─────────────── */}
                    <div className="flex border-t border-gray-100">
                      <button
                        onClick={() => abrirModal(incidente.id_incidente, 'detalles')}
                        className="flex-1 flex flex-col items-center gap-0.5 py-3 active:bg-gray-50 transition-colors border-r border-gray-100"
                      >
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span className="text-[10px] font-semibold text-gray-600">Detalles</span>
                      </button>
                      <button
                        onClick={() => abrirModal(incidente.id_incidente, 'timeline')}
                        className="flex-1 flex flex-col items-center gap-0.5 py-3 active:bg-gray-50 transition-colors border-r border-gray-100"
                      >
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-semibold text-blue-500">Timeline</span>
                      </button>
                      <button
                        onClick={() => tienePresupuestoPendiente && abrirModal(incidente.id_incidente, 'presupuesto')}
                        disabled={!tienePresupuestoPendiente}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
                          tienePresupuestoPendiente
                            ? 'active:bg-amber-50 text-amber-500'
                            : 'opacity-30 cursor-not-allowed text-gray-400'
                        }`}
                      >
                        <Bell className={`w-4 h-4 ${tienePresupuestoPendiente ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-semibold">
                          {tienePresupuestoPendiente ? 'Presupuesto' : 'Gestión'}
                        </span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="cliente"
        initialTab={modalTab}
      />
    </div>
  )
}
