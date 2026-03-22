import { createClient } from '@/shared/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Plus, ArrowRight, Clock, CheckCircle2, FileText } from 'lucide-react'
import Link from 'next/link'
import { getClienteBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import { getNotificacionesCliente } from '@/features/notificaciones/notificaciones-inapp.service'
import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'

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
    i.estado_actual === 'resuelto'
  ).length || 0

  const totalIncidentes = incidentes?.length || 0

  // Obtener inmuebles (solo para verificar si tiene alguno registrado)
  const { data: inmuebles } = await supabase
    .from('inmuebles')
    .select('id_inmueble')
    .eq('id_cliente', usuario?.id_cliente)

  const totalInmuebles = inmuebles?.length || 0

  const [badgeCounts, notificaciones] = await Promise.all([
    getClienteBadgeCounts().catch(() => ({ presupuestos: 0, pagos: 0, notificaciones: 0 })),
    getNotificacionesCliente().catch(() => []),
  ])

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

      {/* Alerta: Presupuestos pendientes de aprobación */}
      {badgeCounts.presupuestos > 0 && (
        <Link href="/cliente/presupuestos" className="block">
          <Card className="border-2 border-blue-400 bg-blue-50 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-800">
                  {badgeCounts.presupuestos === 1
                    ? 'Tenés 1 presupuesto para aprobar'
                    : `Tenés ${badgeCounts.presupuestos} presupuestos para aprobar`}
                </p>
                <p className="text-sm text-blue-600">Toca para revisar y aprobar →</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Incidentes */}
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
              <p className="text-xs md:text-sm text-gray-600 mt-1">Total</p>
            </div>

            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-orange-600 flex items-center justify-center gap-1">
                <Clock className="h-4 w-4 md:h-5 md:w-5" />
                {incidentesAbiertos}
              </div>
              <p className="text-xs md:text-sm text-orange-700 mt-1">Abiertos</p>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-green-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                {incidentesCerrados}
              </div>
              <p className="text-xs md:text-sm text-green-700 mt-1">Resueltos</p>
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
            <Button variant="outline" className="w-full gap-2 text-sm md:text-base">
              Ver Todos Mis Incidentes
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Notificaciones */}
      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardContent className="pt-5">
          <NotificacionesPanel notificaciones={notificaciones} rol="cliente" />
        </CardContent>
      </Card>
    </div>
  )
}
