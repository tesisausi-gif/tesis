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
import { ESTADO_INCIDENTE_CONFIG, SUB_ESTADO_EN_PROCESO_CONFIG } from '@/shared/utils/colors'
import type { Incidente } from '@/features/incidentes/incidentes.types'

interface IncidentesContentProps {
  incidentes: Incidente[]
  incidentesConPresupuestoPendiente: number[]
  incidentesConConformidadSubida?: number[]
}

const ICON_BY_ESTADO: Record<string, React.ElementType> = {
  pendiente:             Clock,
  asignacion_solicitada: Send,
  en_proceso:            Wrench,
  resuelto:              CheckCircle,
  finalizado:            CheckCircle,
}

export function IncidentesContent({ incidentes, incidentesConPresupuestoPendiente, incidentesConConformidadSubida = [] }: IncidentesContentProps) {
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<string>('detalles')
  const [pendientesPresupuesto, setPendientesPresupuesto] = useState<Set<number>>(
    new Set(incidentesConPresupuestoPendiente)
  )
  const [filtro, setFiltro] = useState<string>('todos')
  const [subFiltro, setSubFiltro] = useState<string>('todos')

  useEffect(() => { setSubFiltro('todos') }, [filtro])

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

  // asignacion_solicitada se agrupa con pendiente — el cliente no necesita ver esa distinción
  const porEstado = {
    pendiente: incidentes.filter(i => i.estado_actual === 'pendiente' || i.estado_actual === 'asignacion_solicitada'),
    en_proceso: incidentes.filter(i => i.estado_actual === 'en_proceso'),
    resuelto:   incidentes.filter(i => i.estado_actual === 'resuelto' || i.estado_actual === 'finalizado'),
  }

  const incidentesFiltrados = filtro === 'todos'
    ? incidentes
    : filtro === 'pendiente'
      ? incidentes.filter(i => i.estado_actual === 'pendiente' || i.estado_actual === 'asignacion_solicitada')
      : filtro === 'resuelto'
        ? incidentes.filter(i => i.estado_actual === 'resuelto' || i.estado_actual === 'finalizado')
        : incidentes.filter(i => i.estado_actual === filtro)

  const filtros = [
    { id: 'todos',      label: 'Todos',       count: incidentes.length,            Icon: ClipboardList },
    { id: 'pendiente',  label: 'Pendiente',   count: porEstado.pendiente.length,   Icon: Clock },
    { id: 'en_proceso', label: 'En proceso',  count: porEstado.en_proceso.length,  Icon: Wrench },
    { id: 'resuelto',   label: 'Finalizados', count: porEstado.resuelto.length,    Icon: CheckCircle },
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
          {/* ── Filter chips ────────────────────────── */}
          <div className="flex gap-1 px-4 py-3 overflow-x-auto bg-slate-100 border-b border-gray-100 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filtros.map(({ id, label, count, Icon }) => {
              const active = filtro === id
              return (
                <button
                  key={id}
                  onClick={() => setFiltro(id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-px ${
                      active ? 'bg-slate-200 text-slate-700' : 'bg-slate-200/60 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Incident list ────────────────────────── */}
          {(() => {
            const renderCard = (incidente: (typeof incidentesFiltrados)[0]) => {
              const estadoDisplay = incidente.estado_actual === 'asignacion_solicitada' ? 'pendiente' : incidente.estado_actual
              const estadoCfg = ESTADO_INCIDENTE_CONFIG[estadoDisplay] ?? ESTADO_INCIDENTE_CONFIG.pendiente
              const Icon = ICON_BY_ESTADO[estadoDisplay] ?? Clock
              const inmueble = incidente.inmuebles
              const dir = [inmueble?.calle, inmueble?.altura, inmueble?.piso && `Piso ${inmueble.piso}`, inmueble?.dpto && `Dpto ${inmueble.dpto}`].filter(Boolean).join(' ')
              const ubi = inmueble ? [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ') : ''
              const direccion = ubi ? `${dir}, ${ubi}` : dir || 'Sin dirección'
              const tienePresupuestoPendiente = pendientesPresupuesto.has(incidente.id_incidente)
              const tieneConformidadSubida = incidentesConConformidadSubida.includes(incidente.id_incidente)

              return (
                <div key={incidente.id_incidente} className={`rounded-2xl border-l-4 shadow-sm overflow-hidden hover:shadow-md transition-shadow bg-gradient-to-r ${estadoCfg.bgGradient} to-white ${estadoCfg.stripe}`}>
                  {tienePresupuestoPendiente && (
                    <div className="flex items-center gap-2 bg-amber-500 px-4 py-2">
                      <Bell className="h-3.5 w-3.5 text-white animate-pulse flex-shrink-0" />
                      <span className="text-xs font-bold text-white">Presupuesto listo — tocá para revisar</span>
                    </div>
                  )}
                  <div className="px-4 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-slate-400 shrink-0 tabular-nums">#{incidente.id_incidente}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset shrink-0 ${estadoCfg.badge}`}>
                        <Icon className="w-2.5 h-2.5" />
                        {estadoCfg.labelCliente}
                      </span>
                    </div>
                    {incidente.estado_actual === 'en_proceso' && !tienePresupuestoPendiente && (() => {
                      const subKey = tieneConformidadSubida ? 'completada_pendiente' as const : 'en_curso' as const
                      const subcfg = SUB_ESTADO_EN_PROCESO_CONFIG[subKey]
                      return (
                        <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg mb-2 ring-1 ring-inset ${subcfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${subcfg.groupDotCls}`} />
                          {subcfg.labelGrupo}
                        </div>
                      )
                    })()}
                    <p className="text-[15px] font-semibold text-slate-800 line-clamp-2 mb-2.5 leading-snug">{incidente.descripcion_problema}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{direccion}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex-shrink-0 tabular-nums">
                        {incidente.fecha_registro ? format(new Date(incidente.fecha_registro), 'dd MMM yy', { locale: es }) : ''}
                      </span>
                    </div>
                    {incidente.categoria && (
                      <div className="mt-2">
                        <span className="text-[10px] font-medium text-slate-500 bg-white/70 border border-slate-200 px-2 py-0.5 rounded-full">{incidente.categoria}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex border-t border-white/60">
                    <button onClick={() => abrirModal(incidente.id_incidente, 'detalles')} className="flex-1 flex flex-col items-center gap-0.5 py-3 hover:bg-white/40 active:bg-white/60 transition-colors border-r border-white/60">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-[10px] font-semibold text-slate-500">Ver</span>
                    </button>
                    <button onClick={() => abrirModal(incidente.id_incidente, 'timeline')} className="flex-1 flex flex-col items-center gap-0.5 py-3 hover:bg-white/40 active:bg-white/60 transition-colors border-r border-white/60">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] font-semibold text-blue-500">Timeline</span>
                    </button>
                    <button onClick={() => tienePresupuestoPendiente && abrirModal(incidente.id_incidente, 'presupuesto')} disabled={!tienePresupuestoPendiente} className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${tienePresupuestoPendiente ? 'hover:bg-amber-50/60 active:bg-amber-100/60 text-amber-600' : 'opacity-30 cursor-not-allowed text-slate-400'}`}>
                      <Bell className={`w-4 h-4 ${tienePresupuestoPendiente ? 'animate-pulse' : ''}`} />
                      <span className="text-[10px] font-semibold">{tienePresupuestoPendiente ? 'Aprobar presup.' : 'Sin acción'}</span>
                    </button>
                  </div>
                </div>
              )
            }

            if (incidentesFiltrados.length === 0) {
              return <div className="px-4 pt-3 text-center py-12 text-gray-400 text-sm">No hay incidentes en este estado</div>
            }

            if (filtro === 'en_proceso') {
              const grupos = ([
                {
                  subKey: 'presupuesto_cliente' as const,
                  items: incidentesFiltrados.filter(i => pendientesPresupuesto.has(i.id_incidente)),
                },
                {
                  subKey: 'completada_pendiente' as const,
                  items: incidentesFiltrados.filter(i => !pendientesPresupuesto.has(i.id_incidente) && incidentesConConformidadSubida.includes(i.id_incidente)),
                },
                {
                  subKey: 'en_curso' as const,
                  items: incidentesFiltrados.filter(i => !pendientesPresupuesto.has(i.id_incidente) && !incidentesConConformidadSubida.includes(i.id_incidente)),
                },
              ]).filter(g => g.items.length > 0)

              const gruposFiltrados = grupos.filter(g => subFiltro === 'todos' || g.subKey === subFiltro)

              return (
                <div className="px-4 pt-3 space-y-4">
                  {/* Sub-filtros */}
                  {grupos.length > 1 && (
                    <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setSubFiltro('todos')}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          subFiltro === 'todos' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                        }`}
                      >
                        Todos
                        <span className={`text-[10px] font-bold rounded-full px-1.5 py-px ${subFiltro === 'todos' ? 'bg-slate-200 text-slate-700' : 'bg-slate-200/60 text-slate-400'}`}>
                          {incidentesFiltrados.length}
                        </span>
                      </button>
                      {grupos.map(({ subKey, items }) => {
                        const gcfg = SUB_ESTADO_EN_PROCESO_CONFIG[subKey]
                        const active = subFiltro === subKey
                        return (
                          <button
                            key={subKey}
                            onClick={() => setSubFiltro(subKey)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                            }`}
                          >
                            {gcfg.labelBadge}
                            <span className={`text-[10px] font-bold rounded-full px-1.5 py-px ${active ? 'bg-slate-200 text-slate-700' : 'bg-slate-200/60 text-slate-400'}`}>
                              {items.length}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <div className="space-y-6">
                    {gruposFiltrados.map(grupo => {
                      const gcfg = SUB_ESTADO_EN_PROCESO_CONFIG[grupo.subKey]
                      return (
                        <div key={grupo.subKey}>
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border mb-3 ${gcfg.groupHeaderCls}`}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${gcfg.groupDotCls}`} />
                            <span className="text-xs font-bold">{gcfg.labelGrupo}</span>
                            <span className="text-xs font-semibold opacity-50">({grupo.items.length})</span>
                          </div>
                          <div className="space-y-3">{grupo.items.map(renderCard)}</div>
                        </div>
                      )
                    })}
                    {gruposFiltrados.length === 0 && (
                      <div className="text-center py-12 text-gray-400 text-sm">No hay incidentes en este sub-estado</div>
                    )}
                  </div>
                </div>
              )
            }

            return <div className="px-4 pt-3 space-y-3">{incidentesFiltrados.map(renderCard)}</div>
          })()}
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
