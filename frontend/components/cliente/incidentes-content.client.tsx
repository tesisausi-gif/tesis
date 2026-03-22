'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, AlertCircle, Eye, Clock, Send, Wrench, CheckCircle } from 'lucide-react'
import { getEstadoIncidenteColor, getEstadoIncidenteLabel } from '@/shared/utils/colors'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { Incidente } from '@/features/incidentes/incidentes.types'

interface IncidentesContentProps {
  incidentes: Incidente[]
}

export function IncidentesContent({ incidentes }: IncidentesContentProps) {
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const abrirModal = (id: number) => {
    setIncidenteSeleccionado(id)
    setModalOpen(true)
  }

  const pendientes = incidentes.filter(i => i.estado_actual === 'pendiente')
  const asigSolicitada = incidentes.filter(i => i.estado_actual === 'asignacion_solicitada')
  const enProceso = incidentes.filter(i => i.estado_actual === 'en_proceso')
  const resueltos = incidentes.filter(i => i.estado_actual === 'resuelto')

  const renderCards = (lista: Incidente[]) => {
    if (lista.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500 text-sm">
          No hay incidentes en este estado
        </div>
      )
    }
    return (
      <div className="grid gap-3">
        {lista.map((incidente) => {
          const inmueble = incidente.inmuebles
          const direccionPartes = inmueble
            ? [inmueble.calle, inmueble.altura, inmueble.piso && `Piso ${inmueble.piso}`, inmueble.dpto && `Dpto ${inmueble.dpto}`].filter(Boolean).join(' ')
            : ''
          const ubicacion = inmueble ? [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ') : ''
          const direccion = ubicacion ? `${direccionPartes}, ${ubicacion}` : direccionPartes || 'Sin dirección'

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
                  <Badge className={getEstadoIncidenteColor(incidente.estado_actual)}>
                    {getEstadoIncidenteLabel(incidente.estado_actual)}
                  </Badge>
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
                    {incidente.categoria && <span>{incidente.categoria}</span>}
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
    )
  }

  return (
    <div className="space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mis Incidentes</h1>
          <p className="text-sm md:text-base text-gray-600">Historial de incidentes reportados</p>
        </div>
        <Button asChild className="w-full sm:w-auto gap-2">
          <Link href="/cliente/incidentes/nuevo">
            <Plus className="h-4 w-4" />
            Reportar Incidente
          </Link>
        </Button>
      </div>

      {incidentes.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-blue-100 p-4 mb-6">
              <AlertCircle className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes incidentes reportados</h3>
            <p className="text-sm text-gray-600 max-w-md">
              ¿Tienes un problema en alguno de tus inmuebles? Usa el botón de arriba para reportar un incidente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pendiente" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pendiente" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pendientes</span>
              <span className="sm:hidden">Pend.</span>
              <Badge variant="secondary" className="ml-1 text-xs">{pendientes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="asignacion_solicitada" className="flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Asig. Solicitada</span>
              <span className="sm:hidden">Asig.</span>
              <Badge variant="secondary" className="ml-1 text-xs">{asigSolicitada.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="en_proceso" className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">En Proceso</span>
              <span className="sm:hidden">Proc.</span>
              <Badge variant="secondary" className="ml-1 text-xs">{enProceso.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="resuelto" className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Resueltos</span>
              <span className="sm:hidden">Resuel.</span>
              <Badge variant="secondary" className="ml-1 text-xs">{resueltos.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendiente" className="mt-3">{renderCards(pendientes)}</TabsContent>
          <TabsContent value="asignacion_solicitada" className="mt-3">{renderCards(asigSolicitada)}</TabsContent>
          <TabsContent value="en_proceso" className="mt-3">{renderCards(enProceso)}</TabsContent>
          <TabsContent value="resuelto" className="mt-3">{renderCards(resueltos)}</TabsContent>
        </Tabs>
      )}

      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="cliente"
      />
    </div>
  )
}
