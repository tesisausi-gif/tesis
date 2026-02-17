'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MapPin, Calendar, ClipboardList, Clock } from 'lucide-react'
import { prioridadColors, NivelPrioridad } from '@/shared/types'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { AsignacionTecnico } from '@/features/asignaciones/asignaciones.types'

interface TrabajosContentProps {
  asignaciones: AsignacionTecnico[]
}

const estadoAsignacionColors: Record<string, string> = {
  'pendiente': 'bg-yellow-100 text-yellow-800',
  'aceptada': 'bg-blue-100 text-blue-800',
  'rechazada': 'bg-red-100 text-red-800',
  'en_curso': 'bg-orange-100 text-orange-800',
  'completada': 'bg-green-100 text-green-800',
}

const estadoAsignacionLabels: Record<string, string> = {
  'pendiente': 'Pendiente',
  'aceptada': 'Aceptada',
  'rechazada': 'Rechazada',
  'en_curso': 'En Curso',
  'completada': 'Completada',
}

export function TrabajosContent({ asignaciones }: TrabajosContentProps) {
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const getEstadoAsignacionColor = (estado: string) => {
    return estadoAsignacionColors[estado] || 'bg-gray-100 text-gray-800'
  }

  const getPrioridadColor = (prioridad: string) => {
    return prioridadColors[prioridad as NivelPrioridad] || 'bg-gray-100 text-gray-800'
  }

  const abrirModal = (id: number) => {
    setIncidenteSeleccionado(id)
    setModalOpen(true)
  }

  // Stats
  const totalTrabajos = asignaciones.length
  const aceptados = asignaciones.filter(a => a.estado_asignacion === 'aceptada').length
  const enCurso = asignaciones.filter(a => a.estado_asignacion === 'en_curso').length
  const completados = asignaciones.filter(a => a.estado_asignacion === 'completada').length

  return (
    <div className="space-y-4 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Trabajos</h1>
        <p className="text-gray-600 text-sm mt-1">
          Trabajos asignados y su estado
        </p>
      </div>

      {/* Stats Cards */}
      {asignaciones.length > 0 && (
        <div className="grid gap-3 grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-blue-700">{totalTrabajos}</div>
              <p className="text-xs text-blue-600">Total</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-blue-700">{aceptados}</div>
              <p className="text-xs text-blue-600">Aceptados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-orange-700">{enCurso}</div>
              <p className="text-xs text-orange-600">En Curso</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-green-700">{completados}</div>
              <p className="text-xs text-green-600">Completados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Trabajos */}
      {asignaciones.length > 0 ? (
        <div className="space-y-3">
          {asignaciones.map((asignacion) => {
            const incidente = asignacion.incidentes
            const inmueble = incidente?.inmuebles

            const direccionPartes = inmueble
              ? [
                  inmueble.calle,
                  inmueble.altura,
                  inmueble.piso && `Piso ${inmueble.piso}`,
                  inmueble.dpto && `Dpto ${inmueble.dpto}`
                ].filter(Boolean).join(' ')
              : ''

            const ubicacion = inmueble
              ? [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ')
              : ''

            const direccion = ubicacion
              ? `${direccionPartes}, ${ubicacion}`
              : direccionPartes || 'Sin dirección'

            return (
              <Card
                key={asignacion.id_asignacion}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => abrirModal(asignacion.id_incidente)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        Incidente #{asignacion.id_incidente}
                      </CardTitle>
                      {direccion && (
                        <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{direccion}</span>
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                      <Badge className={getEstadoAsignacionColor(asignacion.estado_asignacion)}>
                        {estadoAsignacionLabels[asignacion.estado_asignacion] || asignacion.estado_asignacion}
                      </Badge>
                      {incidente?.nivel_prioridad && (
                        <Badge className={getPrioridadColor(incidente.nivel_prioridad)}>
                          {incidente.nivel_prioridad}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {incidente?.descripcion_problema && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {incidente.descripcion_problema}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(asignacion.fecha_asignacion), 'dd/MM/yy', { locale: es })}
                    </span>
                    {asignacion.fecha_visita_programada && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Clock className="h-3 w-3" />
                        Visita: {format(new Date(asignacion.fecha_visita_programada), 'dd/MM HH:mm', { locale: es })}
                      </span>
                    )}
                    {incidente?.categoria && (
                      <span>{incidente.categoria}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-slate-200 p-4 mb-6">
              <ClipboardList className="h-12 w-12 text-slate-500" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes trabajos asignados
            </h3>

            <p className="text-sm text-gray-600 max-w-md">
              Cuando te asignen un nuevo trabajo, aparecerá aquí.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalle */}
      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="tecnico"
      />
    </div>
  )
}
