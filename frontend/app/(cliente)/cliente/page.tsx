import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Building2, Plus, ArrowRight, Clock, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

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

  // Obtener inmuebles
  const { data: inmuebles } = await supabase
    .from('inmuebles')
    .select('id_inmueble, esta_activo')
    .eq('id_cliente', usuario?.id_cliente)

  const totalInmuebles = inmuebles?.length || 0
  const inmueblesActivos = inmuebles?.filter(i => i.esta_activo).length || 0

  return (
    <div className="space-y-4 px-4 py-6 md:px-6 md:py-8">
      {/* Header - Mobile First */}
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Bienvenido, {usuario?.nombre}
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Panel de control de tus incidentes y propiedades
        </p>
      </div>

      {/* Mensaje informativo minimalista - Solo si no hay inmuebles */}
      {totalInmuebles === 0 && (
        <Card className="border-dashed border-2 bg-blue-50 border-blue-200">
          <CardContent className="py-4 text-center">
            <p className="text-sm md:text-base text-gray-700">
              💡 <strong>Importante:</strong> Para reportar incidentes, primero debes registrar al menos un inmueble
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dos Secciones Principales */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Sección 1: INCIDENTES - Con CTA destacado */}
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                <AlertCircle className="h-6 w-6 md:h-7 md:w-7 text-blue-600" />
                Incidentes
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estadísticas de Incidentes */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {totalIncidentes}
                </div>
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  Total
                </p>
              </div>

              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl md:text-3xl font-bold text-orange-600 flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 md:h-5 md:w-5" />
                  {incidentesAbiertos}
                </div>
                <p className="text-xs md:text-sm text-orange-700 mt-1">
                  Abiertos
                </p>
              </div>

              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl md:text-3xl font-bold text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                  {incidentesCerrados}
                </div>
                <p className="text-xs md:text-sm text-green-700 mt-1">
                  Resueltos
                </p>
              </div>
            </div>

            {/* CTA Principal - Reportar Incidente */}
            <Link href="/cliente/incidentes/nuevo" className="block">
              <Button
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all text-base md:text-lg py-6"
              >
                <Plus className="h-5 w-5 md:h-6 md:w-6" />
                Reportar Nuevo Incidente
              </Button>
            </Link>

            {/* Link secundario - Ver todos */}
            <Link href="/cliente/incidentes">
              <Button
                variant="outline"
                className="w-full gap-2 text-sm md:text-base"
              >
                Ver Todos Mis Incidentes
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Sección 2: INMUEBLES - Gestión de Propiedades */}
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                <Building2 className="h-6 w-6 md:h-7 md:w-7 text-green-600" />
                Mis Inmuebles
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estadísticas de Inmuebles */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl md:text-4xl font-bold text-gray-900">
                  {totalInmuebles}
                </div>
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  Total de Inmuebles
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl md:text-4xl font-bold text-green-600">
                  {inmueblesActivos}
                </div>
                <p className="text-xs md:text-sm text-green-700 mt-1">
                  Activos
                </p>
              </div>
            </div>

            {/* Acciones de Gestión */}
            <div className="space-y-3">
              <Link href="/cliente/propiedades" className="block">
                <Button
                  size="lg"
                  variant="default"
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all text-base md:text-lg py-6"
                >
                  <Building2 className="h-5 w-5 md:h-6 md:w-6" />
                  Gestionar Inmuebles
                </Button>
              </Link>

              <p className="text-xs md:text-sm text-center text-gray-600">
                Registra, edita o elimina tus propiedades
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
