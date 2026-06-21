'use server'

/**
 * Funciones de conteo para badges de navegación.
 * Cada función retorna todos los conteos necesarios para un rol en una sola llamada.
 */

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { requireTecnicoId, requireClienteId } from '@/features/auth/auth.service'

export interface AdminBadgeCounts {
  incidentes: number     // pendientes sin asignar + asignacion_solicitada con asignacion rechazada
  conformidades: number  // fotos subidas pendientes de revisión
  presupuestos: number   // presupuestos enviados esperando aprobación admin
  pagos: number          // cobros a clientes + pagos a técnicos pendientes
  solicitudes: number    // solicitudes de registro de técnicos pendientes
  reasignaciones: number // incidentes en asignacion_solicitada con asignacion rechazada
  notificaciones: number // notificaciones no leídas para admin
}

export interface ClienteBadgeCounts {
  presupuestos: number   // presupuestos aprobados por admin esperando aprobación cliente
  pagos: number          // cobros pendientes de pagar
  notificaciones: number // notificaciones no leídas para el cliente
}

export interface TecnicoBadgeCounts {
  disponibles: number      // asignaciones pendientes de aceptar
  trabajos: number         // total para badge nav (= aceptadas + sinConformidad)
  aceptadas: number        // asignaciones aceptadas con acción pendiente (inspección / presupuesto)
  sinConformidad: number   // presupuesto aprobado, sin conformidad subida aún
  pagos: number            // presupuestos aprobados sin pago recibido
  notificaciones: number   // notificaciones no leídas para el técnico
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminBadgeCounts(): Promise<AdminBadgeCounts> {
  const supabase = createAdminClient()

  const [incResult, confResult, presResult, solResult, reasigResult, notifResult,
    cobrosHechosRes, pagosHechosRes, presCobroRes, presPagoRes,
  ] = await Promise.all([
    // Incidentes en estado pendiente (sin asignar aún)
    supabase
      .from('incidentes')
      .select('id_incidente', { count: 'exact', head: true })
      .eq('estado_actual', 'pendiente'),

    // Conformidades con foto subida esperando revisión (excluye rechazadas)
    supabase
      .from('conformidades')
      .select('id_conformidad', { count: 'exact', head: true })
      .not('url_documento', 'is', null)
      .eq('esta_firmada', 0)
      .eq('esta_rechazada', false),

    // Presupuestos enviados esperando aprobación admin
    supabase
      .from('presupuestos')
      .select('id_presupuesto', { count: 'exact', head: true })
      .eq('estado_presupuesto', 'enviado'),

    // Solicitudes de registro de técnicos pendientes de aprobación
    supabase
      .from('solicitudes_registro')
      .select('id_solicitud', { count: 'exact', head: true })
      .eq('estado_solicitud', 'pendiente'),

    // Incidentes en asignacion_solicitada con técnico rechazado (necesitan re-asignación)
    supabase
      .from('asignaciones_tecnico')
      .select('id_incidente', { count: 'exact', head: false })
      .eq('estado_asignacion', 'rechazada'),

    // Notificaciones no leídas para admin
    supabase
      .from('notificaciones')
      .select('id_notificacion', { count: 'exact', head: true })
      .eq('para_admin', true)
      .is('fecha_leida', null),

    // Cobros ya registrados
    supabase.from('cobros_clientes').select('id_presupuesto'),

    // Pagos a técnicos ya registrados
    supabase.from('pagos_tecnicos').select('id_presupuesto'),

    // Presupuestos candidatos a cobro: aprobados cuyo incidente aún está en_proceso
    // (igual que getPendientesCobroCliente — el incidente pasa a 'finalizado' DESPUÉS del cobro)
    supabase
      .from('presupuestos')
      .select('id_presupuesto, incidentes!inner(estado_actual)')
      .eq('estado_presupuesto', 'aprobado')
      .eq('incidentes.estado_actual', 'en_proceso'),

    // Presupuestos candidatos a pago técnico: aprobados en cualquier estado activo
    // (igual que getPendientesPagoTecnico)
    supabase
      .from('presupuestos')
      .select('id_presupuesto, incidentes!inner(estado_actual)')
      .eq('estado_presupuesto', 'aprobado')
      .in('incidentes.estado_actual', ['en_proceso', 'finalizado', 'resuelto']),
  ])

  const cobradosSet = new Set((cobrosHechosRes.data || []).map((r: any) => r.id_presupuesto))
  const pagadosSet  = new Set((pagosHechosRes.data  || []).map((r: any) => r.id_presupuesto))

  const pendientesCobros = (presCobroRes.data || [])
    .filter((r: any) => !cobradosSet.has(r.id_presupuesto)).length
  const pendientesPagos  = (presPagoRes.data  || [])
    .filter((r: any) => !pagadosSet.has(r.id_presupuesto)).length

  // Calcular reasignaciones: incidentes en asignacion_solicitada con al menos una asignacion rechazada
  let reasignaciones = 0
  if (!reasigResult.error && reasigResult.data?.length) {
    const idsConRechazo = [...new Set(reasigResult.data.map((r: any) => r.id_incidente))]
    const { count } = await supabase
      .from('incidentes')
      .select('id_incidente', { count: 'exact', head: true })
      .in('id_incidente', idsConRechazo)
      .eq('estado_actual', 'asignacion_solicitada')
    reasignaciones = count ?? 0
  }

  return {
    incidentes: (incResult.count ?? 0) + reasignaciones,
    conformidades: confResult.count ?? 0,
    presupuestos: presResult.count ?? 0,
    pagos: pendientesCobros + pendientesPagos,
    solicitudes: solResult.count ?? 0,
    reasignaciones,
    notificaciones: notifResult.count ?? 0,
  }
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export async function getClienteBadgeCounts(): Promise<ClienteBadgeCounts> {
  try {
    const supabase = await createClient()
    const idCliente = await requireClienteId()

    // Presupuestos aprobados por admin esperando aprobación del cliente
    // Se buscan via incidentes del cliente → presupuestos con estado aprobado_admin
    const { data: incidentes } = await supabase
      .from('incidentes')
      .select('id_incidente')
      .eq('id_cliente_reporta', idCliente)

    if (!incidentes?.length) return { presupuestos: 0, pagos: 0, notificaciones: 0 }

    const ids = incidentes.map((i: any) => i.id_incidente)

    // En paralelo: presupuestos pendientes de aprobación, cobros pendientes y notificaciones
    const [presResult, pagosResult, notifResult] = await Promise.all([
      supabase
        .from('presupuestos')
        .select('id_presupuesto', { count: 'exact', head: true })
        .in('id_incidente', ids)
        .eq('estado_presupuesto', 'aprobado_admin'),

      // Pagos pendientes = incidentes en_proceso con fue_resuelto (filtramos en JS para evitar coerción de tipo)
      supabase
        .from('incidentes')
        .select('id_incidente, fue_resuelto')
        .eq('id_cliente_reporta', idCliente)
        .eq('estado_actual', 'en_proceso'),

      // Notificaciones no leídas del cliente
      supabase
        .from('notificaciones')
        .select('id_notificacion', { count: 'exact', head: true })
        .eq('id_cliente', idCliente)
        .is('fecha_leida', null),
    ])

    const pagos = (pagosResult.data || []).filter((i: any) => i.fue_resuelto).length
    return { presupuestos: presResult.count ?? 0, pagos, notificaciones: notifResult.count ?? 0 }
  } catch {
    return { presupuestos: 0, pagos: 0, notificaciones: 0 }
  }
}

// ─── Técnico ──────────────────────────────────────────────────────────────────

export async function getTecnicoBadgeCounts(): Promise<TecnicoBadgeCounts> {
  try {
    const supabase = await createClient()
    const idTecnico = await requireTecnicoId()

    const [asigPendResult, asigAceptadasResult, asigActivasResult] = await Promise.all([
      // Asignaciones pendientes de aceptar
      supabase
        .from('asignaciones_tecnico')
        .select('id_asignacion', { count: 'exact', head: true })
        .eq('id_tecnico', idTecnico)
        .eq('estado_asignacion', 'pendiente'),

      // Asignaciones ya aceptadas — el técnico sabe que tiene que ir a trabajos
      supabase
        .from('asignaciones_tecnico')
        .select('id_asignacion', { count: 'exact', head: true })
        .eq('id_tecnico', idTecnico)
        .eq('estado_asignacion', 'aceptada'),

      // Asignaciones activas (en_curso o completada) — para calcular conformidades
      supabase
        .from('asignaciones_tecnico')
        .select('id_incidente')
        .eq('id_tecnico', idTecnico)
        .in('estado_asignacion', ['en_curso', 'completada']),
    ])

    const disponibles = asigPendResult.count ?? 0
    const aceptadas   = asigAceptadasResult.count ?? 0
    const idIncidentes = (asigActivasResult.data || [])
      .map((a: any) => a.id_incidente)
      .filter(Boolean) as number[]

    if (!idIncidentes.length) return { disponibles, trabajos: aceptadas, aceptadas, sinConformidad: 0, pagos: 0, notificaciones: 0 }

    // Presupuestos aprobados para esos incidentes (con id_presupuesto también)
    const { data: presAprobados } = await supabase
      .from('presupuestos')
      .select('id_incidente, id_presupuesto')
      .in('id_incidente', idIncidentes)
      .eq('estado_presupuesto', 'aprobado')

    const incidentesConPresupuesto = new Set((presAprobados || []).map((p: any) => p.id_incidente))
    if (!incidentesConPresupuesto.size) return { disponibles, trabajos: aceptadas, aceptadas, sinConformidad: 0, pagos: 0, notificaciones: 0 }

    const idPresupuestosAprobados = (presAprobados || []).map((p: any) => p.id_presupuesto)

    // Conformidades ya subidas, pagos ya recibidos y notificaciones no leídas (en paralelo)
    const [conformidadesRes, pagosRecibidosRes, notifRes] = await Promise.all([
      supabase
        .from('conformidades')
        .select('id_incidente')
        .in('id_incidente', Array.from(incidentesConPresupuesto))
        .not('url_documento', 'is', null),
      supabase
        .from('pagos_tecnicos')
        .select('id_presupuesto')
        .in('id_presupuesto', idPresupuestosAprobados),

      // Notificaciones no leídas del técnico
      supabase
        .from('notificaciones')
        .select('id_notificacion', { count: 'exact', head: true })
        .eq('id_tecnico', idTecnico)
        .is('fecha_leida', null),
    ])

    const incidentesConConformidad = new Set((conformidadesRes.data || []).map((c: any) => c.id_incidente))
    const presupuestosConPago = new Set((pagosRecibidosRes.data || []).map((p: any) => p.id_presupuesto))

    // Trabajos = aceptadas (sin presupuesto aún) + incidentes con presupuesto aprobado y sin conformidad
    const sinConformidad = Array.from(incidentesConPresupuesto)
      .filter(id => !incidentesConConformidad.has(id)).length
    const trabajos = aceptadas + sinConformidad

    // Pagos = presupuestos aprobados sin pago técnico recibido
    const pagos = idPresupuestosAprobados.filter((id: number) => !presupuestosConPago.has(id)).length

    return { disponibles, trabajos, aceptadas, sinConformidad, pagos, notificaciones: notifRes.count ?? 0 }
  } catch {
    return { disponibles: 0, trabajos: 0, aceptadas: 0, sinConformidad: 0, pagos: 0, notificaciones: 0 }
  }
}
