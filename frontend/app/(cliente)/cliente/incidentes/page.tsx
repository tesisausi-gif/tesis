import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, AlertCircle } from 'lucide-react'
import { estadoIncidenteColors, prioridadColors, EstadoIncidente, NivelPrioridad } from '@/types/enums'

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
        barrio,
        localidad
      )
    `)
    .eq('id_cliente_reporta', usuario?.id_cliente)
    .order('fecha_registro', { ascending: false })

  const getEstadoBadgeColor = (estado: string) => {
    return estadoIncidenteColors[estado as EstadoIncidente] || 'bg-gray-100 text-gray-800'
  }

  const getPrioridadBadgeColor = (prioridad: string) => {
    return prioridadColors[prioridad as NivelPrioridad] || 'bg-gray-100 text-gray-800'
  }

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

      {incidentes && incidentes.length > 0 ? (
        <div className="grid gap-4">
          {incidentes.map((incidente) => {
            // Construir dirección dinámicamente
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
              <Card key={incidente.id_incidente} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        Incidente #{incidente.id_incidente}
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        {direccion}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {incidente.descripcion_problema}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Categoría:</span>{' '}
                      {incidente.categoria || 'Sin categoría'}
                    </div>
                    <div>
                      <span className="font-medium">Reportado:</span>{' '}
                      {format(new Date(incidente.fecha_registro), 'dd/MM/yyyy', { locale: es })}
                    </div>
                    {incidente.fecha_cierre && (
                      <div>
                        <span className="font-medium">Cerrado:</span>{' '}
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
        /* Empty State */
        <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-blue-100 p-4 mb-6">
              <AlertCircle className="h-12 w-12 text-blue-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes incidentes reportados
            </h3>

            <p className="text-sm text-gray-600 mb-6 max-w-md">
              ¿Tienes un problema en alguno de tus inmuebles? Reporta un incidente y te ayudaremos a resolverlo.
            </p>

            <Button asChild size="lg" className="gap-2">
              <Link href="/cliente/incidentes/nuevo">
                <Plus className="h-5 w-5" />
                Reportar mi primer incidente
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
