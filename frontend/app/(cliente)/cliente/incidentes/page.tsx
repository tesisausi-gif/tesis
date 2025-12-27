import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function ClienteIncidentes() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Obtener id_cliente del usuario
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id_cliente')
    .eq('id', user.id)
    .single()

  // Obtener incidentes del cliente
  const { data: incidentes } = await supabase
    .from('incidentes')
    .select(`
      *,
      inmuebles (
        calle,
        altura,
        piso,
        dpto,
        barrio
      )
    `)
    .eq('id_cliente_reporta', usuario?.id_cliente)
    .order('fecha_registro', { ascending: false })

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'en_proceso':
        return 'bg-blue-100 text-blue-800'
      case 'completado':
        return 'bg-green-100 text-green-800'
      case 'cancelado':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPrioridadBadgeColor = (prioridad: string) => {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mis Incidentes</h1>
        <p className="text-gray-600 mt-1">
          Historial de incidentes reportados
        </p>
      </div>

      {incidentes && incidentes.length > 0 ? (
        <div className="grid gap-4">
          {incidentes.map((incidente) => {
            // Construir dirección dinámicamente
            const inmueble = incidente.inmuebles
            const direccion = inmueble
              ? [
                  inmueble.calle,
                  inmueble.altura,
                  inmueble.piso && `Piso ${inmueble.piso}`,
                  inmueble.dpto && `Dpto ${inmueble.dpto}`
                ]
                  .filter(Boolean)
                  .join(' ') + (inmueble.barrio ? `, ${inmueble.barrio}` : '')
              : 'Sin dirección'

            return (
              <Card key={incidente.id_incidente}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        Incidente #{incidente.id_incidente}
                      </CardTitle>
                      <CardDescription>
                        {direccion}
                      </CardDescription>
                    </div>
                  <div className="flex gap-2">
                    <Badge className={getEstadoBadgeColor(incidente.estado_actual)}>
                      {incidente.estado_actual}
                    </Badge>
                    {incidente.nivel_prioridad && (
                      <Badge className={getPrioridadBadgeColor(incidente.nivel_prioridad)}>
                        {incidente.nivel_prioridad}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-4">
                  {incidente.descripcion_problema}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Categoría:</span>{' '}
                    {incidente.categoria || 'Sin categoría'}
                  </div>
                  <div>
                    <span className="font-medium">Fecha de reporte:</span>{' '}
                    {format(new Date(incidente.fecha_registro), 'dd/MM/yyyy', { locale: es })}
                  </div>
                  {incidente.fecha_cierre && (
                    <div>
                      <span className="font-medium">Fecha de cierre:</span>{' '}
                      {format(new Date(incidente.fecha_cierre), 'dd/MM/yyyy', { locale: es })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-600">
              No tienes incidentes reportados
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
