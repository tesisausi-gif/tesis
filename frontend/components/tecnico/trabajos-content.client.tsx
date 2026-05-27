'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import {
  MapPin, ClipboardList, Clock, Wrench, FileText, CheckCircle, AlertTriangle, XCircle,
  Phone, Mail, ChevronDown, ChevronUp, AlertCircle, CalendarDays, CreditCard, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { AsignacionTecnico } from '@/features/asignaciones/asignaciones.types'
import { createClient } from '@/shared/lib/supabase/client'
import { cancelarAsignacionAceptada } from '@/features/asignaciones/asignaciones.service'
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
    if (!conformidad?.url_documento) {
      return { mensaje: 'Subí la conformidad para finalizar el trabajo', urgente: true }
    }
    return { mensaje: 'Conformidad subida — esperando revisión del administrador', urgente: false }
  }
  return null
}

// ── Iconos por sub-estado (los colores/labels vienen de SUB_ESTADO_EN_PROCESO_CONFIG) ──

const ICON_BY_SUB_ESTADO: Record<SubEstadoEnProceso, React.ElementType> = {
  aceptada:              ClipboardList,
  presupuesto_enviado:   FileText,
  presupuesto_cliente:   Clock,
  en_curso:              Wrench,
  completada_pendiente:  Clock,
  conformidad_rechazada: XCircle,
  finalizado:            CheckCircle,
}

const QUICK_ACTION_TECNICO: Record<SubEstadoEnProceso, {
  label: string
  Icon: React.ElementType
  color: string
  disabled: boolean
  tab: string
}> = {
  aceptada:              { label: 'Cargar presup.', Icon: FileText,     color: 'text-blue-600',   disabled: false, tab: 'presupuesto'  },
  presupuesto_enviado:   { label: 'Pend. admin',    Icon: Clock,        color: 'text-gray-300',   disabled: true,  tab: 'presupuesto'  },
  presupuesto_cliente:   { label: 'Pend. cliente',  Icon: Clock,        color: 'text-gray-300',   disabled: true,  tab: 'presupuesto'  },
  en_curso:              { label: 'Subir conform.', Icon: ClipboardList, color: 'text-purple-600', disabled: false, tab: 'conformidad'  },
  completada_pendiente:  { label: 'Por revisar',    Icon: Clock,        color: 'text-gray-300',   disabled: true,  tab: 'conformidad'  },
  conformidad_rechazada: { label: 'Resubir',        Icon: RefreshCw,    color: 'text-orange-600', disabled: false, tab: 'conformidad'  },
  finalizado:            { label: 'Cobro pend.',    Icon: Clock,        color: 'text-gray-300',   disabled: true,  tab: 'inspecciones' },
}

function getStatusKey(
  a: AsignacionTecnico,
  estadoPresupuesto?: string,
  conformidad?: ConformidadInfo
): string {
  const estadoInc = a.incidentes?.estado_actual ?? ''
  if (['finalizado', 'resuelto'].includes(estadoInc)) return 'finalizado'

  if (a.estado_asignacion === 'completada') {
    if (conformidad?.esta_rechazada) return 'conformidad_rechazada'
    return 'completada_pendiente'
  }

  if (['aceptada', 'en_curso'].includes(a.estado_asignacion)) {
    if (estadoPresupuesto === 'enviado') return 'presupuesto_enviado'
    if (estadoPresupuesto === 'aprobado_admin') return 'presupuesto_cliente'
    if (estadoPresupuesto === 'aprobado') return 'en_curso'
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
}: TrabajosContentProps) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<string>('en_proceso')
  const [subFiltro, setSubFiltro] = useState<string>('todos')
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalTab, setModalTab] = useState('detalles')
  const [modalOpen, setModalOpen] = useState(false)
  const [cancelDialog, setCancelDialog] = useState<AsignacionTecnico | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [contactoExpandido, setContactoExpandido] = useState<number | null>(null)

  const abrirModal = (id: number, tab = 'detalles') => {
    setIncidenteSeleccionado(id)
    setModalTab(tab)
    setModalOpen(true)
  }

  const confirmarCancelacion = async () => {
    if (!cancelDialog) return
    setIsCancelling(true)
    try {
      const res = await cancelarAsignacionAceptada(cancelDialog.id_asignacion, cancelDialog.id_incidente)
      if (res.success) {
        toast.success('Trabajo cancelado', { description: `Incidente #${cancelDialog.id_incidente} devuelto a pendiente.` })
        setCancelDialog(null)
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo cancelar el trabajo')
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

  useEffect(() => { setSubFiltro('todos') }, [filtro])

  const sk = (a: AsignacionTecnico) =>
    getStatusKey(a, estadoPresupuestoPorIncidente[a.id_incidente], conformidadesPorIncidente[a.id_incidente])

  const EN_PROCESO_KEYS = ['aceptada', 'presupuesto_enviado', 'presupuesto_cliente', 'en_curso', 'completada_pendiente', 'conformidad_rechazada']
  const enProceso = asignaciones.filter(a => EN_PROCESO_KEYS.includes(sk(a)))
  const resueltas = asignaciones.filter(a => sk(a) === 'finalizado')

  const filtros = [
    { id: 'todos',      label: 'Todos',       count: asignaciones.length, Icon: ClipboardList },
    { id: 'en_proceso', label: 'En proceso',  count: enProceso.length,    Icon: Wrench },
    { id: 'resueltos',  label: 'Finalizados', count: resueltas.length,    Icon: CheckCircle },
  ]

  const listaFiltrada =
    filtro === 'resueltos' ? resueltas :
    filtro === 'en_proceso' ? enProceso :
    asignaciones

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
          {key === 'finalizado' && incidentesPagadosIds.includes(asig.id_incidente) ? (
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
        <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Incidentes</h1>
        <p className="text-sm text-gray-400">Mis trabajos</p>
      </div>

      {asignaciones.length === 0 ? (
        <EmptyState mensaje="Cuando aceptes una asignación, aparecerá aquí." />
      ) : (
        <>
          {/* Filter chips */}
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

          {/* Lista */}
          {listaFiltrada.length === 0 ? (
            <div className="px-4 pt-3 text-center py-12 text-gray-400 text-sm">
              No hay incidentes en este estado
            </div>
          ) : filtro === 'en_proceso' ? (
            /* ── Vista agrupada para En Proceso ── */
            <div className="px-4 pt-3 space-y-4">
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
                    {listaFiltrada.length}
                  </span>
                </button>
                {(['aceptada', 'presupuesto_enviado', 'presupuesto_cliente', 'en_curso', 'completada_pendiente', 'conformidad_rechazada'] as const).map(tipo => {
                  const count = listaFiltrada.filter(a => sk(a) === tipo).length
                  if (count === 0) return null
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
              {((['aceptada', 'presupuesto_enviado', 'presupuesto_cliente', 'en_curso', 'completada_pendiente', 'conformidad_rechazada'] as const)
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
            /* ── Finalizados con sub-filtro de cobro ── */
            (() => {
              const cobrados = listaFiltrada.filter(a => incidentesPagadosIds.includes(a.id_incidente))
              const cobroPendiente = listaFiltrada.filter(a => !incidentesPagadosIds.includes(a.id_incidente))
              const listaFinal =
                subFiltro === 'cobrado' ? cobrados :
                subFiltro === 'cobro_pendiente' ? cobroPendiente :
                listaFiltrada
              return (
                <div className="px-4 pt-3 space-y-4">
                  <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-slate-100 p-1 rounded-xl">
                    {([
                      { id: 'todos',          label: 'Todos',          count: listaFiltrada.length },
                      { id: 'cobro_pendiente', label: 'Cobro pendiente', count: cobroPendiente.length },
                      { id: 'cobrado',        label: 'Cobrados',       count: cobrados.length },
                    ] as const).map(({ id, label, count }) => {
                      const active = subFiltro === id
                      return (
                        <button
                          key={id}
                          onClick={() => setSubFiltro(id)}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                          }`}
                        >
                          {label}
                          {count > 0 && (
                            <span className={`text-[10px] font-bold rounded-full px-1.5 py-px ${active ? 'bg-slate-200 text-slate-700' : 'bg-slate-200/60 text-slate-400'}`}>
                              {count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {listaFinal.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">No hay incidentes en este sub-estado</div>
                  ) : (
                    <div className="space-y-3">{listaFinal.map(a => renderCard(a))}</div>
                  )}
                </div>
              )
            })()
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

      {/* Dialog de confirmación de cancelación */}
      {cancelDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isCancelling && setCancelDialog(null)} />
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
            {/* Header rojo */}
            <div className="bg-red-500 px-5 pt-5 pb-4 flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">¿Cancelar este trabajo?</p>
                <p className="text-red-100 text-xs mt-0.5">Incidente #{cancelDialog.id_incidente}</p>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="px-5 py-4 space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-red-700 font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Consecuencias de cancelar:
                </div>
                <ul className="text-xs text-red-600 space-y-1 pl-6 list-disc">
                  <li>Se registrará una <strong>calificación de 1 estrella</strong> en tu historial</li>
                  <li>El incidente volverá a <strong>pendiente</strong> para que se asigne a otro técnico</li>
                  <li>Esta acción <strong>no se puede deshacer</strong></li>
                </ul>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 px-5 pb-6">
              <button
                onClick={() => setCancelDialog(null)}
                disabled={isCancelling}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-50"
              >
                No, continuar
              </button>
              <button
                onClick={confirmarCancelacion}
                disabled={isCancelling}
                className="flex-1 py-3 rounded-xl bg-red-500 text-sm font-semibold text-white active:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Sí, cancelar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
