'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/shared/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  AlertCircle, Search, Clock, Send, Wrench, CheckCircle,
  MapPin, FileText, ClipboardList, RefreshCw, XCircle, Bell,
  User, AlertTriangle, CreditCard, CircleCheck, UserX,
} from 'lucide-react'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { GestionarPendienteModal } from '@/components/admin/gestionar-pendiente-modal'
import type { IncidenteConClienteAdmin } from '@/features/incidentes/incidentes.types'
import { Paginacion } from '@/components/ui/paginacion'
import { ESTADO_INCIDENTE_CONFIG, SUB_ESTADO_EN_PROCESO_CONFIG, type SubEstadoEnProceso } from '@/shared/utils/colors'
import { darDeBajaIncidente } from '@/features/asignaciones/asignaciones.service'

interface IncidentesAdminContentProps {
  incidentes: IncidenteConClienteAdmin[]
  incidentesPagadosIds: number[]
}

const ICON_BY_ESTADO: Record<string, React.ElementType> = {
  pendiente:             Clock,
  asignacion_solicitada: Send,
  en_proceso:            Wrench,
  finalizado:            CheckCircle,
  resuelto:              CheckCircle,
}

const ICON_BY_SUB_ESTADO: Record<SubEstadoEnProceso, React.ElementType> = {
  pendiente_inspeccion:  ClipboardList,
  aceptada:              FileText,
  presupuesto_enviado:   FileText,
  presupuesto_cliente:   Clock,
  en_curso:              Wrench,
  completada_pendiente:  Clock,
  conformidad_rechazada: XCircle,
  pendiente_pago:        CreditCard,
  finalizado:            CheckCircle,
}

// ── Acción pendiente — qué debe hacer el admin ahora mismo ───────────────────
type AccionPendiente =
  | { tipo: 'asignar' }
  | { tipo: 'reasignar' }
  | { tipo: 'pendiente_inspeccion' }
  | { tipo: 'aceptada' }
  | { tipo: 'presupuesto_enviado' }
  | { tipo: 'presupuesto_cliente' }
  | { tipo: 'completada_pendiente' }
  | { tipo: 'conformidad_rechazada' }
  | { tipo: 'en_curso' }
  | { tipo: 'pendiente_pago' }
  | { tipo: 'finalizado' }

function getAccionPendiente(inc: IncidenteConClienteAdmin): AccionPendiente {
  const estado = inc.estado_actual
  if (estado === 'pendiente') {
    const tieneCancelada = inc.asignaciones_tecnico?.some(a => a.estado_asignacion === 'cancelada')
    if (tieneCancelada) return { tipo: 'reasignar' }
    return { tipo: 'asignar' }
  }
  if (estado === 'asignacion_solicitada') {
    const tieneRechazada = inc.asignaciones_tecnico?.some(a => a.estado_asignacion === 'rechazada')
    if (tieneRechazada) return { tipo: 'reasignar' }
    return { tipo: 'en_curso' }
  }
  if (estado === 'en_proceso') {
    // Trabajo completado y aprobado — espera cobro al cliente
    if (inc.fue_resuelto) return { tipo: 'pendiente_pago' }
    const confRechazada = inc.conformidades?.find(c => c.esta_rechazada)
    if (confRechazada) return { tipo: 'conformidad_rechazada' }
    const presPendiente = inc.presupuestos?.find(p => p.estado_presupuesto === 'enviado')
    if (presPendiente) return { tipo: 'presupuesto_enviado' }
    const presClientePendiente = inc.presupuestos?.find(p => p.estado_presupuesto === 'aprobado_admin')
    if (presClientePendiente) return { tipo: 'presupuesto_cliente' }
    const confPendiente = inc.conformidades?.find(c => c.url_documento && !c.esta_firmada && !c.esta_rechazada)
    if (confPendiente) return { tipo: 'completada_pendiente' }
    const asigActiva = inc.asignaciones_tecnico?.find(a => ['aceptada', 'en_curso'].includes(a.estado_asignacion))
    const presAprobado = inc.presupuestos?.find(p => p.estado_presupuesto === 'aprobado')
    if (asigActiva?.estado_asignacion === 'aceptada' && !presAprobado) {
      const tieneInspeccion = (inc.inspecciones?.length ?? 0) > 0
      return { tipo: tieneInspeccion ? 'aceptada' : 'pendiente_inspeccion' }
    }
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
  asignar:               { label: 'Asignar técnico',  Icon: Wrench,        activeColor: 'text-blue-600',   pulse: false, disabled: false },
  reasignar:             { label: 'Reasignar',        Icon: RefreshCw,     activeColor: 'text-orange-600', pulse: false, disabled: false },
  pendiente_inspeccion:  { label: 'Pend. inspección', Icon: ClipboardList, activeColor: 'text-gray-300',   pulse: false, disabled: true  },
  aceptada:              { label: 'Pend. presupuesto', Icon: FileText,     activeColor: 'text-gray-300',   pulse: false, disabled: true  },
  presupuesto_enviado:   { label: 'Evaluar presup.',  Icon: FileText,      activeColor: 'text-amber-600',  pulse: true,  disabled: false },
  presupuesto_cliente:   { label: 'Esp. cliente',     Icon: Clock,         activeColor: 'text-gray-300',   pulse: false, disabled: true  },
  completada_pendiente:  { label: 'Ver conform.',     Icon: ClipboardList, activeColor: 'text-purple-600', pulse: true,  disabled: false },
  conformidad_rechazada: { label: 'Conf. rechaz.',    Icon: XCircle,       activeColor: 'text-gray-300',   pulse: false, disabled: true  },
  en_curso:              { label: 'En Curso',         Icon: Clock,         activeColor: 'text-gray-300',   pulse: false, disabled: true  },
  pendiente_pago:        { label: 'Cobrar cliente',   Icon: CreditCard,    activeColor: 'text-teal-600',   pulse: true,  disabled: false },
  finalizado:            { label: 'Finalizado',       Icon: CheckCircle,   activeColor: 'text-gray-300',   pulse: false, disabled: true  },
}

const BANNER_ICON_BY_ACCION: Partial<Record<AccionPendiente['tipo'], React.ElementType>> = {
  presupuesto_enviado:   Bell,
  presupuesto_cliente:   Clock,
  completada_pendiente:  Bell,
  conformidad_rechazada: XCircle,
  pendiente_pago:        CreditCard,
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

// ── Componente de card extraído para reutilizar en vista plana y agrupada ─────
function IncidenteCard({
  inc, cfg, Icon, accion, accionCfg, isHighlighted,
  direccion, tecnicoAsignado, highlightRefs, onVerDetalle, onGestionar, pagoLink,
}: {
  inc: IncidenteConClienteAdmin
  cfg: typeof import('@/shared/utils/colors').ESTADO_INCIDENTE_CONFIG[string]
  Icon: React.ElementType
  accion: AccionPendiente
  accionCfg: typeof ACCION_CONFIG[keyof typeof ACCION_CONFIG]
  isHighlighted: boolean
  direccion: string
  tecnicoAsignado: { nombre: string; apellido: string } | null
  highlightRefs: React.MutableRefObject<Map<number, HTMLDivElement>>
  onVerDetalle: (id: number, tab?: string) => void
  onGestionar: (inc: IncidenteConClienteAdmin, accion: AccionPendiente) => void
  pagoLink?: string
}) {
  const rechazadaRecientemente = inc.estado_actual === 'asignacion_solicitada' &&
    inc.asignaciones_tecnico?.some(a => a.estado_asignacion === 'rechazada')
  const canceladaPorTecnico = inc.estado_actual === 'pendiente' &&
    inc.asignaciones_tecnico?.some(a => a.estado_asignacion === 'cancelada')

  const subCfg = SUB_ESTADO_EN_PROCESO_CONFIG[accion.tipo as SubEstadoEnProceso]
  const BadgeIcon = subCfg ? (ICON_BY_SUB_ESTADO[accion.tipo as SubEstadoEnProceso] ?? Icon) : Icon
  const badgeLabel = subCfg ? subCfg.labelBadge : cfg.labelAdmin
  const cardStripe = subCfg?.stripe ?? cfg.stripe
  const cardBgGradient = subCfg?.bgGradient ?? cfg.bgGradient
  const badgeCls = subCfg?.badge ?? cfg.badge

  return (
    <div
      key={inc.id_incidente}
      ref={(el) => {
        if (el) highlightRefs.current.set(inc.id_incidente, el)
        else highlightRefs.current.delete(inc.id_incidente)
      }}
      className={`rounded-2xl border-l-4 shadow-sm overflow-hidden transition-shadow hover:shadow-md bg-gradient-to-r ${cardBgGradient} to-white ${cardStripe} ${
        isHighlighted ? 'ring-2 ring-amber-400 ring-offset-1' : ''
      }`}
    >
      {canceladaPorTecnico && (
        <div className="flex items-center gap-2 bg-red-600 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-yellow-300 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-white">Técnico canceló el trabajo</span>
            <span className="text-red-200 text-xs ml-1.5">— Reasignar urgente</span>
          </div>
        </div>
      )}
      {rechazadaRecientemente && (
        <div className="flex items-center gap-2 bg-red-500 px-4 py-2">
          <XCircle className="h-3.5 w-3.5 text-white flex-shrink-0" />
          <span className="text-xs font-bold text-white">Solicitud rechazada — reasignar técnico</span>
        </div>
      )}
      {(() => {
        const bannerCfg = SUB_ESTADO_EN_PROCESO_CONFIG[accion.tipo as SubEstadoEnProceso]
        if (!bannerCfg?.bannerBg) return null
        const BannerIcon = BANNER_ICON_BY_ACCION[accion.tipo] ?? Bell
        const pulse = accion.tipo === 'presupuesto_enviado' || accion.tipo === 'completada_pendiente'
        return (
          <div className={`flex items-center gap-2 ${bannerCfg.bannerBg} px-4 py-2`}>
            <BannerIcon className={`h-3.5 w-3.5 text-white flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-bold text-white">{bannerCfg.bannerText}</span>
          </div>
        )
      })()}

      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 tabular-nums">#{inc.id_incidente}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset shrink-0 ${badgeCls}`}>
              <BadgeIcon className="w-2.5 h-2.5" />
              {badgeLabel}
            </span>
          </div>
          {inc.nivel_prioridad === 'Urgente' && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 ring-1 ring-inset ring-red-200 px-2 py-0.5 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Urgente
            </span>
          )}
          {inc.nivel_prioridad === 'Alta' && (
            <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 ring-1 ring-inset ring-orange-200 px-2 py-0.5 rounded-full shrink-0">
              Alta
            </span>
          )}
        </div>
        <p className="text-[15px] font-semibold text-slate-800 line-clamp-2 mb-2.5 leading-snug">
          {inc.descripcion_problema}
        </p>
        {inc.clientes && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
            <User className="w-3 h-3 flex-shrink-0" />
            <span>{inc.clientes.nombre} {inc.clientes.apellido}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{direccion}</span>
          </div>
          <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">{formatFecha(inc.fecha_registro)}</span>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {inc.categoria && (
            <span className="text-[10px] font-medium text-slate-500 bg-white/70 border border-slate-200 px-2 py-0.5 rounded-full">
              {inc.categoria}
            </span>
          )}
          {tecnicoAsignado && (
            <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Wrench className="w-2.5 h-2.5" />
              {tecnicoAsignado.nombre} {tecnicoAsignado.apellido}
            </span>
          )}
        </div>
      </div>

      <div className="flex border-t border-white/60">
        <button
          onClick={() => onVerDetalle(inc.id_incidente, 'detalles')}
          className="flex-1 flex flex-col items-center gap-0.5 py-3 hover:bg-white/40 active:bg-white/60 transition-colors border-r border-white/60"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-[10px] font-semibold text-slate-500">Ver</span>
        </button>
        <button
          onClick={() => onVerDetalle(inc.id_incidente, 'timeline')}
          className="flex-1 flex flex-col items-center gap-0.5 py-3 hover:bg-white/40 active:bg-white/60 transition-colors border-r border-white/60"
        >
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-[10px] font-semibold text-blue-500">Timeline</span>
        </button>
        {pagoLink ? (
          <Link
            href={pagoLink}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 hover:bg-emerald-50/60 active:bg-emerald-100/60 transition-colors text-emerald-600"
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px] font-semibold">Ir al Pago</span>
          </Link>
        ) : (
          <button
            onClick={() => !accionCfg.disabled && onGestionar(inc, accion)}
            disabled={accionCfg.disabled}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
              accionCfg.disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/40 active:bg-white/60'
            } ${accionCfg.activeColor}`}
          >
            <accionCfg.Icon className={`w-4 h-4 ${accionCfg.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-semibold">{accionCfg.label}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export function IncidentesAdminContent({ incidentes, incidentesPagadosIds }: IncidentesAdminContentProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [subFiltro, setSubFiltro] = useState<string>('todos')
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState('detalles')
  const [modalGestionarOpen, setModalGestionarOpen] = useState(false)
  const [incidenteParaGestionar, setIncidenteParaGestionar] = useState<IncidenteConClienteAdmin | null>(null)
  const [bajaDialogInc, setBajaDialogInc] = useState<IncidenteConClienteAdmin | null>(null)
  const [motivoBaja, setMotivoBaja] = useState('')
  const [procesandoBaja, setProcesandoBaja] = useState(false)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const highlightRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [pagina, setPagina] = useState(1)

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
    setHighlightId(parseInt(id))
  }, [])

  // Scroll al elemento destacado con retry: usa interval hasta que el DOM lo tenga
  useEffect(() => {
    if (!highlightId) return

    let attempts = 0
    const interval = setInterval(() => {
      const el = highlightRefs.current.get(highlightId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        clearInterval(interval)
        setTimeout(() => setHighlightId(null), 2500)
      } else if (++attempts >= 20) {
        clearInterval(interval)
        setHighlightId(null)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [highlightId])

  const abrirModal = (id: number, tab = 'detalles') => {
    setIncidenteSeleccionado(id)
    setModalTab(tab)
    setModalOpen(true)
  }

  const handleGestionar = (inc: IncidenteConClienteAdmin, accion: AccionPendiente) => {
    if (accion.tipo === 'asignar' || accion.tipo === 'reasignar') {
      setIncidenteParaGestionar(inc)
      setModalGestionarOpen(true)
    } else if (accion.tipo === 'presupuesto_enviado') {
      abrirModal(inc.id_incidente, 'presupuesto_admin')
    } else if (accion.tipo === 'completada_pendiente') {
      abrirModal(inc.id_incidente, 'conformidad_admin')
    }
  }

  const handleModalDarBaja = (incidenteId: number) => {
    const inc = incidentes.find(i => i.id_incidente === incidenteId)
    if (inc) setBajaDialogInc(inc)
  }

  const handleConfirmarBaja = async () => {
    if (!bajaDialogInc || !motivoBaja.trim()) return
    setProcesandoBaja(true)
    try {
      const result = await darDeBajaIncidente(bajaDialogInc.id_incidente, motivoBaja.trim())
      if (result.success) {
        toast.success('Técnico desafectado', {
          description: `Incidente #${bajaDialogInc.id_incidente} volvió a estado Pendiente.`,
        })
        setBajaDialogInc(null)
        setMotivoBaja('')
        router.refresh()
        window.dispatchEvent(new Event('admin-badges-refresh'))
      } else {
        toast.error('Error', { description: result.error })
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setProcesandoBaja(false)
    }
  }

  // Stats
  // asignacion_solicitada con rechazo = necesita reasignación urgente → se agrupa con pendientes
  const necesitaReasignacion = (inc: IncidenteConClienteAdmin) =>
    getAccionPendiente(inc).tipo === 'reasignar'

  const porEstado = {
    pendiente:             incidentes.filter(i =>
      i.estado_actual === 'pendiente' ||
      (i.estado_actual === 'asignacion_solicitada' && necesitaReasignacion(i))
    ),
    asignacion_solicitada: incidentes.filter(i =>
      i.estado_actual === 'asignacion_solicitada' && !necesitaReasignacion(i)
    ),
    en_proceso:            incidentes.filter(i => i.estado_actual === 'en_proceso'),
    finalizado:            incidentes.filter(i => i.estado_actual === 'finalizado' || i.estado_actual === 'resuelto'),
  }

  const filtros = [
    { id: 'todos',                 label: 'Todos',          count: incidentes.length,                          Icon: AlertCircle },
    { id: 'pendiente',             label: 'Pendientes',     count: porEstado.pendiente.length,                 Icon: Clock },
    { id: 'asignacion_solicitada', label: 'Asig. Solicitada', count: porEstado.asignacion_solicitada.length,   Icon: Send },
    { id: 'en_proceso',            label: 'En Proceso',     count: porEstado.en_proceso.length,                Icon: Wrench },
    { id: 'finalizado',            label: 'Finalizados',    count: porEstado.finalizado.length,                Icon: CheckCircle },
  ]

  // Reset page + subfiltro when filters change
  useEffect(() => { setPagina(1); setSubFiltro('todos') }, [filtro, busqueda])

  // Filter by estado + search
  const incidentesFiltrados = incidentes.filter(inc => {
    const estadoMatch = filtro === 'todos'
      ? true
      : filtro === 'pendiente'
        ? (inc.estado_actual === 'pendiente' ||
           (inc.estado_actual === 'asignacion_solicitada' && necesitaReasignacion(inc)))
        : filtro === 'asignacion_solicitada'
          ? (inc.estado_actual === 'asignacion_solicitada' && !necesitaReasignacion(inc))
          : filtro === 'finalizado'
            ? (inc.estado_actual === 'finalizado' || inc.estado_actual === 'resuelto')
            : inc.estado_actual === filtro

    if (!estadoMatch) return false

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      const matchId = inc.id_incidente.toString().includes(q)
      const matchDesc = inc.descripcion_problema.toLowerCase().includes(q)
      const matchCliente = `${inc.clientes?.nombre ?? ''} ${inc.clientes?.apellido ?? ''}`.toLowerCase().includes(q)
      const matchDir = `${inc.inmuebles?.calle ?? ''} ${inc.inmuebles?.altura ?? ''} ${inc.inmuebles?.barrio ?? ''} ${inc.inmuebles?.localidad ?? ''}`.toLowerCase().includes(q)
      const matchCategoria = (inc.categoria ?? '').toLowerCase().includes(q)
      const matchPrioridad = (inc.nivel_prioridad ?? '').toLowerCase().includes(q)
      const matchTecnico = inc.asignaciones_tecnico?.some(a => {
        const t = a.tecnicos
        return t ? `${t.nombre} ${t.apellido}`.toLowerCase().includes(q) : false
      }) ?? false
      if (!matchId && !matchDesc && !matchCliente && !matchDir && !matchCategoria && !matchPrioridad && !matchTecnico) return false
    }

    return true
  })

  // Reasignaciones urgentes siempre al tope
  const incidentesOrdenados = [...incidentesFiltrados].sort((a, b) => {
    const aUrgente = necesitaReasignacion(a) ? 0 : 1
    const bUrgente = necesitaReasignacion(b) ? 0 : 1
    return aUrgente - bUrgente
  })

  const incidentesPaginados = incidentesOrdenados.slice((pagina - 1) * 10, pagina * 10)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Incidentes</h1>
        <p className="text-gray-600 mt-1">Administrá y gestioná todos los incidentes reportados</p>
      </div>

      {/* Search + Filter chips */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por ID, descripción, cliente, dirección, categoría, técnico..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-slate-100 p-1 rounded-xl">
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
      </div>

      {/* Cards list */}
      {incidentesFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">
            {busqueda ? 'Sin resultados para esa búsqueda' : 'No hay incidentes en este estado'}
          </p>
        </div>
      ) : filtro === 'en_proceso' ? (
        /* ── Vista agrupada para En Proceso ─────────────────────────────────── */
        <div className="space-y-4">
          {/* Sub-filtro */}
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
            {(['pendiente_inspeccion', 'aceptada', 'presupuesto_enviado', 'presupuesto_cliente', 'en_curso', 'completada_pendiente', 'conformidad_rechazada', 'pendiente_pago'] as const).map(tipo => {
              const count = incidentesFiltrados.filter(i => getAccionPendiente(i).tipo === tipo).length
              const gcfg = SUB_ESTADO_EN_PROCESO_CONFIG[tipo]
              const active = subFiltro === tipo
              return (
                <button
                  key={tipo}
                  onClick={() => setSubFiltro(tipo)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                  }`}
                >
                  {gcfg.labelBadge}
                  <span className={`text-[10px] font-bold rounded-full px-1.5 py-px ${active ? 'bg-slate-200 text-slate-700' : 'bg-slate-200/60 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="space-y-6">
          {((['pendiente_inspeccion', 'aceptada', 'presupuesto_enviado', 'presupuesto_cliente', 'en_curso', 'completada_pendiente', 'conformidad_rechazada', 'pendiente_pago'] as const)
            .map(tipo => ({
              tipo,
              items: incidentesFiltrados.filter(i => getAccionPendiente(i).tipo === tipo),
            }))
            .filter(g => g.items.length > 0)
            .filter(g => subFiltro === 'todos' || g.tipo === subFiltro)
            .map(grupo => {
              const gcfg = SUB_ESTADO_EN_PROCESO_CONFIG[grupo.tipo]
              return (
                <div key={grupo.tipo}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border mb-3 ${gcfg.groupHeaderCls}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${gcfg.groupDotCls}`} />
                    <span className="text-xs font-bold">{gcfg.labelGrupo}</span>
                    <span className="text-xs font-semibold opacity-50">({grupo.items.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {grupo.items.map(inc => {
                      const accion = getAccionPendiente(inc)
                      const accionCfg = ACCION_CONFIG[accion.tipo]
                      const cfgKey = accion.tipo === 'reasignar' ? 'pendiente' : inc.estado_actual
                      const cfg = ESTADO_INCIDENTE_CONFIG[cfgKey] ?? ESTADO_INCIDENTE_CONFIG.pendiente
                      const Icon = ICON_BY_ESTADO[cfgKey] ?? Clock
                      const isHighlighted = inc.id_incidente === highlightId
                      const inmueble = inc.inmuebles
                      const dir = [inmueble?.calle, inmueble?.altura].filter(Boolean).join(' ')
                      const ubi = [inmueble?.barrio, inmueble?.localidad].filter(Boolean).join(', ')
                      const direccion = ubi ? `${dir}, ${ubi}` : dir || 'Sin dirección'
                      const tecnicoAsignado = inc.asignaciones_tecnico?.find(a =>
                        ['aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion)
                      )?.tecnicos
                      return <IncidenteCard
                        key={inc.id_incidente}
                        inc={inc}
                        cfg={cfg}
                        Icon={Icon}
                        accion={accion}
                        accionCfg={accionCfg}
                        isHighlighted={isHighlighted}
                        direccion={direccion}
                        tecnicoAsignado={tecnicoAsignado ?? null}
                        highlightRefs={highlightRefs}
                        onVerDetalle={abrirModal}
                        onGestionar={handleGestionar}
                        pagoLink={accion.tipo === 'pendiente_pago' ? `/dashboard/pagos?tab=cobros-clientes&highlight=${inc.id_incidente}` : undefined}
                      />
                    })}
                  </div>
                </div>
              )
            })
          )}
          </div>
        </div>
      ) : filtro === 'finalizado' ? (
        /* ── Vista Finalizados — lista simple sin sub-filtros ─────────────────── */
        (() => {
          const paginados = incidentesOrdenados.slice((pagina - 1) * 10, pagina * 10)
          return (
            <div className="space-y-4">
              {incidentesOrdenados.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No hay incidentes finalizados</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {paginados.map(inc => {
                      const accion = getAccionPendiente(inc)
                      const accionCfg = ACCION_CONFIG[accion.tipo]
                      const cfgKey = inc.estado_actual
                      const cfg = ESTADO_INCIDENTE_CONFIG[cfgKey] ?? ESTADO_INCIDENTE_CONFIG.finalizado
                      const Icon = ICON_BY_ESTADO[cfgKey] ?? CheckCircle
                      const isHighlighted = inc.id_incidente === highlightId
                      const inmueble = inc.inmuebles
                      const dir = [inmueble?.calle, inmueble?.altura].filter(Boolean).join(' ')
                      const ubi = [inmueble?.barrio, inmueble?.localidad].filter(Boolean).join(', ')
                      const direccion = ubi ? `${dir}, ${ubi}` : dir || 'Sin dirección'
                      const tecnicoAsignado = inc.asignaciones_tecnico?.find(a =>
                        ['aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion)
                      )?.tecnicos
                      return <IncidenteCard
                        key={inc.id_incidente}
                        inc={inc}
                        cfg={cfg}
                        Icon={Icon}
                        accion={accion}
                        accionCfg={accionCfg}
                        isHighlighted={isHighlighted}
                        direccion={direccion}
                        tecnicoAsignado={tecnicoAsignado ?? null}
                        highlightRefs={highlightRefs}
                        onVerDetalle={abrirModal}
                        onGestionar={handleGestionar}
                      />
                    })}
                  </div>
                  <Paginacion pagina={pagina} total={incidentesOrdenados.length} onChange={setPagina} />
                </>
              )}
            </div>
          )
        })()
      ) : (
        /* ── Vista paginada normal ───────────────────────────────────────────── */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incidentesPaginados.map(inc => {
              const accion = getAccionPendiente(inc)
              const accionCfg = ACCION_CONFIG[accion.tipo]
              const cfgKey = accion.tipo === 'reasignar' ? 'pendiente' : inc.estado_actual
              const cfg = ESTADO_INCIDENTE_CONFIG[cfgKey] ?? ESTADO_INCIDENTE_CONFIG.pendiente
              const Icon = ICON_BY_ESTADO[cfgKey] ?? Clock
              const isHighlighted = inc.id_incidente === highlightId
              const inmueble = inc.inmuebles
              const dir = [inmueble?.calle, inmueble?.altura].filter(Boolean).join(' ')
              const ubi = [inmueble?.barrio, inmueble?.localidad].filter(Boolean).join(', ')
              const direccion = ubi ? `${dir}, ${ubi}` : dir || 'Sin dirección'
              const tecnicoAsignado = inc.asignaciones_tecnico?.find(a =>
                ['aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion)
              )?.tecnicos
              return <IncidenteCard
                key={inc.id_incidente}
                inc={inc}
                cfg={cfg}
                Icon={Icon}
                accion={accion}
                accionCfg={accionCfg}
                isHighlighted={isHighlighted}
                direccion={direccion}
                tecnicoAsignado={tecnicoAsignado ?? null}
                highlightRefs={highlightRefs}
                onVerDetalle={abrirModal}
                onGestionar={handleGestionar}
              />
            })}
          </div>
          <Paginacion pagina={pagina} total={incidentesFiltrados.length} onChange={setPagina} />
        </>
      )}

      {/* Modal de Detalle */}
      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="admin"
        initialTab={modalTab}
        onUpdate={() => { router.refresh(); window.dispatchEvent(new CustomEvent('admin-badges-refresh')) }}
        onDarBaja={handleModalDarBaja}
      />

      {/* Modal de Gestión (asignar/reasignar técnico) */}
      {incidenteParaGestionar && (
        <GestionarPendienteModal
          open={modalGestionarOpen}
          onOpenChange={setModalGestionarOpen}
          incidente={incidenteParaGestionar}
          onGestionExito={() => { setModalGestionarOpen(false); router.refresh(); window.dispatchEvent(new CustomEvent('admin-badges-refresh')) }}
        />
      )}

      {/* Dialog: Dar de baja técnico */}
      <Dialog
        open={bajaDialogInc !== null}
        onOpenChange={(o) => { if (!o && !procesandoBaja) { setBajaDialogInc(null); setMotivoBaja('') } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="h-5 w-5" />
              Dar de baja al técnico
            </DialogTitle>
            <DialogDescription>
              Incidente #{bajaDialogInc?.id_incidente} — El técnico será desafectado y el incidente volverá a estado <strong>Pendiente</strong> de asignación.
              Se notificará al técnico y al cliente con el motivo indicado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Motivo de la baja <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={motivoBaja}
                onChange={(e) => setMotivoBaja(e.target.value)}
                placeholder="Explicá el motivo por el cual se da de baja al técnico de este incidente..."
                rows={4}
                disabled={procesandoBaja}
                className="resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">Este mensaje será enviado al técnico y al cliente como notificación.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setBajaDialogInc(null); setMotivoBaja('') }}
              disabled={procesandoBaja}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarBaja}
              disabled={procesandoBaja || !motivoBaja.trim()}
              className="gap-2"
            >
              <UserX className="h-4 w-4" />
              {procesandoBaja ? 'Procesando...' : 'Confirmar baja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
