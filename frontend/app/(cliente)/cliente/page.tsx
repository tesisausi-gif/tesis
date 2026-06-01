import { createClient } from '@/shared/lib/supabase/server'
import { getClienteBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import { InicioContent } from '@/components/cliente/inicio-content.client'
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

  const [incidentesResult, propiedadesResult, badgeCounts] = await Promise.all([
    supabase
      .from('incidentes')
      .select('estado_actual, id_incidente, id_propiedad')
      .eq('id_cliente_reporta', idCliente),
    supabase
      .from('inmuebles')
      .select('id_inmueble, calle, altura, barrio, localidad, tipos_inmuebles(nombre)')
      .eq('id_cliente', idCliente)
      .eq('esta_activo', 1)
      .order('calle'),
    getClienteBadgeCounts().catch(() => ({ presupuestos: 0, pagos: 0, notificaciones: 0 })),
  ])

  const todosIncidentes = incidentesResult.data ?? []
  const propiedadesRaw = propiedadesResult.data ?? []

  const ACTIVOS = ['pendiente', 'asignacion_solicitada', 'en_proceso']
  const EN_PROCESO = ['en_proceso', 'asignacion_solicitada']

  const stats = {
    activos: todosIncidentes.filter(i => ACTIVOS.includes(i.estado_actual)).length,
    en_proceso: todosIncidentes.filter(i => EN_PROCESO.includes(i.estado_actual)).length,
    finalizados: todosIncidentes.filter(i => i.estado_actual === 'finalizado').length,
  }

  // Active incident count per property
  const activosPorInmueble: Record<number, number> = {}
  for (const i of todosIncidentes) {
    if (ACTIVOS.includes(i.estado_actual)) {
      activosPorInmueble[i.id_propiedad] = (activosPorInmueble[i.id_propiedad] ?? 0) + 1
    }
  }

  const propiedades = propiedadesRaw.map(p => {
    const tiposRaw = p.tipos_inmuebles
    const tipo = Array.isArray(tiposRaw)
      ? (tiposRaw[0] as any)?.nombre ?? 'Inmueble'
      : (tiposRaw as any)?.nombre ?? 'Inmueble'

    const dir = [p.calle, p.altura].filter(Boolean).join(' ')
    const ub = [p.barrio, p.localidad].filter(Boolean).join(', ')
    const direccion = ub ? `${dir}, ${ub}` : dir

    return {
      id_inmueble: p.id_inmueble,
      tipo,
      direccion,
      incidentes_activos: activosPorInmueble[p.id_inmueble] ?? 0,
    }
  })

  // Next scheduled visit
  let proximaVisita = null
  const idIncidentes = todosIncidentes.map(i => i.id_incidente)

  if (idIncidentes.length > 0) {
    const hoy = format(new Date(), 'yyyy-MM-dd')
    const { data: visita } = await supabase
      .from('asignaciones_tecnico')
      .select('fecha_visita, hora_inicio, hora_fin_estimada, id_incidente, incidentes(id_propiedad, descripcion_problema)')
      .eq('estado_asignacion', 'aceptada')
      .in('id_incidente', idIncidentes)
      .gte('fecha_visita', hoy)
      .order('fecha_visita', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (visita) {
      const inc = visita.incidentes as any
      let inmueble = ''
      if (inc?.id_propiedad) {
        const prop = propiedadesRaw.find(p => p.id_inmueble === inc.id_propiedad)
        if (prop) {
          const tiposRaw = prop.tipos_inmuebles
          const tipo = Array.isArray(tiposRaw)
            ? (tiposRaw[0] as any)?.nombre ?? 'Inmueble'
            : (tiposRaw as any)?.nombre ?? 'Inmueble'
          inmueble = `${tipo} · ${[prop.calle, prop.altura].filter(Boolean).join(' ')}`
        }
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
      propiedades={propiedades}
      totalInmuebles={propiedadesRaw.length}
    />
  )
}
