import { createClient } from '@/shared/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, CheckCircle2, Clock, Star, Bell, XCircle } from 'lucide-react'
import Link from 'next/link'
import { getTecnicoBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function TecnicoDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*, tecnicos(*)')
    .eq('id', user.id)
    .single()

  const tecnico = usuario?.tecnicos

  const { data: asignaciones } = await supabase
    .from('asignaciones_tecnico')
    .select('*, incidentes(*)')
    .eq('id_tecnico', tecnico?.id_tecnico)

  const badgeCounts = await getTecnicoBadgeCounts().catch(() => ({ disponibles: 0, trabajos: 0 }))

  const trabajosActivos = asignaciones?.filter(a => a.estado_asignacion === 'en_curso').length || 0
  const trabajosCompletados = asignaciones?.filter(a => a.estado_asignacion === 'completado').length || 0
  const totalTrabajos = asignaciones?.length || 0

  // Notificaciones: presupuestos rechazados por el admin (asignación revocada)
  const asigRechazadas = asignaciones?.filter(a =>
    a.estado_asignacion === 'rechazada' && a.fecha_rechazo
  ) ?? []

  const idIncidentes = asigRechazadas.map((a: any) => a.id_incidente).filter(Boolean)

  const { data: presupuestosRechazados } = idIncidentes.length > 0
    ? await supabase
        .from('presupuestos')
        .select('id_presupuesto, id_incidente, costo_total, fecha_modificacion, incidentes(descripcion_problema)')
        .eq('estado_presupuesto', 'rechazado')
        .in('id_incidente', idIncidentes)
        .order('fecha_modificacion', { ascending: false })
    : { data: [] }

  return (
    <div className="space-y-4 px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Activos</CardTitle>
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
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Completados</CardTitle>
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
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Total</CardTitle>
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
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Calificación</CardTitle>
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

      {/* Notificaciones */}
      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Notificaciones
            {presupuestosRechazados && presupuestosRechazados.length > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                {presupuestosRechazados.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {presupuestosRechazados && presupuestosRechazados.length > 0 ? (
            <div className="space-y-3">
              {presupuestosRechazados.map((p: any) => (
                <div
                  key={p.id_presupuesto}
                  className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
                >
                  <XCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-800">
                      Presupuesto rechazado — tu asignación fue revocada
                    </p>
                    <p className="text-xs text-red-700 mt-0.5 line-clamp-1">
                      Incidente #{p.id_incidente}
                      {p.incidentes?.descripcion_problema ? `: ${p.incidentes.descripcion_problema}` : ''}
                    </p>
                    {p.fecha_modificacion && (
                      <p className="text-xs text-red-500 mt-1">
                        {format(new Date(p.fecha_modificacion), "dd 'de' MMM, HH:mm", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No tenés notificaciones pendientes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
