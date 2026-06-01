import { createClient } from '@/shared/lib/supabase/server'
import { getClienteBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import { getNotificacionesCliente } from '@/features/notificaciones/notificaciones-inapp.service'
import { InicioContent } from '@/components/cliente/inicio-content.client'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function ClienteInicio() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, id_cliente')
    .eq('id', user.id)
    .single()

  const idCliente = usuario?.id_cliente

  const [incidentesResult, badgeCounts, notificaciones] = await Promise.all([
    supabase
      .from('incidentes')
      .select('estado_actual, id_incidente, id_propiedad')
      .eq('id_cliente_reporta', idCliente),
    getClienteBadgeCounts().catch(() => ({ presupuestos: 0, pagos: 0, notificaciones: 0 })),
    getNotificacionesCliente().catch(() => [] as Notificacion[]),
  ])

  const todosIncidentes = incidentesResult.data ?? []

  const ACTIVOS = ['pendiente', 'asignacion_solicitada', 'en_proceso']
  const EN_PROCESO = ['en_proceso', 'asignacion_solicitada']

  const stats = {
    activos: todosIncidentes.filter(i => ACTIVOS.includes(i.estado_actual)).length,
    en_proceso: todosIncidentes.filter(i => EN_PROCESO.includes(i.estado_actual)).length,
    finalizados: todosIncidentes.filter(i => i.estado_actual === 'finalizado').length,
  }

  // Next scheduled visit
  let proximaVisita = null
  const idIncidentes = todosIncidentes.map(i => i.id_incidente)

  if (idIncidentes.length > 0) {
    const hoy = format(new Date(), 'yyyy-MM-dd')
    const { data: visita } = await supabase
      .from('asignaciones_tecnico')
      .select('fecha_visita, hora_inicio, hora_fin_estimada, incidentes(descripcion_problema, inmuebles(calle, altura, tipos_inmuebles(nombre)))')
      .eq('estado_asignacion', 'aceptada')
      .in('id_incidente', idIncidentes)
      .gte('fecha_visita', hoy)
      .order('fecha_visita', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (visita) {
      const inc = visita.incidentes as any
      const inm = inc?.inmuebles
      let inmueble = ''
      if (inm) {
        const tiposRaw = inm.tipos_inmuebles
        const tipo = Array.isArray(tiposRaw)
          ? (tiposRaw[0] as any)?.nombre ?? 'Inmueble'
          : (tiposRaw as any)?.nombre ?? 'Inmueble'
        inmueble = `${tipo} · ${[inm.calle, inm.altura].filter(Boolean).join(' ')}`
      }
      proximaVisita = {
        fecha: visita.fecha_visita,
        hora_inicio: visita.hora_inicio ?? '',
        hora_fin: visita.hora_fin_estimada ?? '',
        descripcion: (inc?.descripcion_problema ?? '').slice(0, 80),
        inmueble,
      }
    }
  }

  const fechaHoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <InicioContent
      nombre={usuario?.nombre ?? 'Cliente'}
      fechaHoy={fechaHoy}
      stats={stats}
      proximaVisita={proximaVisita}
      presupuestosPendientes={badgeCounts.presupuestos}
      pagosPendientes={badgeCounts.pagos}
      notificaciones={notificaciones}
    />
  )
}
