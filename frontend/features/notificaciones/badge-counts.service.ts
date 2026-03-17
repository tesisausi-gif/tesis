'use server'

/**
 * Funciones de conteo para badges de navegación.
 * Cada función retorna todos los conteos necesarios para un rol en una sola llamada.
 */

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { requireTecnicoId, requireClienteId } from '@/features/auth/auth.service'

export interface AdminBadgeCounts {
  conformidades: number  // fotos subidas pendientes de revisión
  presupuestos: number   // presupuestos enviados esperando aprobación admin
  pagos: number          // cobros a clientes + pagos a técnicos pendientes
  solicitudes: number    // solicitudes de registro de técnicos pendientes
}

export interface ClienteBadgeCounts {
  presupuestos: number   // presupuestos aprobados por admin esperando aprobación cliente
  pagos: number          // cobros pendientes de pagar
}

export interface TecnicoBadgeCounts {
  disponibles: number    // asignaciones pendientes de aceptar
  trabajos: number       // trabajos con presupuesto aprobado sin conformidad subida
  pagos: number          // presupuestos aprobados sin pago recibido
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminBadgeCounts(): Promise<AdminBadgeCounts> {
  const supabase = createAdminClient()

  const [confResult, presResult, cobrosPendResult, pagosTecResult, solResult] = await Promise.all([
    // Conformidades con foto subida esperando revisión
    supabase
      .from('conformidades')
      .select('id_conformidad', { count: 'exact', head: true })
      .not('url_documento', 'is', null)
      .eq('esta_firmada', 0),

    // Presupuestos enviados esperando aprobación admin
    supabase
      .from('presupuestos')
      .select('id_presupuesto', { count: 'exact', head: true })
      .eq('estado_presupuesto', 'enviado'),

    // Cobros a clientes pendientes: incidentes resueltos con presupuesto aprobado sin cobro
    supabase
      .from('presupuestos')
      .select('id_presupuesto', { count: 'exact', head: true })
      .eq('estado_presupuesto', 'aprobado')
      .not('id_presupuesto', 'in', '(select id_presupuesto from cobros_clientes)'),

    // Pagos a técnicos pendientes: presupuestos aprobados sin pago técnico
    supabase
      .from('presupuestos')
      .select('id_presupuesto', { count: 'exact', head: true })
      .eq('estado_presupuesto', 'aprobado')
      .not('id_presupuesto', 'in', '(select id_presupuesto from pagos_tecnicos)'),

    // Solicitudes de registro de técnicos pendientes de aprobación
    supabase
      .from('solicitudes_registro')
      .select('id_solicitud', { count: 'exact', head: true })
      .eq('estado_solicitud', 'pendiente'),
  ])

  // Supabase PostgREST no soporta subqueries nativas, fallback a conteo manual
  // si los counts de cobros/pagos fallan usamos 0 pero intentamos obtenerlos
  let pendientesCobros = 0
  let pendientesPagos = 0

  if (cobrosPendResult.error || pagosTecResult.error) {
    // Fallback: obtener listas y contar en TS
    const [cobrosResp, pagosResp, presAprobResp] = await Promise.all([
      supabase.from('cobros_clientes').select('id_presupuesto'),
      supabase.from('pagos_tecnicos').select('id_presupuesto'),
      supabase.from('presupuestos').select('id_presupuesto').eq('estado_presupuesto', 'aprobado'),
    ])
    const cobradosIds = new Set((cobrosResp.data || []).map((r: any) => r.id_presupuesto))
    const pagadosIds = new Set((pagosResp.data || []).map((r: any) => r.id_presupuesto))
    const aprobados = (presAprobResp.data || []).map((r: any) => r.id_presupuesto)
    pendientesCobros = aprobados.filter(id => !cobradosIds.has(id)).length
    pendientesPagos = aprobados.filter(id => !pagadosIds.has(id)).length
  } else {
    pendientesCobros = cobrosPendResult.count ?? 0
    pendientesPagos = pagosTecResult.count ?? 0
  }

  return {
    conformidades: confResult.count ?? 0,
    presupuestos: presResult.count ?? 0,
    pagos: pendientesCobros + pendientesPagos,
    solicitudes: solResult.count ?? 0,
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

    if (!incidentes?.length) return { presupuestos: 0, pagos: 0 }

    const ids = incidentes.map((i: any) => i.id_incidente)

    // En paralelo: presupuestos pendientes de aprobación y cobros pendientes de pago
    const [presResult, presAprobResult] = await Promise.all([
      supabase
        .from('presupuestos')
        .select('id_presupuesto', { count: 'exact', head: true })
        .in('id_incidente', ids)
        .eq('estado_presupuesto', 'aprobado_admin'),
      supabase
        .from('presupuestos')
        .select('id_presupuesto')
        .in('id_incidente', ids)
        .eq('estado_presupuesto', 'aprobado'),
    ])

    let pagosPendientes = 0
    if (presAprobResult.data?.length) {
      const idsPres = presAprobResult.data.map((p: any) => p.id_presupuesto)
      const { data: cobros } = await supabase
        .from('cobros_clientes')
        .select('id_presupuesto')
        .in('id_presupuesto', idsPres)
      const cobradosSet = new Set((cobros || []).map((c: any) => c.id_presupuesto))
      pagosPendientes = idsPres.filter((id: number) => !cobradosSet.has(id)).length
    }

    return { presupuestos: presResult.count ?? 0, pagos: pagosPendientes }
  } catch {
    return { presupuestos: 0, pagos: 0 }
  }
}

// ─── Técnico ──────────────────────────────────────────────────────────────────

export async function getTecnicoBadgeCounts(): Promise<TecnicoBadgeCounts> {
  try {
    const supabase = await createClient()
    const idTecnico = await requireTecnicoId()

    const [asigPendResult, asigActivasResult] = await Promise.all([
      // Asignaciones pendientes de aceptar
      supabase
        .from('asignaciones_tecnico')
        .select('id_asignacion', { count: 'exact', head: true })
        .eq('id_tecnico', idTecnico)
        .eq('estado_asignacion', 'pendiente'),

      // Asignaciones activas (en_curso o completado)
      supabase
        .from('asignaciones_tecnico')
        .select('id_incidente')
        .eq('id_tecnico', idTecnico)
        .in('estado_asignacion', ['en_curso', 'completado']),
    ])

    const disponibles = asigPendResult.count ?? 0
    const idIncidentes = (asigActivasResult.data || [])
      .map((a: any) => a.id_incidente)
      .filter(Boolean) as number[]

    if (!idIncidentes.length) return { disponibles, trabajos: 0, pagos: 0 }

    // Presupuestos aprobados para esos incidentes (con id_presupuesto también)
    const { data: presAprobados } = await supabase
      .from('presupuestos')
      .select('id_incidente, id_presupuesto')
      .in('id_incidente', idIncidentes)
      .eq('estado_presupuesto', 'aprobado')

    const incidentesConPresupuesto = new Set((presAprobados || []).map((p: any) => p.id_incidente))
    if (!incidentesConPresupuesto.size) return { disponibles, trabajos: 0, pagos: 0 }

    const idPresupuestosAprobados = (presAprobados || []).map((p: any) => p.id_presupuesto)

    // Conformidades ya subidas y pagos ya recibidos (en paralelo)
    const [conformidadesRes, pagosRecibidosRes] = await Promise.all([
      supabase
        .from('conformidades')
        .select('id_incidente')
        .in('id_incidente', Array.from(incidentesConPresupuesto))
        .not('url_documento', 'is', null),
      supabase
        .from('pagos_tecnicos')
        .select('id_presupuesto')
        .in('id_presupuesto', idPresupuestosAprobados),
    ])

    const incidentesConConformidad = new Set((conformidadesRes.data || []).map((c: any) => c.id_incidente))
    const presupuestosConPago = new Set((pagosRecibidosRes.data || []).map((p: any) => p.id_presupuesto))

    // Trabajos = incidentes con presupuesto aprobado y sin conformidad subida
    const trabajos = Array.from(incidentesConPresupuesto)
      .filter(id => !incidentesConConformidad.has(id)).length

    // Pagos = presupuestos aprobados sin pago técnico recibido
    const pagos = idPresupuestosAprobados.filter((id: number) => !presupuestosConPago.has(id)).length

    return { disponibles, trabajos, pagos }
  } catch {
    return { disponibles: 0, trabajos: 0, pagos: 0 }
  }
}
