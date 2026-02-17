'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, MapPin, Home, ArrowLeft, AlertCircle, Calendar, User, Wrench } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { estadoIncidenteColors, estadoIncidenteLabels, prioridadColors } from '@/shared/types'
import type { InmuebleConCliente } from '@/features/inmuebles/inmuebles.types'
import type { EstadoIncidente, NivelPrioridad } from '@/shared/types'

interface IncidenteDeInmueble {
  id_incidente: number
  descripcion_problema: string
  estado_actual: string
  nivel_prioridad: string | null
  categoria: string | null
  fecha_registro: string
  asignaciones_tecnico: {
    tecnicos: { nombre: string; apellido: string } | null
  }[]
}

interface InmuebleDetalleContentProps {
  inmueble: InmuebleConCliente
  incidentes: IncidenteDeInmueble[]
}

const getDireccionCompleta = (inmueble: InmuebleConCliente) => {
  const partes = [
    inmueble.calle,
    inmueble.altura,
    inmueble.piso ? `Piso ${inmueble.piso}` : null,
    inmueble.dpto ? `Dpto ${inmueble.dpto}` : null,
  ].filter(Boolean)
  return partes.join(' ')
}

export function InmuebleDetalleContent({ inmueble, incidentes }: InmuebleDetalleContentProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalle del Inmueble</h1>
            <p className="text-gray-600">Información completa y incidentes asociados</p>
          </div>
        </div>

        {/* Información del Inmueble */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>{inmueble.tipos_inmuebles?.nombre || 'Inmueble'}</CardTitle>
                  <CardDescription>{getDireccionCompleta(inmueble)}</CardDescription>
                </div>
              </div>
              <Badge variant={inmueble.esta_activo ? 'default' : 'secondary'} className={inmueble.esta_activo ? 'bg-green-500' : 'bg-gray-500'}>
                {inmueble.esta_activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ubicación */}
            <div>
              <h3 className="font-semibold text-sm text-gray-600 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ubicación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                <div>
                  <p className="text-sm text-gray-600">Provincia</p>
                  <p className="font-medium">{inmueble.provincia || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Localidad</p>
                  <p className="font-medium">{inmueble.localidad || '-'}</p>
                </div>
                {inmueble.barrio && (
                  <div>
                    <p className="text-sm text-gray-600">Barrio</p>
                    <p className="font-medium">{inmueble.barrio}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dirección */}
            <div>
              <h3 className="font-semibold text-sm text-gray-600 mb-2 flex items-center gap-2">
                <Home className="h-4 w-4" />
                Dirección
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-6">
                <div>
                  <p className="text-sm text-gray-600">Calle</p>
                  <p className="font-medium">{inmueble.calle || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Altura</p>
                  <p className="font-medium">{inmueble.altura || '-'}</p>
                </div>
                {inmueble.piso && (
                  <div>
                    <p className="text-sm text-gray-600">Piso</p>
                    <p className="font-medium">{inmueble.piso}</p>
                  </div>
                )}
                {inmueble.dpto && (
                  <div>
                    <p className="text-sm text-gray-600">Departamento</p>
                    <p className="font-medium">{inmueble.dpto}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Propietario */}
            {inmueble.clientes && (
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Propietario
                </h3>
                <div className="ml-6">
                  <p className="font-medium">{inmueble.clientes.nombre} {inmueble.clientes.apellido}</p>
                  <p className="text-sm text-gray-600">{inmueble.clientes.correo_electronico}</p>
                </div>
              </div>
            )}

            {/* Información Adicional */}
            {inmueble.informacion_adicional && (
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Información Adicional</h3>
                <p className="text-sm ml-6">{inmueble.informacion_adicional}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incidentes Relacionados */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Incidentes Relacionados</CardTitle>
                <CardDescription>
                  {incidentes.length} {incidentes.length === 1 ? 'incidente registrado' : 'incidentes registrados'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {incidentes.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No hay incidentes registrados para este inmueble</p>
            ) : (
              <div className="space-y-3">
                {incidentes.map((incidente) => {
                  const tecnicoAsignado = incidente.asignaciones_tecnico?.[0]?.tecnicos
                  return (
                    <div
                      key={incidente.id_incidente}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">#{incidente.id_incidente}</h4>
                        <div className="flex gap-2">
                          <Badge className={estadoIncidenteColors[incidente.estado_actual as EstadoIncidente] || 'bg-gray-100 text-gray-800'}>
                            {estadoIncidenteLabels[incidente.estado_actual as EstadoIncidente] || incidente.estado_actual}
                          </Badge>
                          {incidente.nivel_prioridad ? (
                            <Badge className={prioridadColors[incidente.nivel_prioridad as NivelPrioridad] || 'bg-gray-100 text-gray-800'}>
                              {incidente.nivel_prioridad}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-400">Sin prioridad</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{incidente.descripcion_problema}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(incidente.fecha_registro), 'dd/MM/yyyy', { locale: es })}
                        </div>
                        {tecnicoAsignado && (
                          <div className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {tecnicoAsignado.nombre} {tecnicoAsignado.apellido}
                          </div>
                        )}
                        {incidente.categoria && (
                          <Badge variant="outline" className="text-xs">
                            {incidente.categoria}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
