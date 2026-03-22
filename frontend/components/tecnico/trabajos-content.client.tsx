'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  MapPin, Calendar, ClipboardList, Clock, Wrench, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getEstadoAsignacionColor,
  getEstadoAsignacionLabel,
} from '@/shared/utils/colors'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { AsignacionTecnico } from '@/features/asignaciones/asignaciones.types'
import { createClient } from '@/shared/lib/supabase/client'

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

export function TrabajosContent({ asignaciones, estadoPresupuestoPorIncidente, conformidadesPorIncidente, idTecnico }: TrabajosContentProps) {
  const router = useRouter()

  // Realtime: notificar cuando el cliente aprueba un presupuesto
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

  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalTab, setModalTab] = useState('detalles')
  const [modalOpen, setModalOpen] = useState(false)

  const abrirModal = (id: number, tab = 'detalles') => {
    setIncidenteSeleccionado(id)
    setModalTab(tab)
    setModalOpen(true)
  }

  // Stats
  const totalTrabajos = asignaciones.length
  const aceptados = asignaciones.filter(a => a.estado_asignacion === 'aceptada').length
  const enCurso = asignaciones.filter(a => a.estado_asignacion === 'en_curso').length
  const completados = asignaciones.filter(a => a.estado_asignacion === 'completada').length

  const enProceso = asignaciones.filter(a => ['aceptada', 'en_curso'].includes(a.estado_asignacion))
  const resueltas = asignaciones.filter(a => a.estado_asignacion === 'completada')

  const renderCard = (asignacion: AsignacionTecnico) => {
    const incidente = asignacion.incidentes
    const inmueble = incidente?.inmuebles

    const direccionPartes = inmueble
      ? [inmueble.calle, inmueble.altura, inmueble.piso && `Piso ${inmueble.piso}`, inmueble.dpto && `Dpto ${inmueble.dpto}`].filter(Boolean).join(' ')
      : ''
    const ubicacion = inmueble ? [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ') : ''
    const direccionInmueble = ubicacion ? `${direccionPartes}, ${ubicacion}` : direccionPartes || 'Sin dirección'

    const estado = asignacion.estado_asignacion

    return (
      <Card key={asignacion.id_asignacion} className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600 flex-shrink-0" />
                Incidente #{asignacion.id_incidente}
              </CardTitle>
              {direccionInmueble && (
                <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{direccionInmueble}</span>
                </CardDescription>
              )}
            </div>
            <Badge variant="outline" className={`flex-shrink-0 ${getEstadoAsignacionColor(estado)}`}>
              {getEstadoAsignacionLabel(estado)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-3 space-y-3">
          {incidente?.descripcion_problema && (
            <p className="text-sm text-gray-700 line-clamp-2">{incidente.descripcion_problema}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(asignacion.fecha_asignacion), 'dd/MM/yy', { locale: es })}
            </span>
            {asignacion.fecha_visita_programada && (
              <span className="flex items-center gap-1 text-blue-500">
                <Clock className="h-3 w-3" />
                Visita: {format(new Date(asignacion.fecha_visita_programada), 'dd/MM HH:mm', { locale: es })}
              </span>
            )}
            {incidente?.categoria && <span>{incidente.categoria}</span>}
          </div>

          {/* 3 acciones directas — touch-friendly */}
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              onClick={() => abrirModal(asignacion.id_incidente, 'detalles')}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 flex-shrink-0">
                <FileText className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Detalles</p>
                <p className="text-xs text-gray-400">Info del incidente y cliente</p>
              </div>
            </button>

            <button
              onClick={() => abrirModal(asignacion.id_incidente, 'timeline')}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 flex-shrink-0">
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Timeline</p>
                <p className="text-xs text-gray-400">Historial de eventos</p>
              </div>
            </button>

            <button
              onClick={() => abrirModal(asignacion.id_incidente, 'inspecciones')}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-[0.98] transition-all text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 flex-shrink-0">
                <Wrench className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Gestión</p>
                <p className="text-xs text-white/60">Inspección · Presupuesto · Ejecución</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCards = (lista: AsignacionTecnico[]) => lista.length === 0 ? (
    <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-slate-50 to-slate-100">
      <CardContent className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <ClipboardList className="h-10 w-10 text-slate-400 mb-3" />
        <p className="text-sm text-gray-500">No hay incidentes en este estado</p>
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-3">
      {lista.map((asignacion) => renderCard(asignacion))}
    </div>
  )

  return (
    <div className="space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Incidentes</h1>
        <p className="text-gray-600 text-sm mt-1">Incidentes asignados y su estado</p>
      </div>

      {asignaciones.length > 0 && (
        <div className="grid grid-cols-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {[
            { label: 'Total',      count: totalTrabajos, color: 'text-blue-600' },
            { label: 'Aceptados',  count: aceptados,     color: 'text-blue-500' },
            { label: 'En curso',   count: enCurso,       color: 'text-orange-500' },
            { label: 'Completos',  count: completados,   color: 'text-green-500' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center justify-center py-3 border-r border-gray-100 last:border-0">
              <span className={`text-xl font-bold ${s.color}`}>{s.count}</span>
              <span className="text-[9px] text-gray-400 font-medium leading-tight text-center mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {asignaciones.length > 0 && (
        <Tabs defaultValue="en_proceso">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="en_proceso" className="gap-2">
              En Proceso
              <Badge variant="secondary">{enProceso.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="resueltos" className="gap-2">
              Resueltos
              <Badge variant="secondary">{resueltas.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="en_proceso" className="mt-3">{renderCards(enProceso)}</TabsContent>
          <TabsContent value="resueltos" className="mt-3">{renderCards(resueltas)}</TabsContent>
        </Tabs>
      )}

      {asignaciones.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <ClipboardList className="h-12 w-12 text-slate-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes incidentes asignados</h3>
            <p className="text-sm text-gray-600">Cuando aceptes una asignación, aparecerá aquí.</p>
          </CardContent>
        </Card>
      )}

      {/* Modal detalle incidente */}
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
