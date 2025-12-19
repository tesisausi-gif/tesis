import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Building2, CheckCircle2, Clock } from 'lucide-react'

export default async function ClienteDashboard() {
  const supabase = await createClient()

  // Obtener el usuario actual
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Obtener datos del cliente
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*, clientes(*)')
    .eq('id', user.id)
    .single()

  // Obtener estadísticas de incidentes
  const { data: incidentes } = await supabase
    .from('incidentes')
    .select('id_incidente, estado_actual')
    .eq('id_cliente_reporta', usuario?.id_cliente)

  const incidentesAbiertos = incidentes?.filter(i =>
    i.estado_actual === 'pendiente' || i.estado_actual === 'en_proceso'
  ).length || 0

  const incidentesCerrados = incidentes?.filter(i =>
    i.estado_actual === 'completado'
  ).length || 0

  const totalIncidentes = incidentes?.length || 0

  // Obtener propiedades
  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id_propiedad')
    .or(`id_propietario.eq.${usuario?.id_cliente},id_inquilino.eq.${usuario?.id_cliente}`)

  const totalPropiedades = propiedades?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {usuario?.nombre}
        </h1>
        <p className="text-gray-600 mt-1">
          Aquí puedes ver el resumen de tus incidentes y propiedades
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Incidentes
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncidentes}</div>
            <p className="text-xs text-muted-foreground">
              Incidentes reportados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Incidentes Abiertos
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentesAbiertos}</div>
            <p className="text-xs text-muted-foreground">
              En proceso o pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Incidentes Resueltos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentesCerrados}</div>
            <p className="text-xs text-muted-foreground">
              Completados exitosamente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Mis Propiedades
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPropiedades}</div>
            <p className="text-xs text-muted-foreground">
              Propiedades registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Qué puedes hacer desde aquí
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <a
              href="/cliente/incidentes"
              className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <AlertCircle className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold">Ver Mis Incidentes</h3>
                <p className="text-sm text-gray-600">
                  Revisa el estado de tus reportes
                </p>
              </div>
            </a>

            <a
              href="/cliente/propiedades"
              className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Building2 className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h3 className="font-semibold">Mis Propiedades</h3>
                <p className="text-sm text-gray-600">
                  Administra tus inmuebles
                </p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Información de Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>¿Necesitas Ayuda?</CardTitle>
          <CardDescription>
            Estamos aquí para asistirte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Si tienes alguna pregunta o necesitas reportar un nuevo incidente,
            no dudes en contactarnos.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
