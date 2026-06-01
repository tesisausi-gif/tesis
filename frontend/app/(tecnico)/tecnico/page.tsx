import { createClient } from '@/shared/lib/supabase/server'
import { getTecnicoBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import { getNotificacionesTecnico } from '@/features/notificaciones/notificaciones-inapp.service'
import { getFranjasAgendaTecnico } from '@/features/disponibilidad/disponibilidad.service'
import { InicioTecnicoContent } from '@/components/tecnico/inicio-content.client'

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
  const idTecnico = tecnico?.id_tecnico

  const { data: asignaciones } = idTecnico
    ? await supabase
        .from('asignaciones_tecnico')
        .select('incidentes(estado_actual)')
        .eq('id_tecnico', idTecnico)
    : { data: [] }

  const [badgeCounts, notificaciones, compromisos] = await Promise.all([
    getTecnicoBadgeCounts().catch(() => ({ disponibles: 0, trabajos: 0, pagos: 0, notificaciones: 0 })),
    getNotificacionesTecnico().catch(() => []),
    getFranjasAgendaTecnico(tecnico?.id_tecnico ?? 0).catch(() => []),
  ])

  const estadosPorIncidente = (asignaciones || []).map(a => {
    const inc = Array.isArray(a.incidentes) ? a.incidentes[0] : a.incidentes
    return (inc as any)?.estado_actual as string | undefined
  })

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
      <div className="px-4">
        <InicioTecnicoContent
          nombre={tecnico?.nombre ?? 'Técnico'}
          iniciales={iniciales}
          especialidadesLabel={especialidadesLabel}
          calificacionPromedio={tecnico?.calificacion_promedio ?? null}
          cntAsignado={badgeCounts.disponibles}
          cntEnProceso={cntEnProceso}
          cntFinalizado={cntFinalizado}
          trabajosPendientes={badgeCounts.trabajos}
          notificaciones={notificaciones}
          compromisos={compromisos}
        />
      </div>
    </div>
  )
}
