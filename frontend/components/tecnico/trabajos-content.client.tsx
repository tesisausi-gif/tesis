'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  MapPin, ClipboardList, Clock, Wrench, FileText, CheckCircle, AlertTriangle, XCircle,
  Phone, Mail, ChevronDown, ChevronUp, AlertCircle, CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { AgendaTecnicoModal } from '@/components/shared/agenda-tecnico-modal.client'
import type { AsignacionTecnico } from '@/features/asignaciones/asignaciones.types'
import { createClient } from '@/shared/lib/supabase/client'
import { cancelarAsignacionAceptada } from '@/features/asignaciones/asignaciones.service'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ConformidadInfo {
  id_conformidad: number
  id_incidente: number
  esta_firmada: number | boolean
  url_documento: string | null
}

interface TrabajosContentProps {
  asignaciones: AsignacionTecnico[]
  estadoPresupuestoPorIncidente: Record<number, string>
  conformidadesPorIncidente: Record<number, ConformidadInfo>
  idTecnico: number
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
    return { mensaje: 'Conformidad subida — esperando firma del cliente', urgente: false }
  }
  return null
}

// ── Mapa de estado visual (mismo patrón que cliente) ─────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string
  borderColor: string
  pillBg: string
  pillText: string
  Icon: React.ElementType
}> = {
  aceptada:            { label: 'Aceptado',       borderColor: 'border-l-blue-400',   pillBg: 'bg-blue-100',   pillText: 'text-blue-700',   Icon: ClipboardList },
  en_curso:            { label: 'En curso',        borderColor: 'border-l-orange-400', pillBg: 'bg-orange-100', pillText: 'text-orange-700', Icon: Wrench },
  completada_pendiente:{ label: 'Pend. revisión',  borderColor: 'border-l-amber-400',  pillBg: 'bg-amber-100',  pillText: 'text-amber-700',  Icon: Clock },
  finalizado:          { label: 'Finalizado',      borderColor: 'border-l-green-400',  pillBg: 'bg-green-100',  pillText: 'text-green-700',  Icon: CheckCircle },
}

function getStatusKey(a: AsignacionTecnico): string {
  if (a.estado_asignacion === 'completada') {
    return ['finalizado', 'resuelto'].includes(a.incidentes?.estado_actual ?? '')
      ? 'finalizado'
      : 'completada_pendiente'
  }
  return a.estado_asignacion
}

// ── Componente ───────────────────────────────────────────────────────────────

export function TrabajosContent({
  asignaciones,
  estadoPresupuestoPorIncidente,
  conformidadesPorIncidente,
  idTecnico,
}: TrabajosContentProps) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<string>('en_proceso')
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

  const enProceso = asignaciones.filter(a =>
    ['aceptada', 'en_curso', 'completada_pendiente'].includes(getStatusKey(a))
  )
  const resueltas = asignaciones.filter(a => getStatusKey(a) === 'finalizado')

  // Stats por categoría
  const counts = {
    aceptada: asignaciones.filter(a => getStatusKey(a) === 'aceptada').length,
    en_curso: asignaciones.filter(a => getStatusKey(a) === 'en_curso').length,
    pendiente: asignaciones.filter(a => getStatusKey(a) === 'completada_pendiente').length,
    finalizado: asignaciones.filter(a => getStatusKey(a) === 'finalizado').length,
  }

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
    const key = getStatusKey(asig)
    const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.aceptada
    const { Icon } = cfg

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
        className={`bg-white rounded-2xl border-l-4 shadow-sm overflow-hidden ${cfg.borderColor}`}
      >
        <div className="px-4 py-4">
          {/* Fila 1: ID + estado */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-gray-900 shrink-0">Incidente #{asig.id_incidente}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.pillBg} ${cfg.pillText}`}>
                <Icon className="w-2.5 h-2.5" />
                {cfg.label}
              </span>
            </div>
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

          {/* Descripción */}
          {incidente?.descripcion_problema && (
            <p className="text-sm text-gray-700 line-clamp-2 mb-3 leading-snug">
              {incidente.descripcion_problema}
            </p>
          )}

          {/* Dirección + fecha */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-400 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{direccion}</span>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {formatFecha(asig.fecha_asignacion)}
            </span>
          </div>

          {/* Categoría + contacto toggle */}
          <div className="flex items-center justify-between mt-2">
            {incidente?.categoria && (
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {incidente.categoria}
              </span>
            )}
            {cliente && (
              <button
                onClick={() => setContactoExpandido(contactoAbierto ? null : asig.id_asignacion)}
                className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors ml-auto"
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

        {/* Acciones — 3 chips en fila */}
        <div className="flex border-t border-gray-100">
          {[
            { label: 'Detalles',  icon: FileText,      tab: 'detalles',    className: 'text-gray-600' },
            { label: 'Timeline',  icon: Clock,         tab: 'timeline',    className: 'text-blue-500' },
            { label: 'Gestión',   icon: Wrench,        tab: 'inspecciones',className: 'text-gray-900' },
          ].map(({ label, icon: IcoComp, tab, className }, i) => (
            <button
              key={tab}
              onClick={() => abrirModal(asig.id_incidente, tab)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 active:bg-gray-50 transition-colors ${i < 2 ? 'border-r border-gray-100' : ''}`}
            >
              <IcoComp className={`w-4 h-4 ${className}`} />
              <span className={`text-[10px] font-semibold ${className}`}>{label}</span>
            </button>
          ))}
        </div>

        {/* Ver Mi Agenda — solo para trabajos activos */}
        {(asig.estado_asignacion === 'aceptada' || asig.estado_asignacion === 'en_curso') && (
          <div className="flex border-t border-gray-100">
            <AgendaTecnicoModal
              idTecnico={asig.id_tecnico}
              triggerLabel="Ver Mi Agenda"
              triggerClassName="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors text-xs font-semibold"
            />
          </div>
        )}

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
        <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Mis Trabajos</h1>
        <p className="text-sm text-gray-400">Incidentes asignados a vos</p>
      </div>

      {asignaciones.length === 0 ? (
        <EmptyState mensaje="Cuando aceptes una asignación, aparecerá aquí." />
      ) : (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-4 bg-white border-b border-gray-100">
            {[
              { label: 'Aceptados',  count: counts.aceptada,   color: 'text-blue-500' },
              { label: 'En curso',   count: counts.en_curso,   color: 'text-orange-500' },
              { label: 'Revisión',   count: counts.pendiente,  color: 'text-amber-500' },
              { label: 'Finaliz.',   count: counts.finalizado, color: 'text-green-500' },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col items-center justify-center py-3 border-r border-gray-100 last:border-0">
                <span className={`text-xl font-bold ${stat.color}`}>{stat.count}</span>
                <span className="text-[9px] text-gray-400 font-medium leading-tight text-center mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>

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
          <div className="px-4 pt-3 space-y-3">
            {listaFiltrada.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No hay incidentes en este estado
              </div>
            ) : (
              listaFiltrada.map(a => renderCard(a))
            )}
          </div>
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
