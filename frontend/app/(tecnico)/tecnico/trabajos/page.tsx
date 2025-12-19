import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MapPin, Calendar } from 'lucide-react'

export default async function TecnicoTrabajos() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Obtener id_tecnico
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id_tecnico')
    .eq('id', user.id)
    .single()

  // Obtener todas las asignaciones con sus incidentes y propiedades
  const { data: asignaciones } = await supabase
    .from('asignaciones_tecnico')
    .select(`
      *,
      incidentes (
        *,
        propiedades (
          direccion_completa,
          tipo_propiedad
        )
      )
    `)
    .eq('id_tecnico', usuario?.id_tecnico)
    .order('fecha_asignacion', { ascending: false })

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'asignado':
        return 'bg-blue-100 text-blue-800'
      case 'en_proceso':
        return 'bg-orange-100 text-orange-800'
      case 'completado':
        return 'bg-green-100 text-green-800'
      case 'cancelado':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPrioridadColor = (prioridad: string | null) => {
    if (!prioridad) return 'bg-gray-100 text-gray-800'
    switch (prioridad) {
      case 'alta':
        return 'bg-red-100 text-red-800'
      case 'media':
        return 'bg-orange-100 text-orange-800'
      case 'baja':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Trabajos</h1>
        <p className="text-gray-600 text-sm mt-1">
          Trabajos asignados y su estado
        </p>
      </div>

      {asignaciones && asignaciones.length > 0 ? (
        <div className="space-y-4">
          {asignaciones.map((asignacion) => {
            const incidente = asignacion.incidentes
            const propiedad = incidente?.propiedades

            return (
              <Card key={asignacion.id_asignacion}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">
                        Incidente #{asignacion.id_incidente}
                      </CardTitle>
                      {propiedad && (
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{propiedad.direccion_completa}</span>
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                      <Badge className={getEstadoColor(asignacion.estado_asignacion)}>
                        {asignacion.estado_asignacion}
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
                    <p className="text-sm text-gray-700">
                      {incidente.descripcion_problema}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Asignado: {format(new Date(asignacion.fecha_asignacion), 'dd/MM/yy', { locale: es })}
                      </span>
                    </div>
                    {asignacion.fecha_visita_programada && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Visita: {format(new Date(asignacion.fecha_visita_programada), 'dd/MM/yy HH:mm', { locale: es })}
                        </span>
                      </div>
                    )}
                  </div>

                  {asignacion.observaciones && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-gray-500 mb-1">Observaciones:</p>
                      <p className="text-xs text-gray-700">{asignacion.observaciones}</p>
                    </div>
                  )}

                  {incidente?.categoria && (
                    <div className="pt-2 border-t">
                      <p className="text-xs">
                        <span className="font-medium text-gray-500">Categoría:</span>{' '}
                        {incidente.categoria}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-600">
              No tienes trabajos asignados
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
