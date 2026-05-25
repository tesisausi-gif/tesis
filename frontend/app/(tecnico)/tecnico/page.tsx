import { createClient } from '@/shared/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, CheckCircle2, Clock, Star, UserCheck, Wrench } from 'lucide-react'
import Link from 'next/link'
import { getTecnicoBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import { getNotificacionesTecnico } from '@/features/notificaciones/notificaciones-inapp.service'
import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'

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

  // Traer incidentes asociados al técnico para contar por estado_actual
  const { data: asignaciones } = await supabase
    .from('asignaciones_tecnico')
    .select('incidentes(estado_actual)')
    .eq('id_tecnico', tecnico?.id_tecnico)

  const [badgeCounts, notificaciones] = await Promise.all([
    getTecnicoBadgeCounts().catch(() => ({ disponibles: 0, trabajos: 0, pagos: 0, notificaciones: 0 })),
    getNotificacionesTecnico().catch(() => []),
  ])

  // Contar por estado_actual del incidente
  const estadosPorIncidente = (asignaciones || []).map(a => {
    const inc = Array.isArray(a.incidentes) ? a.incidentes[0] : a.incidentes
    return (inc as any)?.estado_actual as string | undefined
  })

  const cntPendiente  = estadosPorIncidente.filter(e => e === 'pendiente').length
  const cntAsignado   = estadosPorIncidente.filter(e => e === 'asignacion_solicitada').length
  const cntEnProceso  = estadosPorIncidente.filter(e => e === 'en_proceso').length
  const cntFinalizado = estadosPorIncidente.filter(e => e === 'finalizado' || e === 'resuelto').length

  // Especialidades: mostrar todas si hay array, si no la primaria
  const especialidadesLabel = (() => {
    const esps: string[] = tecnico?.especialidades?.length
      ? tecnico.especialidades
      : tecnico?.especialidad ? [tecnico.especialidad] : []
    return esps.length ? `Especialidad${esps.length > 1 ? 'es' : ''}: ${esps.join(', ')}` : ''
  })()

  return (
    <div className="space-y-4 px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Bienvenido, {tecnico?.nombre}
        </h1>
        {especialidadesLabel && (
          <p className="text-sm md:text-base text-gray-600">{especialidadesLabel}</p>
        )}
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

      {/* Contadores por estado */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pendientes</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl font-bold tabular-nums text-amber-700">{cntPendiente}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Asignados</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl font-bold tabular-nums text-blue-700">{cntAsignado}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-white to-orange-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">En proceso</CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl font-bold tabular-nums text-orange-700">{cntEnProceso}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Finalizado</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl font-bold tabular-nums text-green-700">{cntFinalizado}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calificación */}
      <Card className="border-l-4 border-l-yellow-400 bg-gradient-to-br from-white to-yellow-50/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
          <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Calificación promedio</CardTitle>
          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <Star className="h-4 w-4 text-yellow-600" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="text-3xl font-bold tabular-nums text-yellow-700">
            {tecnico?.calificacion_promedio ? `${tecnico.calificacion_promedio.toFixed(1)} ★` : '—'}
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones */}
      <Card className="border-2">
        <CardContent className="pt-5">
          <NotificacionesPanel notificaciones={notificaciones} rol="tecnico" />
        </CardContent>
      </Card>
    </div>
  )
}
