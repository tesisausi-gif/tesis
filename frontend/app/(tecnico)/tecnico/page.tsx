import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, CheckCircle2, Clock, Star } from 'lucide-react'

export default async function TecnicoDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Obtener datos del técnico
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*, tecnicos(*)')
    .eq('id', user.id)
    .single()

  const tecnico = usuario?.tecnicos

  // Obtener asignaciones del técnico
  const { data: asignaciones } = await supabase
    .from('asignaciones_tecnico')
    .select('*, incidentes(*)')
    .eq('id_tecnico', tecnico?.id_tecnico)

  const trabajosActivos = asignaciones?.filter(a => 
    a.estado_asignacion === 'asignado' || a.estado_asignacion === 'en_proceso'
  ).length || 0

  const trabajosCompletados = asignaciones?.filter(a => 
    a.estado_asignacion === 'completado'
  ).length || 0

  const totalTrabajos = asignaciones?.length || 0

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Hola, {tecnico?.nombre}
          </CardTitle>
          <CardDescription>
            {tecnico?.especialidad && `Especialidad: ${tecnico.especialidad}`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Trabajos Activos
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{trabajosActivos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Completados
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{trabajosCompletados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Trabajos
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTrabajos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Calificación
              </CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tecnico?.calificacion_promedio ? tecnico.calificacion_promedio.toFixed(1) : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trabajos Recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Trabajos Recientes</CardTitle>
          <CardDescription>
            Tus últimas asignaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {asignaciones && asignaciones.length > 0 ? (
            <div className="space-y-3">
              {asignaciones.slice(0, 3).map((asignacion) => {
                const getEstadoColor = (estado: string) => {
                  switch (estado) {
                    case 'asignado':
                      return 'bg-blue-100 text-blue-800'
                    case 'en_proceso':
                      return 'bg-orange-100 text-orange-800'
                    case 'completado':
                      return 'bg-green-100 text-green-800'
                    default:
                      return 'bg-gray-100 text-gray-800'
                  }
                }

                return (
                  <div key={asignacion.id_asignacion} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        Incidente #{asignacion.id_incidente}
                      </p>
                      {asignacion.observaciones && (
                        <p className="text-xs text-gray-600 mt-1">
                          {asignacion.observaciones}
                        </p>
                      )}
                    </div>
                    <Badge className={getEstadoColor(asignacion.estado_asignacion)}>
                      {asignacion.estado_asignacion}
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-4">
              No tienes trabajos asignados
            </p>
          )}
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href="/tecnico/trabajos"
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <ClipboardList className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold">Ver Todos los Trabajos</h3>
                <p className="text-sm text-gray-600">
                  Gestiona tus asignaciones
                </p>
              </div>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
