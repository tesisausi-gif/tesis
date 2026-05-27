import { createClient } from '@/shared/lib/supabase/server'
import {
  ClipboardList, CheckCircle2, Clock, Star,
  UserCheck, Wrench, ArrowRight, Bell,
} from 'lucide-react'
import Link from 'next/link'
import { getTecnicoBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import { getNotificacionesTecnico } from '@/features/notificaciones/notificaciones-inapp.service'
import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'
import { getFranjasAgendaTecnico } from '@/features/disponibilidad/disponibilidad.service'
import { AgendaTecnico } from '@/components/tecnico/agenda-tecnico.client'

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
    .select('incidentes(estado_actual)')
    .eq('id_tecnico', tecnico?.id_tecnico)

  const [badgeCounts, notificaciones, compromisos] = await Promise.all([
    getTecnicoBadgeCounts().catch(() => ({ disponibles: 0, trabajos: 0, pagos: 0, notificaciones: 0 })),
    getNotificacionesTecnico().catch(() => []),
    getFranjasAgendaTecnico(tecnico?.id_tecnico ?? 0).catch(() => []),
  ])

  const estadosPorIncidente = (asignaciones || []).map(a => {
    const inc = Array.isArray(a.incidentes) ? a.incidentes[0] : a.incidentes
    return (inc as any)?.estado_actual as string | undefined
  })

  const cntAsignado   = estadosPorIncidente.filter(e => e === 'asignacion_solicitada').length
  const cntEnProceso  = estadosPorIncidente.filter(e => e === 'en_proceso').length
  const cntFinalizado = estadosPorIncidente.filter(e => e === 'finalizado' || e === 'resuelto').length

  const especialidadesLabel = (() => {
    const esps: string[] = tecnico?.especialidades?.length
      ? tecnico.especialidades
      : tecnico?.especialidad ? [tecnico.especialidad] : []
    return esps.length ? esps.join(', ') : ''
  })()

  const iniciales = tecnico?.nombre
    ? `${tecnico.nombre[0]}${tecnico.apellido?.[0] ?? ''}`.toUpperCase()
    : '?'

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="bg-white px-5 pt-6 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">{iniciales}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Hola, {tecnico?.nombre ?? 'Técnico'}
            </h1>
            {especialidadesLabel && (
              <p className="text-xs text-slate-400">{especialidadesLabel}</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 pt-4">

        {/* ── Alerta: conformidad pendiente ────────────── */}
        {badgeCounts.trabajos > 0 && (
          <Link href="/tecnico/trabajos">
            <div className="rounded-2xl border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-50/70 to-white shadow-sm p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-amber-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">
                  {badgeCounts.trabajos === 1
                    ? '1 trabajo listo para subir conformidad'
                    : `${badgeCounts.trabajos} trabajos listos para subir conformidad`}
                </p>
                <p className="text-xs text-amber-600">Tocá para ir a Trabajos →</p>
              </div>
            </div>
          </Link>
        )}

        {/* ── Stats de trabajos ────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          <Link href="/tecnico/disponibles">
            <div className="rounded-2xl border-l-4 border-l-blue-400 bg-gradient-to-r from-blue-50/60 to-white p-4 shadow-sm active:shadow-none transition-shadow">
              <div className="text-2xl font-bold tabular-nums text-blue-700">{cntAsignado}</div>
              <div className="flex items-center gap-1 mt-1">
                <UserCheck className="h-3 w-3 text-blue-500" />
                <span className="text-[11px] text-slate-500">Asignados</span>
              </div>
            </div>
          </Link>

          <Link href="/tecnico/trabajos">
            <div className="rounded-2xl border-l-4 border-l-orange-400 bg-gradient-to-r from-orange-50/60 to-white p-4 shadow-sm active:shadow-none transition-shadow">
              <div className="text-2xl font-bold tabular-nums text-orange-700">{cntEnProceso}</div>
              <div className="flex items-center gap-1 mt-1">
                <Wrench className="h-3 w-3 text-orange-500" />
                <span className="text-[11px] text-slate-500">En proceso</span>
              </div>
            </div>
          </Link>

          <Link href="/tecnico/trabajos?filtro=resueltos">
            <div className="rounded-2xl border-l-4 border-l-emerald-400 bg-gradient-to-r from-emerald-50/60 to-white p-4 shadow-sm active:shadow-none transition-shadow">
              <div className="text-2xl font-bold tabular-nums text-emerald-700">{cntFinalizado}</div>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-[11px] text-slate-500">Finalizados</span>
              </div>
            </div>
          </Link>
        </div>

        {/* ── Calificación ────────────────────────────── */}
        {tecnico?.calificacion_promedio != null && (
          <div className="rounded-2xl bg-gradient-to-r from-yellow-50/60 to-white border-l-4 border-l-yellow-400 p-4 shadow-sm flex items-center gap-4">
            <div className="h-9 w-9 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <div className="text-xl font-bold tabular-nums text-yellow-700">
                {tecnico.calificacion_promedio.toFixed(1)} <span className="text-base">★</span>
              </div>
              <p className="text-[11px] text-slate-400">Calificación promedio</p>
            </div>
          </div>
        )}

        {/* ── Acciones rápidas ────────────────────────── */}
        <div className="space-y-2">
          <Link href="/tecnico/disponibles">
            <div className="rounded-2xl bg-white border border-slate-200 px-5 py-3.5 flex items-center justify-between shadow-sm active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Ver trabajos disponibles</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
          </Link>
          <Link href="/tecnico/trabajos">
            <div className="rounded-2xl bg-white border border-slate-200 px-5 py-3.5 flex items-center justify-between shadow-sm active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Wrench className="h-3.5 w-3.5 text-orange-600" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Mis trabajos activos</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
          </Link>
        </div>

        {/* ── Agenda ──────────────────────────────────── */}
        <AgendaTecnico franjas={compromisos} />

        {/* ── Notificaciones ──────────────────────────── */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <NotificacionesPanel notificaciones={notificaciones} rol="tecnico" />
          </div>
        </div>

      </div>
    </div>
  )
}
