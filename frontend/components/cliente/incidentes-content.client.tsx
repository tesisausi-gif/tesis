'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, AlertCircle, Eye, Clock } from 'lucide-react'
import {
  getEstadoIncidenteColor,
  getEstadoIncidenteLabel,
  getPrioridadColor,
} from '@/shared/utils/colors'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { EstadoIncidente, NivelPrioridad } from '@/shared/types/enums'
import type { Incidente } from '@/features/incidentes/incidentes.types'

interface IncidentesContentProps {
  incidentes: Incidente[]
}

export function IncidentesContent({ incidentes }: IncidentesContentProps) {
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Helpers locales eliminados

  const abrirModal = (id: number) => {
    setIncidenteSeleccionado(id)
    setModalOpen(true)
  }

  // Stats
  const totalIncidentes = incidentes.length
  const pendientes = incidentes.filter(i =>
    i.estado_actual !== EstadoIncidente.RESUELTO
  ).length
  const resueltos = incidentes.filter(i => i.estado_actual === EstadoIncidente.RESUELTO).length

  return (
    <div className="space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mis Incidentes</h1>
          <p className="text-sm md:text-base text-gray-600">
            Historial de incidentes reportados
          </p>
        </div>

        <Button asChild className="w-full sm:w-auto gap-2">
          <Link href="/cliente/incidentes/nuevo">
            <Plus className="h-4 w-4" />
            Reportar Incidente
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      {incidentes.length > 0 && (
        <div className="grid gap-3 grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{totalIncidentes}</div>
              <p className="text-xs text-blue-600">Total</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{pendientes}</div>
              <p className="text-xs text-yellow-600">En curso</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{resueltos}</div>
              <p className="text-xs text-green-600">Resueltos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Incidentes */}
      {incidentes.length > 0 ? (
        <div className="grid gap-3">
          {incidentes.map((incidente) => {
            const inmueble = incidente.inmuebles
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
                key={incidente.id_incidente}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => abrirModal(incidente.id_incidente)}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        Incidente #{incidente.id_incidente}
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm line-clamp-1">
                        {direccion}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={getEstadoIncidenteColor(incidente.estado_actual)}>
                        {getEstadoIncidenteLabel(incidente.estado_actual)}
                      </Badge>
                      {incidente.nivel_prioridad && (
                        <Badge variant="outline" className={getPrioridadColor(incidente.nivel_prioridad)}>
                          {incidente.nivel_prioridad}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {incidente.descripcion_problema}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(incidente.fecha_registro), 'dd/MM/yy', { locale: es })}
                      </span>
                      {incidente.categoria && (
                        <span>{incidente.categoria}</span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-blue-100 p-4 mb-6">
              <AlertCircle className="h-12 w-12 text-blue-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes incidentes reportados
            </h3>

            <p className="text-sm text-gray-600 max-w-md">
              ¿Tienes un problema en alguno de tus inmuebles? Usa el botón de arriba para reportar un incidente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalle */}
      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="cliente"
      />
    </div>
  )
}
