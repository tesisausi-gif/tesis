'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertCircle, Search, Clock, Send, Wrench, CheckCircle,
  MapPin, FileText, ClipboardList, RefreshCw, XCircle, Bell,
  User,
} from 'lucide-react'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { GestionarPendienteModal } from '@/components/admin/gestionar-pendiente-modal'
import type { IncidenteConClienteAdmin } from '@/features/incidentes/incidentes.types'

interface IncidentesAdminContentProps {
  incidentes: IncidenteConClienteAdmin[]
}

// ── Status config — card border + pill colors ─────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string
  borderColor: string
  pillBg: string
  pillText: string
  Icon: React.ElementType
}> = {
  pendiente:             { label: 'Pendiente',        borderColor: 'border-l-amber-400',  pillBg: 'bg-amber-100',  pillText: 'text-amber-700',  Icon: Clock },
  asignacion_solicitada: { label: 'Asig. Solicitada', borderColor: 'border-l-blue-400',   pillBg: 'bg-blue-100',   pillText: 'text-blue-700',   Icon: Send },
  en_proceso:            { label: 'En Proceso',       borderColor: 'border-l-orange-400', pillBg: 'bg-orange-100', pillText: 'text-orange-700', Icon: Wrench },
  finalizado:            { label: 'Finalizado',       borderColor: 'border-l-green-400',  pillBg: 'bg-green-100',  pillText: 'text-green-700',  Icon: CheckCircle },
  resuelto:              { label: 'Finalizado',       borderColor: 'border-l-green-400',  pillBg: 'bg-green-100',  pillText: 'text-green-700',  Icon: CheckCircle },
}

// ── Acción pendiente — qué debe hacer el admin ahora mismo ───────────────────
type AccionPendiente =
  | { tipo: 'asignar' }
  | { tipo: 'reasignar' }
  | { tipo: 'presupuesto' }
  | { tipo: 'conformidad' }
  | { tipo: 'en_curso' }
  | { tipo: 'finalizado' }

function getAccionPendiente(inc: IncidenteConClienteAdmin): AccionPendiente {
  const estado = inc.estado_actual
  if (estado === 'pendiente') return { tipo: 'asignar' }
  if (estado === 'asignacion_solicitada') {
    const tieneRechazada = inc.asignaciones_tecnico?.some(a => a.estado_asignacion === 'rechazada')
    if (tieneRechazada) return { tipo: 'reasignar' }
    return { tipo: 'en_curso' }
  }
  if (estado === 'en_proceso') {
    const presPendiente = inc.presupuestos?.find(p => p.estado_presupuesto === 'enviado')
    if (presPendiente) return { tipo: 'presupuesto' }
    const confPendiente = inc.conformidades?.find(c => c.url_documento && !c.esta_firmada && !c.esta_rechazada)
    if (confPendiente) return { tipo: 'conformidad' }
    return { tipo: 'en_curso' }
  }
  if (estado === 'finalizado' || estado === 'resuelto') return { tipo: 'finalizado' }
  return { tipo: 'en_curso' }
}

const ACCION_CONFIG: Record<AccionPendiente['tipo'], {
  label: string
  Icon: React.ElementType
  activeColor: string
  pulse: boolean
  disabled: boolean
}> = {
  asignar:     { label: 'Asignar',     Icon: Wrench,        activeColor: 'text-blue-600',   pulse: false, disabled: false },
  reasignar:   { label: 'Reasignar',   Icon: RefreshCw,     activeColor: 'text-orange-600', pulse: false, disabled: false },
  presupuesto: { label: 'Presupuesto', Icon: FileText,      activeColor: 'text-amber-600',  pulse: true,  disabled: false },
  conformidad: { label: 'Conformidad', Icon: ClipboardList, activeColor: 'text-purple-600', pulse: true,  disabled: false },
  en_curso:    { label: 'En Curso',    Icon: Clock,         activeColor: 'text-gray-300',   pulse: false, disabled: true },
  finalizado:  { label: 'Finalizado',  Icon: CheckCircle,   activeColor: 'text-gray-300',   pulse: false, disabled: true },
}

function formatFecha(raw: string | null | undefined): string {
  if (!raw) return ''
  try {
    const normalized = raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw) ? raw : raw + 'Z'
    const d = new Date(normalized)
    if (isNaN(d.getTime())) return ''
    return format(d, 'dd MMM yy', { locale: es })
  } catch {
    return ''
  }
}

export function IncidentesAdminContent({ incidentes }: IncidentesAdminContentProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState('detalles')
  const [modalGestionarOpen, setModalGestionarOpen] = useState(false)
  const [incidenteParaGestionar, setIncidenteParaGestionar] = useState<IncidenteConClienteAdmin | null>(null)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const highlightRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel('incidentes-admin-cards')
      // notificaciones: el admin siempre puede leer esta tabla → dispara refresh cuando llega un nuevo incidente
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, () => router.refresh())
      // cambios en tablas relacionadas que el admin puede leer vía RLS
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asignaciones_tecnico' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presupuestos' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conformidades' }, () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [])

  // URL params: tab + highlight
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setFiltro(tab)

    const id = searchParams.get('highlight')
    if (!id) return
    const numId = parseInt(id)
    setHighlightId(numId)
    setTimeout(() => {
      highlightRefs.current.get(numId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setHighlightId(null), 2200)
    }, 300)
  }, [])

  const abrirModal = (id: number, tab = 'detalles') => {
    setIncidenteSeleccionado(id)
    setModalTab(tab)
    setModalOpen(true)
  }

  const handleGestionar = (inc: IncidenteConClienteAdmin, accion: AccionPendiente) => {
    if (accion.tipo === 'asignar' || accion.tipo === 'reasignar') {
      setIncidenteParaGestionar(inc)
      setModalGestionarOpen(true)
    } else if (accion.tipo === 'presupuesto') {
      abrirModal(inc.id_incidente, 'presupuesto_admin')
    } else if (accion.tipo === 'conformidad') {
      abrirModal(inc.id_incidente, 'conformidad_admin')
    }
  }

  // Stats
  const porEstado = {
    pendiente:             incidentes.filter(i => i.estado_actual === 'pendiente'),
    asignacion_solicitada: incidentes.filter(i => i.estado_actual === 'asignacion_solicitada'),
    en_proceso:            incidentes.filter(i => i.estado_actual === 'en_proceso'),
    finalizado:            incidentes.filter(i => i.estado_actual === 'finalizado' || i.estado_actual === 'resuelto'),
  }

  const filtros = [
    { id: 'todos',                label: 'Todos',        count: incidentes.length,                      Icon: AlertCircle },
    { id: 'pendiente',            label: 'Pendientes',   count: porEstado.pendiente.length,             Icon: Clock },
    { id: 'asignacion_solicitada',label: 'Asig. Sol.',   count: porEstado.asignacion_solicitada.length, Icon: Send },
    { id: 'en_proceso',           label: 'En Proceso',   count: porEstado.en_proceso.length,            Icon: Wrench },
    { id: 'finalizado',           label: 'Finalizados',  count: porEstado.finalizado.length,            Icon: CheckCircle },
  ]

  // Filter by estado + search
  const incidentesFiltrados = incidentes.filter(inc => {
    const estadoMatch = filtro === 'todos'
      ? true
      : filtro === 'finalizado'
        ? (inc.estado_actual === 'finalizado' || inc.estado_actual === 'resuelto')
        : inc.estado_actual === filtro

    if (!estadoMatch) return false

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      const matchId = inc.id_incidente.toString().includes(q)
      const matchDesc = inc.descripcion_problema.toLowerCase().includes(q)
      const matchCliente = `${inc.clientes?.nombre ?? ''} ${inc.clientes?.apellido ?? ''}`.toLowerCase().includes(q)
      const matchDir = `${inc.inmuebles?.calle ?? ''} ${inc.inmuebles?.altura ?? ''}`.toLowerCase().includes(q)
      if (!matchId && !matchDesc && !matchCliente && !matchDir) return false
    }

    return true
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Incidentes</h1>
        <p className="text-gray-600 mt-1">Administrá y gestioná todos los incidentes reportados</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {[
          { label: 'Pendientes',   count: porEstado.pendiente.length,             color: 'text-amber-500' },
          { label: 'Asig. Sol.',   count: porEstado.asignacion_solicitada.length, color: 'text-blue-500' },
          { label: 'En Proceso',   count: porEstado.en_proceso.length,            color: 'text-orange-500' },
          { label: 'Finalizados',  count: porEstado.finalizado.length,            color: 'text-green-500' },
        ].map((stat, i) => (
          <div key={stat.label} className={`flex flex-col items-center justify-center py-4 ${i < 3 ? 'border-r border-gray-100' : ''}`}>
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.count}</span>
            <span className="text-[10px] text-gray-400 font-medium leading-tight text-center mt-0.5">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Search + Filter chips */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por ID, descripción, cliente o dirección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      </div>

      {/* Cards list */}
      {incidentesFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">
            {busqueda ? 'Sin resultados para esa búsqueda' : 'No hay incidentes en este estado'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidentesFiltrados.map(inc => {
            const cfg = STATUS_CONFIG[inc.estado_actual] ?? STATUS_CONFIG.pendiente
            const { Icon } = cfg
            const accion = getAccionPendiente(inc)
            const accionCfg = ACCION_CONFIG[accion.tipo]
            const isHighlighted = inc.id_incidente === highlightId

            const inmueble = inc.inmuebles
            const direccionPartes = inmueble
              ? [inmueble.calle, inmueble.altura].filter(Boolean).join(' ')
              : ''
            const ubicacion = inmueble
              ? [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ')
              : ''
            const direccion = ubicacion ? `${direccionPartes}, ${ubicacion}` : direccionPartes || 'Sin dirección'

            const tecnicoAsignado = inc.asignaciones_tecnico?.find(a =>
              ['aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion)
            )?.tecnicos

            const rechazadaRecientemente = inc.estado_actual === 'asignacion_solicitada' &&
              inc.asignaciones_tecnico?.some(a => a.estado_asignacion === 'rechazada')

            return (
              <div
                key={inc.id_incidente}
                ref={(el) => {
                  if (el) highlightRefs.current.set(inc.id_incidente, el)
                  else highlightRefs.current.delete(inc.id_incidente)
                }}
                className={`bg-white rounded-2xl border-l-4 shadow-sm overflow-hidden transition-colors duration-[1800ms] ${cfg.borderColor} ${
                  isHighlighted ? 'ring-2 ring-amber-400 ring-offset-1' : ''
                }`}
              >
                {/* Rejection banner */}
                {rechazadaRecientemente && (
                  <div className="flex items-center gap-2 bg-red-500 px-4 py-2">
                    <XCircle className="h-3.5 w-3.5 text-white flex-shrink-0" />
                    <span className="text-xs font-bold text-white">Solicitud rechazada — reasignar técnico</span>
                  </div>
                )}

                {/* Presupuesto pending banner */}
                {accion.tipo === 'presupuesto' && (
                  <div className="flex items-center gap-2 bg-amber-500 px-4 py-2">
                    <Bell className="h-3.5 w-3.5 text-white animate-pulse flex-shrink-0" />
                    <span className="text-xs font-bold text-white">Presupuesto enviado — revisar y aprobar</span>
                  </div>
                )}

                {/* Conformidad pending banner */}
                {accion.tipo === 'conformidad' && (
                  <div className="flex items-center gap-2 bg-purple-600 px-4 py-2">
                    <Bell className="h-3.5 w-3.5 text-white animate-pulse flex-shrink-0" />
                    <span className="text-xs font-bold text-white">Conformidad subida — revisar y aprobar</span>
                  </div>
                )}

                <div className="px-4 py-4">
                  {/* Row 1: ID + status */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-900">#{inc.id_incidente}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.pillBg} ${cfg.pillText}`}>
                      <Icon className="w-2.5 h-2.5" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Row 2: Client */}
                  {inc.clientes && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium">{inc.clientes.nombre} {inc.clientes.apellido}</span>
                    </div>
                  )}

                  {/* Row 3: Description */}
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3 leading-snug">
                    {inc.descripcion_problema}
                  </p>

                  {/* Row 4: Address + date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 min-w-0">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{direccion}</span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatFecha(inc.fecha_registro)}
                    </span>
                  </div>

                  {/* Row 5: Category + Técnico */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {inc.categoria && (
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {inc.categoria}
                      </span>
                    )}
                    {tecnicoAsignado && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Wrench className="w-2.5 h-2.5" />
                        {tecnicoAsignado.nombre} {tecnicoAsignado.apellido}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3-chip action row */}
                <div className="flex border-t border-gray-100">
                  <button
                    onClick={() => abrirModal(inc.id_incidente, 'detalles')}
                    className="flex-1 flex flex-col items-center gap-0.5 py-3 active:bg-gray-50 transition-colors border-r border-gray-100"
                  >
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-[10px] font-semibold text-gray-600">Detalles</span>
                  </button>
                  <button
                    onClick={() => abrirModal(inc.id_incidente, 'timeline')}
                    className="flex-1 flex flex-col items-center gap-0.5 py-3 active:bg-gray-50 transition-colors border-r border-gray-100"
                  >
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-semibold text-blue-500">Timeline</span>
                  </button>
                  <button
                    onClick={() => !accionCfg.disabled && handleGestionar(inc, accion)}
                    disabled={accionCfg.disabled}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
                      accionCfg.disabled
                        ? 'opacity-30 cursor-not-allowed'
                        : 'active:bg-gray-50'
                    } ${accionCfg.activeColor}`}
                  >
                    <accionCfg.Icon className={`w-4 h-4 ${accionCfg.pulse ? 'animate-pulse' : ''}`} />
                    <span className="text-[10px] font-semibold">{accionCfg.label}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Detalle */}
      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="admin"
        initialTab={modalTab}
        onUpdate={() => router.refresh()}
      />

      {/* Modal de Gestión (asignar/reasignar técnico) */}
      {incidenteParaGestionar && (
        <GestionarPendienteModal
          open={modalGestionarOpen}
          onOpenChange={setModalGestionarOpen}
          incidente={incidenteParaGestionar}
          onGestionExito={() => { setModalGestionarOpen(false); router.refresh() }}
        />
      )}
    </div>
  )
}
