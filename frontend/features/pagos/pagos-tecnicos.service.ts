'use server'

/**
 * Servicio de Pagos a Técnicos
 * Gestiona el registro de lo que se le debe pagar a cada técnico por trabajo realizado.
 * El monto = costo_materiales + costo_mano_obra (sin gastos_administrativos, que queda para admin).
 * Requiere la tabla `pagos_tecnicos` en la DB.
 */

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import type { ActionResult } from '@/shared/types'

export interface PendientePagoTecnico {
  id_presupuesto: number
  id_incidente: number
  id_tecnico: number
  nombre_tecnico: string
  apellido_tecnico: string
  descripcion_problema: string
  categoria: string | null
  costo_materiales: number
  costo_mano_obra: number
  monto_a_pagar: number
  fecha_presupuesto: string
}

export interface PagoTecnicoRegistrado {
  id_pago_tecnico: number
  id_tecnico: number
  id_presupuesto: number
  id_incidente: number
  monto_pago: number
  metodo_pago: string | null
  referencia_pago: string | null
  banco: string | null
  cuotas: number | null
  fecha_pago: string
  marcado_por_email: string | null
  marcado_por_nombre: string | null
  observaciones: string | null
  fecha_creacion: string
  nombre_tecnico?: string
  apellido_tecnico?: string
  descripcion_problema?: string
}

/**
 * Obtiene presupuestos aprobados/resueltos que aún no tienen pago registrado al técnico.
 */
export async function getPendientesPagoTecnico(): Promise<PendientePagoTecnico[]> {
  const supabase = createAdminClient()

  // 1. Obtener todos los presupuestos con estado 'aprobado', con técnico asignado
  const { data: presupuestos, error } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, id_incidente, costo_materiales, costo_mano_obra, fecha_creacion,
      incidentes!inner (
        id_incidente, descripcion_problema, categoria, estado_actual,
        asignaciones_tecnico (
          id_tecnico, estado_asignacion,
          tecnicos (id_tecnico, nombre, apellido)
        )
      )
    `)
    .in('estado_presupuesto', ['aprobado'])
    .in('incidentes.estado_actual', ['finalizado', 'resuelto'])
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  if (!presupuestos?.length) return []

  // 2. Obtener pagos ya realizados
  const idPresupuestos = presupuestos.map(p => p.id_presupuesto)
  const { data: pagosYaHechos } = await supabase
    .from('pagos_tecnicos')
    .select('id_presupuesto')
    .in('id_presupuesto', idPresupuestos)

  const pagadosSet = new Set((pagosYaHechos || []).map((p: any) => p.id_presupuesto))

  // 3. Filtrar los pendientes
  const pendientes: PendientePagoTecnico[] = []
  for (const pres of presupuestos) {
    if (pagadosSet.has(pres.id_presupuesto)) continue

    const inc = pres.incidentes as any
    const asigs = Array.isArray(inc?.asignaciones_tecnico) ? inc.asignaciones_tecnico : []
    const asig = asigs.find((a: any) => ['completada', 'en_curso', 'aceptada'].includes(a.estado_asignacion)) || asigs[0]
    const tec = asig?.tecnicos
    if (!tec) continue

    const mat = Number(pres.costo_materiales) || 0
    const mdo = Number(pres.costo_mano_obra) || 0

    pendientes.push({
      id_presupuesto: pres.id_presupuesto,
      id_incidente: pres.id_incidente,
      id_tecnico: tec.id_tecnico,
      nombre_tecnico: tec.nombre,
      apellido_tecnico: tec.apellido,
      descripcion_problema: inc.descripcion_problema || '',
      categoria: inc.categoria,
      costo_materiales: mat,
      costo_mano_obra: mdo,
      monto_a_pagar: mat + mdo,
      fecha_presupuesto: pres.fecha_creacion,
    })
  }

  return pendientes
}

/**
 * Obtiene los pagos a técnicos ya registrados.
 */
export async function getPagosTecnicosRealizados(): Promise<PagoTecnicoRegistrado[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('pagos_tecnicos')
    .select(`
      id_pago_tecnico, id_tecnico, id_presupuesto, id_incidente,
      monto_pago, metodo_pago, referencia_pago, banco, cuotas,
      fecha_pago, marcado_por_email, marcado_por_nombre,
      observaciones, fecha_creacion,
      tecnicos (nombre, apellido),
      incidentes (descripcion_problema)
    `)
    .order('fecha_pago', { ascending: false })

  if (error) throw error

  return (data || []).map((p: any) => ({
    ...p,
    nombre_tecnico: p.tecnicos?.nombre,
    apellido_tecnico: p.tecnicos?.apellido,
    descripcion_problema: p.incidentes?.descripcion_problema,
  }))
}

/**
 * Registra que se le pagó al técnico.
 * Guarda quién lo marcó (email del admin logueado) para trazabilidad.
 */
export async function registrarPagoTecnico(
  idPresupuesto: number,
  idTecnico: number,
  idIncidente: number,
  montoPago: number,
  metodoPago?: string,
  referenciaPago?: string,
  banco?: string,
  cuotas?: number,
  observaciones?: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Obtener datos del admin logueado para trazabilidad
    const { data: { user } } = await supabase.auth.getUser()
    const emailAdmin = user?.email ?? null

    // Obtener nombre del admin si existe en alguna tabla de usuarios/empleados
    let nombreAdmin: string | null = null
    if (user?.id) {
      const adminSupabase = createAdminClient()
      const { data: emp } = await adminSupabase
        .from('empleados')
        .select('nombre, apellido')
        .eq('id_usuario', user.id)
        .maybeSingle()
      if (emp) nombreAdmin = `${emp.nombre} ${emp.apellido}`
    }

    const { error } = await createAdminClient()
      .from('pagos_tecnicos')
      .insert({
        id_tecnico: idTecnico,
        id_presupuesto: idPresupuesto,
        id_incidente: idIncidente,
        monto_pago: montoPago,
        metodo_pago: metodoPago ?? null,
        referencia_pago: referenciaPago ?? null,
        banco: banco ?? null,
        cuotas: cuotas ?? null,
        fecha_pago: new Date().toISOString(),
        marcado_por_email: emailAdmin,
        marcado_por_nombre: nombreAdmin,
        observaciones: observaciones ?? null,
      })

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al registrar pago' }
  }
}

// ─── Vista Técnico: mis pagos pendientes y recibidos ─────────────────────────

export interface MiPagoPendiente {
  id_presupuesto: number
  id_incidente: number
  descripcion_problema: string
  categoria: string | null
  costo_materiales: number
  costo_mano_obra: number
  monto_a_recibir: number
  fecha_presupuesto: string
}

export interface MiPagoRecibido {
  id_pago_tecnico: number
  id_incidente: number
  id_presupuesto: number
  monto_pago: number
  metodo_pago: string | null
  referencia_pago: string | null
  banco: string | null
  cuotas: number | null
  observaciones: string | null
  fecha_pago: string
  descripcion_problema: string | null
}

/**
 * Pagos pendientes y recibidos del técnico actual.
 */
export async function getMisPagosComoTecnico(): Promise<{ pendientes: MiPagoPendiente[], recibidos: MiPagoRecibido[] }> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

  // Mis asignaciones activas/completadas
  const { data: asignaciones } = await supabase
    .from('asignaciones_tecnico')
    .select('id_incidente')
    .eq('id_tecnico', idTecnico)
    .in('estado_asignacion', ['en_curso', 'completado', 'aceptada'])

  if (!asignaciones?.length) return { pendientes: [], recibidos: [] }
  const idIncidentes = asignaciones.map((a: any) => a.id_incidente).filter(Boolean) as number[]

  // Presupuestos aprobados de mis incidentes
  const { data: presupuestos } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, id_incidente, costo_materiales, costo_mano_obra, fecha_creacion,
      incidentes (descripcion_problema, categoria)
    `)
    .in('id_incidente', idIncidentes)
    .eq('estado_presupuesto', 'aprobado')
    .order('fecha_creacion', { ascending: false })

  if (!presupuestos?.length) return { pendientes: [], recibidos: [] }

  const idPresupuestos = presupuestos.map((p: any) => p.id_presupuesto)

  // Pagos ya recibidos
  const { data: pagos } = await supabase
    .from('pagos_tecnicos')
    .select(`
      id_pago_tecnico, id_incidente, id_presupuesto,
      monto_pago, metodo_pago, referencia_pago, banco, cuotas, observaciones, fecha_pago,
      incidentes (descripcion_problema)
    `)
    .in('id_presupuesto', idPresupuestos)
    .order('fecha_pago', { ascending: false })

  const pagadosIds = new Set((pagos || []).map((p: any) => p.id_presupuesto))

  const pendientes: MiPagoPendiente[] = presupuestos
    .filter((p: any) => !pagadosIds.has(p.id_presupuesto))
    .map((p: any) => {
      const inc = p.incidentes as any
      const mat = Number(p.costo_materiales) || 0
      const mdo = Number(p.costo_mano_obra) || 0
      return {
        id_presupuesto: p.id_presupuesto,
        id_incidente: p.id_incidente,
        descripcion_problema: inc?.descripcion_problema || '',
        categoria: inc?.categoria || null,
        costo_materiales: mat,
        costo_mano_obra: mdo,
        monto_a_recibir: mat + mdo,
        fecha_presupuesto: p.fecha_creacion,
      }
    })

  const recibidos: MiPagoRecibido[] = (pagos || []).map((p: any) => ({
    id_pago_tecnico: p.id_pago_tecnico,
    id_incidente: p.id_incidente,
    id_presupuesto: p.id_presupuesto,
    monto_pago: Number(p.monto_pago) || 0,
    metodo_pago: p.metodo_pago,
    referencia_pago: p.referencia_pago,
    banco: p.banco,
    cuotas: p.cuotas,
    observaciones: p.observaciones,
    fecha_pago: p.fecha_pago,
    descripcion_problema: (p.incidentes as any)?.descripcion_problema || null,
  }))

  return { pendientes, recibidos }
}

import { requireTecnicoId } from '@/features/auth/auth.service'
