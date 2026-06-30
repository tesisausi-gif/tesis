'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import {
  MapPin, ClipboardList, Clock, Wrench, FileText, CheckCircle, AlertTriangle, XCircle,
  Phone, Mail, ChevronDown, ChevronUp, AlertCircle, CalendarDays, CreditCard, RefreshCw,
  Banknote, Building2, Wallet, X, Search, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { AsignacionTecnico } from '@/features/asignaciones/asignaciones.types'
import { createClient } from '@/shared/lib/supabase/client'
import { cancelarAsignacionAceptada } from '@/features/asignaciones/asignaciones.service'
import { getMisPagosComoTecnico, type MiPagoRecibido, type MiPagoPendiente } from '@/features/pagos/pagos-tecnicos.service'
import { normalizeSearch } from '@/shared/utils'
import { SUB_ESTADO_EN_PROCESO_CONFIG, type SubEstadoEnProceso } from '@/shared/utils/colors'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ConformidadInfo {
  id_conformidad: number
  id_incidente: number
  esta_firmada: number | boolean
  esta_rechazada?: boolean | null
  url_documento: string | null
}

interface TrabajosContentProps {
  asignaciones: AsignacionTecnico[]
  estadoPresupuestoPorIncidente: Record<number, string>
  conformidadesPorIncidente: Record<number, ConformidadInfo>
  idTecnico: number
  incidentesPagadosIds: number[]
  tieneInspeccionPorIncidente: Record<number, boolean>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Próximo paso por estado ────────────────────────────────────────────────────

interface ProximoPaso {
  mensaje: string
  urgente: boolean
}

function getProximoPaso(
  asig: AsignacionTecnico,
  estadoPresupuesto: string | undefined,
  conformidad: { url_documento: string | null } | undefined,
): ProximoPaso | null {
  const estadoInc = asig.incidentes?.estado_actual ?? ''
  const estadoAsig = asig.estado_asignacion

  if (['finalizado', 'resuelto'].includes(estadoInc)) return null

  // Visitas: detectar antes que el check de presupuesto
  if (asig.tiene_disponibilidad) {
    const ev = asig.visita_activa?.estado
    if (ev === 'propuesta') {
      return { mensaje: 'Esperando que el cliente confirme el horario de visita', urgente: false }
    }
    if (ev === 'confirmada') {
      return { mensaje: 'Visita confirmada — llegado el día podés realizarla', urgente: false }
    }
    if (!ev && !estadoPresupuesto) {
      return { mensaje: 'Agendá una visita para comenzar', urgente: true }
    }
  }

  if (!estadoPresupuesto) {
    return { mensaje: 'Cargá el presupuesto para continuar', urgente: true }
  }
  if (estadoPresupuesto === 'enviado') {
    return { mensaje: 'Presupuesto enviado — esperando aprobación del administrador', urgente: false }
  }
  if (estadoPresupuesto === 'aprobado_admin') {
    return { mensaje: 'Admin aprobó — esperando aprobación del cliente', urgente: false }
  }
  if (estadoPresupuesto === 'rechazado') {
    return { mensaje: 'Presupuesto rechazado — revisalo y volvé a enviar', urgente: true }
  }
  if (estadoPresupuesto === 'aprobado') {
    if (estadoAsig === 'completada') {
      if (!conformidad?.url_documento) return { mensaje: 'Subí la conformidad para finalizar el trabajo', urgente: true }
      return { mensaje: 'Conformidad subida — esperando revisión del administrador', urgente: false }
    }
    const visitaRep = asig.visita_activa?.tipo === 'reparacion' ? asig.visita_activa : null
    if (visitaRep?.estado === 'propuesta')  return { mensaje: 'Esperando que el cliente confirme la fecha de la obra', urgente: false }
    if (visitaRep?.estado === 'confirmada') return { mensaje: 'Visita de obra confirmada — realizá el trabajo y completá la asignación', urgente: false }
    return { mensaje: 'Proponé una fecha para realizar la obra', urgente: true }
  }
  return null
}

// ── Iconos por sub-estado (los colores/labels vienen de SUB_ESTADO_EN_PROCESO_CONFIG) ──

const ICON_BY_SUB_ESTADO: Record<SubEstadoEnProceso, React.ElementType> = {
  visita_pendiente:             Clock,
  visita_propuesta:             Clock,
  visita_programada:            CheckCircle,
  pendiente_inspeccion:         ClipboardList,
  aceptada:                     FileText,
  presupuesto_enviado:          FileText,
  presupuesto_cliente:          Clock,
  en_curso:                     Wrench,
  necesita_visita_reparacion:   CalendarDays,
  visita_reparacion_propuesta:  Clock,
  visita_reparacion_confirmada: CheckCircle,
  completada_pendiente:         Clock,
  conformidad_rechazada:        XCircle,
  pendiente_pago:               CreditCard,
  finalizado:                   CheckCircle,
}

const QUICK_ACTION_TECNICO: Record<SubEstadoEnProceso, {
  label: string
  Icon: React.ElementType
  color: string
  disabled: boolean
  tab: string
}> = {
  visita_pendiente:      { label: 'Agendar visita',  Icon: Clock,         color: 'text-cyan-600',   disabled: false, tab: 'visitas'      },
  visita_propuesta:      { label: 'Esp. cliente',    Icon: Clock,         color: 'text-violet-400', disabled: true,  tab: 'visitas'      },
  visita_programada:     { label: 'Visita lista',    Icon: CheckCircle,   color: 'text-teal-600',   disabled: true,  tab: 'visitas'      },
  pendiente_inspeccion:  { label: 'Ir a Inspección', Icon: ClipboardList, color: 'text-blue-600',   disabled: false, tab: 'inspecciones' },
  aceptada:              { label: 'Cargar presup.',   Icon: FileText,      color: 'text-blue-600',   disabled: false, tab: 'presupuesto'  },
  presupuesto_enviado:   { label: 'Pend. admin',      Icon: Clock,         color: 'text-gray-300',   disabled: true,  tab: 'presupuesto'  },
  presupuesto_cliente:   { label: 'Pend. cliente',    Icon: Clock,         color: 'text-gray-300',   disabled: true,  tab: 'presupuesto'  },
  en_curso:                     { label: 'Subir conform.',  Icon: ClipboardList, color: 'text-purple-600', disabled: false, tab: 'conformidad' },
  necesita_visita_reparacion:   { label: 'Proponer fecha',  Icon: CalendarDays,  color: 'text-cyan-600',   disabled: false, tab: 'ejecucion'   },
  visita_reparacion_propuesta:  { label: 'Esp. cliente',    Icon: Clock,         color: 'text-violet-400', disabled: true,  tab: 'ejecucion'   },
  visita_reparacion_confirmada: { label: 'Obra agendada',   Icon: CheckCircle,   color: 'text-teal-600',   disabled: true,  tab: 'ejecucion'   },
  completada_pendiente:         { label: 'Por revisar',     Icon: Clock,         color: 'text-gray-300',   disabled: true,  tab: 'conformidad' },
  conformidad_rechazada: { label: 'Resubir',          Icon: RefreshCw,     color: 'text-orange-600', disabled: false, tab: 'conformidad'  },
  pendiente_pago:        { label: 'Cobro pend.',      Icon: Clock,         color: 'text-gray-300',   disabled: true,  tab: 'inspecciones' },
  finalizado:            { label: 'Finalizado',       Icon: CheckCircle,   color: 'text-gray-300',   disabled: true,  tab: 'inspecciones' },
}

function getStatusKey(
  a: AsignacionTecnico,
  estadoPresupuesto?: string,
  conformidad?: ConformidadInfo,
  tieneInspeccion?: boolean
): string {
  const estadoInc = a.incidentes?.estado_actual ?? ''
  if (estadoInc === 'finalizado' || estadoInc === 'resuelto') return 'finalizado'

  // Trabajo aprobado, esperando cobro al cliente
  if (a.incidentes?.fue_resuelto) return 'pendiente_pago'

  if (a.estado_asignacion === 'completada') {
    if (conformidad?.esta_rechazada) return 'conformidad_rechazada'
    // Asignación marcada como completada pero conformidad todavía NO subida:
    // mostramos el botón de acción rápida "Subir conform." en lugar de
    // "Por revisar" (deshabilitado).
    if (!conformidad?.url_documento) return 'en_curso'
    return 'completada_pendiente'
  }

  if (['aceptada', 'en_curso'].includes(a.estado_asignacion)) {
    if (estadoPresupuesto === 'enviado') return 'presupuesto_enviado'
    if (estadoPresupuesto === 'aprobado_admin') return 'presupuesto_cliente'
    if (estadoPresupuesto === 'aprobado') {
      // Verificar si hay visita de reparación activa
      const visitaRep = a.visita_activa?.tipo === 'reparacion' ? a.visita_activa : null
      if (visitaRep?.estado === 'propuesta')  return 'visita_reparacion_propuesta'
      if (visitaRep?.estado === 'confirmada') return 'visita_reparacion_confirmada'
      return 'necesita_visita_reparacion'
    }
    if (a.estado_asignacion === 'aceptada' && !tieneInspeccion) {
      if (a.tiene_disponibilidad) {
        const ev = a.visita_activa?.estado
        if (ev === 'propuesta')  return 'visita_propuesta'
        if (ev === 'confirmada') return 'visita_programada'
        return 'visita_pendiente'
      }
      return 'pendiente_inspeccion'
    }
  }

  return a.estado_asignacion
}

// ── Componente ───────────────────────────────────────────────────────────────

export function TrabajosContent({
  asignaciones,
  estadoPresupuestoPorIncidente,
  conformidadesPorIncidente,
  idTecnico,
  incidentesPagadosIds,
  tieneInspeccionPorIncidente,
}: TrabajosContentProps) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<string>('en_proceso')
  const [subFiltro, setSubFiltro] = useState<string>('todos')
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalTab, setModalTab] = useState('detalles')
  const [modalOpen, setModalOpen] = useState(false)
  const [cancelDialog, setCancelDialog] = useState<AsignacionTecnico | null>(null)
  const [motivoBaja, setMotivoBaja] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [contactoExpandido, setContactoExpandido] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [cobrosOpen, setCobrosOpen] = useState(false)
  const [cobrosLoading, setCobrosLoading] = useState(false)
  const [cobrosRecibidos, setCobrosRecibidos] = useState<MiPagoRecibido[]>([])
  const [cobrosPendientes, setCobrosPendientes] = useState<MiPagoPendiente[]>([])
  const filtrosRef      = useRef<HTMLDivElement>(null)
  const subFiltrosRef   = useRef<HTMLDivElement>(null)
  const [filtrosScrolled,    setFiltrosScrolled]    = useState(false)
  const [subFiltrosScrolled, setSubFiltrosScrolled] = useState(false)

  const abrirHistorialCobros = async () => {
    setCobrosOpen(true)
    if (cobrosRecibidos.length > 0 || cobrosPendientes.length > 0) return
    setCobrosLoading(true)
    try {
      const { pendientes, recibidos } = await getMisPagosComoTecnico()
      setCobrosRecibidos(recibidos)
      setCobrosPendientes(pendientes)
    } finally {
      setCobrosLoading(false)
    }
  }

  const abrirModal = (id: number, tab = 'detalles') => {
    setIncidenteSeleccionado(id)
    setModalTab(tab)
    setModalOpen(true)
  }

  const confirmarCancelacion = async () => {
    if (!cancelDialog || !motivoBaja) return
    setIsCancelling(true)
    try {
      const res = await cancelarAsignacionAceptada(cancelDialog.id_asignacion, cancelDialog.id_incidente, motivoBaja)
      if (res.success) {
        toast.success('Baja registrada', { description: `Incidente #${cancelDialog.id_incidente} devuelto a pendiente.` })
        setCancelDialog(null)
        setMotivoBaja('')
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo registrar la baja')
      }
    } finally {
      setIsCancelling(false)
    }
  }

  // Realtime: presupuesto aprobado por cliente
  useEffect(() => {
    const supabase = createClient()
    const idIncidentes = asignaciones.map(a => a.id_incidente)

    const channel = supabase
      .channel('presupuestos-tecnico-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presupuestos' }, (payload) => {
        const next = payload.new as any
        const prev = payload.old as any
        if (
          next?.estado_presupuesto === 'aprobado' &&
          prev?.estado_presupuesto !== 'aprobado' &&
          idIncidentes.includes(next.id_incidente)
        ) {
          toast.success('¡Presupuesto aprobado por el cliente!', {
            description: `Incidente #${next.id_incidente} — ya podés comenzar el trabajo`,
          })
          router.refresh()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [asignaciones, router])

  // ── Filtros ─────────────────────────────────────────────────────────────

  useEffect(() => { setSubFiltro('todos'); setBusqueda('') }, [filtro])

  const sk = (a: AsignacionTecnico) =>
    getStatusKey(
      a,
      estadoPresupuestoPorIncidente[a.id_incidente],
      conformidadesPorIncidente[a.id_incidente],
      tieneInspeccionPorIncidente[a.id_incidente]
    )

  const EN_PROCESO_KEYS = ['visita_pendiente', 'visita_propuesta', 'visita_programada', 'pendiente_inspeccion', 'aceptada', 'presupuesto_enviado', 'presupuesto_cliente', 'necesita_visita_reparacion', 'visita_reparacion_propuesta', 'visita_reparacion_confirmada', 'en_curso', 'completada_pendiente', 'conformidad_rechazada', 'pendiente_pago']
  const enProceso = asignaciones.filter(a => EN_PROCESO_KEYS.includes(sk(a)))
  const resueltas = asignaciones.filter(a => sk(a) === 'finalizado')

  const filtros = [
    { id: 'todos',      label: 'Todos',       count: asignaciones.length, Icon: ClipboardList },
    { id: 'en_proceso', label: 'En proceso',  count: enProceso.length,    Icon: Wrench },
    { id: 'resueltos',  label: 'Finalizados', count: resueltas.length,    Icon: CheckCircle },
  ]

  const listaFiltradaBase =
    filtro === 'resueltos' ? resueltas :
    filtro === 'en_proceso' ? enProceso :
    asignaciones

  const listaFiltrada = busqueda.trim()
    ? listaFiltradaBase.filter(a => {
        const q = normalizeSearch(busqueda)
        const inc = a.incidentes
        return (
          a.id_incidente.toString().includes(q) ||
          normalizeSearch(inc?.descripcion_problema ?? '').includes(q) ||
          normalizeSearch(inc?.categoria ?? '').includes(q) ||
          normalizeSearch(`${inc?.inmuebles?.calle ?? ''} ${inc?.inmuebles?.barrio ?? ''} ${inc?.inmuebles?.localidad ?? ''}`).includes(q) ||
          normalizeSearch(`${inc?.clientes?.nombre ?? ''} ${inc?.clientes?.apellido ?? ''}`).includes(q)
        )
      })
    : listaFiltradaBase

  // ── Card ────────────────────────────────────────────────────────────────

  const renderCard = (asig: AsignacionTecnico) => {
    const incidente = asig.incidentes
    const inmueble = incidente?.inmuebles
    const cliente = incidente?.clientes
    const key = sk(asig) as SubEstadoEnProceso
    const cfg = SUB_ESTADO_EN_PROCESO_CONFIG[key] ?? SUB_ESTADO_EN_PROCESO_CONFIG.aceptada
    const Icon = ICON_BY_SUB_ESTADO[key] ?? ClipboardList

    const direccionPartes = inmueble
      ? [inmueble.calle, inmueble.altura, inmueble.piso && `Piso ${inmueble.piso}`, inmueble.dpto && `Dpto ${inmueble.dpto}`].filter(Boolean).join(' ')
      : ''
    const ubicacion = inmueble ? [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ') : ''
    const direccion = ubicacion ? `${direccionPartes}, ${ubicacion}` : direccionPartes || 'Sin dirección'

    const estadoPres = estadoPresupuestoPorIncidente[asig.id_incidente]
    const conformidad = conformidadesPorIncidente[asig.id_incidente]
    const proximoPaso = getProximoPaso(asig, estadoPres, conformidad)
    const contactoAbierto = contactoExpandido === asig.id_asignacion

    return (
      <div
        key={asig.id_asignacion}
        className={`rounded-2xl border-l-4 shadow-sm overflow-hidden hover:shadow-md transition-shadow bg-gradient-to-r ${cfg.bgGradient} to-white ${cfg.stripe}`}
      >
        <div className="px-4 py-4">
          {/* Fila 1: ID + estado */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 tabular-nums">#{asig.id_incidente}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset shrink-0 ${cfg.badge}`}>
              <Icon className="w-2.5 h-2.5" />
              {cfg.labelBadge}
            </span>
          </div>

          {/* Próximo paso */}
          {proximoPaso && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 mb-3 ${
              proximoPaso.urgente
                ? 'bg-orange-50 border border-orange-200'
                : 'bg-blue-50 border border-blue-100'
            }`}>
              <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${proximoPaso.urgente ? 'text-orange-500' : 'text-blue-400'}`} />
              <p className={`text-xs font-medium leading-snug ${proximoPaso.urgente ? 'text-orange-700' : 'text-blue-600'}`}>
                {proximoPaso.mensaje}
              </p>
            </div>
          )}

          {/* Descripción — hero */}
          {incidente?.descripcion_problema && (
            <p className="text-[15px] font-semibold text-slate-800 line-clamp-2 mb-2.5 leading-snug">
              {incidente.descripcion_problema}
            </p>
          )}

          {/* Dirección + fecha */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{direccion}</span>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
              {formatFecha(asig.fecha_asignacion)}
            </span>
          </div>

          {/* Categoría + contacto toggle */}
          <div className="flex items-center justify-between mt-2">
            {incidente?.categoria && (
              <span className="text-[10px] font-medium text-slate-500 bg-white/70 border border-slate-200 px-2 py-0.5 rounded-full">
                {incidente.categoria}
              </span>
            )}
            {cliente && (
              <button
                onClick={() => setContactoExpandido(contactoAbierto ? null : asig.id_asignacion)}
                className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors ml-auto"
              >
                Contacto cliente
                {contactoAbierto ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Contacto expandible */}
          {contactoAbierto && cliente && (
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-blue-800">
                {cliente.nombre} {cliente.apellido}
              </p>
              {cliente.telefono && (
                <a
                  href={`tel:${cliente.telefono}`}
                  className="flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900"
                >
                  <Phone className="w-3 h-3 shrink-0" />
                  {cliente.telefono}
                </a>
              )}
              {cliente.correo_electronico && (
                <a
                  href={`mailto:${cliente.correo_electronico}`}
                  className="flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900 break-all"
                >
                  <Mail className="w-3 h-3 shrink-0" />
                  {cliente.correo_electronico}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Acciones — Ver | Timeline | Acción rápida */}
        <div className="flex border-t border-white/60">
          <button
            onClick={() => abrirModal(asig.id_incidente, 'detalles')}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 hover:bg-white/40 active:bg-white/60 transition-colors border-r border-white/60"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] font-semibold text-slate-500">Ver</span>
          </button>
          <button
            onClick={() => abrirModal(asig.id_incidente, 'timeline')}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 hover:bg-white/40 active:bg-white/60 transition-colors border-r border-white/60"
          >
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-semibold text-blue-500">Timeline</span>
          </button>
          {key === 'finalizado' ? (
            <Link
              href="/tecnico/pagos"
              className="flex-1 flex flex-col items-center gap-0.5 py-3 hover:bg-emerald-50/60 active:bg-emerald-100/60 transition-colors text-emerald-600"
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-[10px] font-semibold">Ver cobro</span>
            </Link>
          ) : (() => {
            const qa = QUICK_ACTION_TECNICO[key as SubEstadoEnProceso] ?? QUICK_ACTION_TECNICO.aceptada
            return (
              <button
                onClick={() => !qa.disabled && abrirModal(asig.id_incidente, qa.tab)}
                disabled={qa.disabled}
                className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
                  qa.disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/40 active:bg-white/60'
                } ${qa.color}`}
              >
                <qa.Icon className="w-4 h-4" />
                <span className="text-[10px] font-semibold">{qa.label}</span>
              </button>
            )
          })()}
        </div>

        {/* Botón cancelar — solo para trabajos en curso (no completados) */}
        {(asig.estado_asignacion === 'aceptada' || asig.estado_asignacion === 'en_curso') && (
          <button
            onClick={() => setCancelDialog(asig)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-red-100 bg-red-50 hover:bg-red-100 active:bg-red-200 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-semibold text-red-600">Cancelar trabajo</span>
          </button>
        )}
      </div>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────

  const EmptyState = ({ mensaje }: { mensaje: string }) => (
    <div className="px-5 pt-8 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <ClipboardList className="h-7 w-7 text-gray-400" />
      </div>
      <p className="text-sm text-gray-400">{mensaje}</p>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Incidentes</h1>
            <p className="text-sm text-gray-400">Mis trabajos</p>
          </div>
          <button
            onClick={abrirHistorialCobros}
            className="flex items-center gap-1.5 mt-1 shrink-0 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Mis cobros
          </button>
        </div>
      </div>

      {asignaciones.length === 0 ? (
        <EmptyState mensaje="Cuando aceptes una asignación, aparecerá aquí." />
      ) : (
        <>
          {/* Filter chips */}
          <div className="relative bg-slate-100 border-b border-gray-100">
            <div ref={filtrosRef} onScroll={e => setFiltrosScrolled(e.currentTarget.scrollLeft > 0)} className="flex gap-1 px-4 py-3 pr-10 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            {filtrosScrolled && (
              <button onClick={() => filtrosRef.current?.scrollBy({ left: -150, behavior: 'smooth' })} className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-slate-100 via-slate-100/80 to-transparent flex items-center justify-start pl-1">
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
            )}
            <button onClick={() => filtrosRef.current?.scrollBy({ left: 150, behavior: 'smooth' })} className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-100 via-slate-100/80 to-transparent flex items-center justify-end pr-1">
              <ChevronRight className="w-4 h-4 text-slate-400 animate-pulse" />
            </button>
          </div>

          {/* Barra de búsqueda */}
          <div className="bg-white border-b border-gray-100 px-4 py-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por ID, descripción, dirección, categoría..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-colors"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          {listaFiltrada.length === 0 ? (
            <div className="px-4 pt-3 text-center py-12 text-gray-400 text-sm">
              No hay incidentes en este estado
            </div>
          ) : filtro === 'en_proceso' ? (
            /* ── Vista agrupada para En Proceso ── */
            <div className="px-4 pt-3 space-y-4">
              {/* Sub-filtro */}
              <div className="relative">
              <div ref={subFiltrosRef} onScroll={e => setSubFiltrosScrolled(e.currentTarget.scrollLeft > 0)} className="flex gap-1 overflow-x-auto pr-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSubFiltro('todos')}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    subFiltro === 'todos' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                  }`}
                >
                  Todos
                  <span className={`text-[10px] font-bold rounded-full px-1.5 py-px ${subFiltro === 'todos' ? 'bg-slate-200 text-slate-700' : 'bg-slate-200/60 text-slate-400'}`}>
                    {listaFiltrada.length}
                  </span>
                </button>
                {(['visita_pendiente', 'visita_propuesta', 'pendiente_inspeccion', 'aceptada', 'presupuesto_enviado', 'presupuesto_cliente', 'necesita_visita_reparacion', 'visita_reparacion_propuesta', 'visita_reparacion_confirmada', 'en_curso', 'completada_pendiente', 'conformidad_rechazada', 'pendiente_pago'] as const).map(tipo => {
                  const count = listaFiltrada.filter(a => sk(a) === tipo).length
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
              {subFiltrosScrolled && (
                <button onClick={() => subFiltrosRef.current?.scrollBy({ left: -150, behavior: 'smooth' })} className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-slate-100 via-slate-100/80 to-transparent rounded-l-xl flex items-center justify-start pl-1">
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
              )}
              <button onClick={() => subFiltrosRef.current?.scrollBy({ left: 150, behavior: 'smooth' })} className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-100 via-slate-100/80 to-transparent rounded-r-xl flex items-center justify-end pr-1">
                <ChevronRight className="w-4 h-4 text-slate-400 animate-pulse" />
              </button>
              </div>
              <div className="space-y-6">
              {((['visita_pendiente', 'visita_propuesta', 'pendiente_inspeccion', 'aceptada', 'presupuesto_enviado', 'presupuesto_cliente', 'necesita_visita_reparacion', 'visita_reparacion_propuesta', 'visita_reparacion_confirmada', 'en_curso', 'completada_pendiente', 'conformidad_rechazada', 'pendiente_pago'] as const)
                .map(tipo => ({
                  tipo,
                  items: listaFiltrada.filter(a => sk(a) === tipo),
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
                      <div className="space-y-3">{grupo.items.map(a => renderCard(a))}</div>
                    </div>
                  )
                })
              )}
              </div>
            </div>
          ) : filtro === 'resueltos' ? (
            /* ── Finalizados — lista simple ── */
            <div className="px-4 pt-3 space-y-3">
              {listaFiltrada.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No hay trabajos finalizados aún</div>
              ) : (
                listaFiltrada.map(a => renderCard(a))
              )}
            </div>
          ) : (
            <div className="px-4 pt-3 space-y-3">
              {listaFiltrada.map(a => renderCard(a))}
            </div>
          )}
        </>
      )}

      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="tecnico"
        initialTab={modalTab}
        onUpdate={() => router.refresh()}
      />

      {/* Bottom-sheet historial de cobros */}
      {cobrosOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCobrosOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-2xl shadow-xl flex flex-col max-h-[80vh]">

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header del sheet */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-gray-900 text-base">Historial de cobros</span>
              </div>
              <button onClick={() => setCobrosOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Totales — solo cuando hay datos */}
            {!cobrosLoading && (cobrosRecibidos.length > 0 || cobrosPendientes.length > 0) && (
              <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
                <div className="text-center px-4 py-3">
                  <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-0.5">Por recibir</p>
                  <p className="text-lg font-bold text-amber-600 tabular-nums">
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
                      cobrosPendientes.reduce((s, p) => s + p.monto_a_recibir, 0)
                    )}
                  </p>
                  <p className="text-[10px] text-gray-400">{cobrosPendientes.length} pendiente{cobrosPendientes.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-center px-4 py-3">
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mb-0.5">Total recibido</p>
                  <p className="text-lg font-bold text-emerald-600 tabular-nums">
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
                      cobrosRecibidos.reduce((s, r) => s + r.monto_pago, 0)
                    )}
                  </p>
                  <p className="text-[10px] text-gray-400">{cobrosRecibidos.length} pago{cobrosRecibidos.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}

            {/* Contenido */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              {cobrosLoading ? (
                <div className="flex items-center justify-center py-10">
                  <span className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                </div>
              ) : cobrosRecibidos.length === 0 && cobrosPendientes.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">No hay cobros registrados aún</p>
                </div>
              ) : (
                <>
                  {/* Pendientes */}
                  {cobrosPendientes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pendientes de recibir ({cobrosPendientes.length})
                      </p>
                      {cobrosPendientes.map(p => (
                        <button
                          key={p.id_presupuesto}
                          onClick={() => { setCobrosOpen(false); abrirModal(p.id_incidente, 'detalles') }}
                          className="w-full text-left bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 hover:bg-amber-100/70 active:bg-amber-100 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-amber-700 font-semibold">Incidente #{p.id_incidente}</span>
                            <span className="text-sm font-bold text-amber-600">
                              {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.monto_a_recibir)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1">{p.descripcion_problema}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recibidos */}
                  {cobrosRecibidos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Recibidos ({cobrosRecibidos.length})
                      </p>
                      {cobrosRecibidos.map(r => {
                        const m = r.metodo_pago?.toLowerCase()
                        const MetIcon = m === 'efectivo' ? Banknote : m === 'transferencia' ? Building2 : m === 'debito' || m === 'credito' ? CreditCard : Wallet
                        const LABELS: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito' }
                        return (
                          <button
                            key={r.id_pago_tecnico}
                            onClick={() => { setCobrosOpen(false); abrirModal(r.id_incidente, 'detalles') }}
                            className="w-full text-left bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-gray-500 font-medium">Incidente #{r.id_incidente}</span>
                              <span className="text-sm font-bold text-emerald-600">
                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(r.monto_pago)}
                              </span>
                            </div>
                            {r.descripcion_problema && (
                              <p className="text-xs text-gray-400 line-clamp-1 mb-2">{r.descripcion_problema}</p>
                            )}
                            <div className="flex items-center justify-between">
                              {r.metodo_pago && (
                                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                  <MetIcon className="w-3 h-3" />
                                  {LABELS[r.metodo_pago] ?? r.metodo_pago}
                                  {r.banco && <span className="text-gray-300">· {r.banco}</span>}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 tabular-nums">
                                {format(new Date(r.fecha_pago), "d MMM yy", { locale: es })}
                              </span>
                            </div>
                            {r.referencia_pago && (
                              <p className="text-[11px] text-gray-400 mt-1">Ref: <span className="font-mono">{r.referencia_pago}</span></p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialog de baja con motivo obligatorio */}
      {cancelDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isCancelling && (setCancelDialog(null), setMotivoBaja(''))} />
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="bg-red-500 px-5 pt-5 pb-4 flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">Darme de baja del trabajo</p>
                <p className="text-red-100 text-xs mt-0.5">Incidente #{cancelDialog.id_incidente}</p>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="px-5 py-4 space-y-4">

              {/* Aviso */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
                <p className="font-semibold">¿Qué pasa si me doy de baja?</p>
                <ul className="space-y-0.5 pl-4 list-disc">
                  <li>El incidente vuelve a <strong>pendiente</strong> para reasignarlo</li>
                  <li>Queda registrado en tu <strong>historial de confiabilidad</strong></li>
                  <li>Esta acción <strong>no se puede deshacer</strong></li>
                </ul>
              </div>

              {/* Selector de motivo */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">¿Por qué te das de baja?</p>
                <div className="space-y-2">
                  {[
                    'Emergencia personal o familiar',
                    'Problema de movilidad o transporte',
                    'No puedo cumplir con el horario acordado',
                    'El trabajo excede mis capacidades técnicas',
                    'Otro motivo',
                  ].map(opcion => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setMotivoBaja(opcion)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                        motivoBaja === opcion
                          ? 'border-red-400 bg-red-50 text-red-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 px-5 pb-6">
              <button
                onClick={() => { setCancelDialog(null); setMotivoBaja('') }}
                disabled={isCancelling}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={confirmarCancelacion}
                disabled={!motivoBaja || isCancelling}
                className="flex-1 py-3 rounded-xl bg-red-500 text-sm font-semibold text-white active:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar baja'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
