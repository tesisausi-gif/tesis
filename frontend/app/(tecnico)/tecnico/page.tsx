import { createClient } from '@/shared/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, CheckCircle2, Clock, Star } from 'lucide-react'
import Link from 'next/link'
import { getTecnicoBadgeCounts } from '@/features/notificaciones/badge-counts.service'

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

  const badgeCounts = await getTecnicoBadgeCounts().catch(() => ({ disponibles: 0, trabajos: 0 }))

  const trabajosActivos = asignaciones?.filter(a =>
    a.estado_asignacion === 'en_curso'
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

      {/* Alerta: Trabajos listos para conformidad */}
      {badgeCounts.trabajos > 0 && (
        <Link href="/tecnico/trabajos" className="block">
          <Card className="border-2 border-amber-400 bg-amber-50 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <ClipboardList className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800">
                  {badgeCounts.trabajos === 1
                    ? 'Tenés 1 trabajo listo para subir conformidad'
                    : `Tenés ${badgeCounts.trabajos} trabajos listos para subir conformidad`}
                </p>
                <p className="text-sm text-amber-600">Tocá para ir a Trabajos →</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

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
                    case 'en_curso':
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
