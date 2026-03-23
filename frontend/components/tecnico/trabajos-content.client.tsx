'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  MapPin, ClipboardList, Clock, Wrench, FileText, CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { AsignacionTecnico } from '@/features/asignaciones/asignaciones.types'
import { createClient } from '@/shared/lib/supabase/client'

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

  const abrirModal = (id: number, tab = 'detalles') => {
    setIncidenteSeleccionado(id)
    setModalTab(tab)
    setModalOpen(true)
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
    { id: 'resueltos',  label: 'Resueltos',   count: resueltas.length,    Icon: CheckCircle },
  ]

  const listaFiltrada =
    filtro === 'resueltos' ? resueltas :
    filtro === 'en_proceso' ? enProceso :
    asignaciones

  // ── Card ────────────────────────────────────────────────────────────────

  const renderCard = (asig: AsignacionTecnico) => {
    const incidente = asig.incidentes
    const inmueble = incidente?.inmuebles
    const key = getStatusKey(asig)
    const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.aceptada
    const { Icon } = cfg

    const direccionPartes = inmueble
      ? [inmueble.calle, inmueble.altura, inmueble.piso && `Piso ${inmueble.piso}`, inmueble.dpto && `Dpto ${inmueble.dpto}`].filter(Boolean).join(' ')
      : ''
    const ubicacion = inmueble ? [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ') : ''
    const direccion = ubicacion ? `${direccionPartes}, ${ubicacion}` : direccionPartes || 'Sin dirección'

    return (
      <div
        key={asig.id_asignacion}
        className={`bg-white rounded-2xl border-l-4 shadow-sm overflow-hidden ${cfg.borderColor}`}
      >
        <div className="px-4 py-4">
          {/* Fila 1: ID + estado + flecha */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-gray-900 shrink-0">Incidente #{asig.id_incidente}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.pillBg} ${cfg.pillText}`}>
                <Icon className="w-2.5 h-2.5" />
                {cfg.label}
              </span>
            </div>
          </div>

          {/* Fila 2: Descripción */}
          {incidente?.descripcion_problema && (
            <p className="text-sm text-gray-700 line-clamp-2 mb-3 leading-snug">
              {incidente.descripcion_problema}
            </p>
          )}

          {/* Fila 3: Dirección + fecha */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-400 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{direccion}</span>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {format(new Date(asig.fecha_asignacion + (asig.fecha_asignacion.endsWith('Z') ? '' : 'Z')), 'dd MMM yy', { locale: es })}
            </span>
          </div>

          {/* Fila 4: Categoría */}
          {incidente?.categoria && (
            <div className="mt-2">
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {incidente.categoria}
              </span>
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
        hideTabs
        onUpdate={() => router.refresh()}
      />
    </div>
  )
}
