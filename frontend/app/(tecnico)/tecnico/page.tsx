import { createClient } from '@/shared/lib/supabase/server'
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
    <div className="space-y-4 px-4 py-6 md:px-6 md:py-8">
      {/* Header - Mobile First */}
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Bienvenido, {tecnico?.nombre}
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          {tecnico?.especialidad && `Especialidad: ${tecnico.especialidad}`}
        </p>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">
                Activos
              </CardTitle>
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-orange-600">{trabajosActivos}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">
                Completados
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-green-600">{trabajosCompletados}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">
                Total
              </CardTitle>
              <ClipboardList className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-blue-600">{totalTrabajos}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">
                Calificación
              </CardTitle>
              <Star className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-yellow-600">
              {tecnico?.calificacion_promedio ? tecnico.calificacion_promedio.toFixed(1) : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trabajos Recientes */}
      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6 md:h-7 md:w-7 text-blue-600" />
            Trabajos Recientes
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
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
                  <div key={asignacion.id_asignacion} className="flex items-center justify-between p-3 md:p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm md:text-base">
                        Incidente #{asignacion.id_incidente}
                      </p>
                      {asignacion.observaciones && (
                        <p className="text-xs md:text-sm text-gray-600 mt-1">
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
            <p className="text-sm md:text-base text-gray-600 text-center py-4">
              No tienes trabajos asignados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
