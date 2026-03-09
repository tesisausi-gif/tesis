'use server'

/**
 * Servicio de Cobros a Clientes
 * Gestiona el cobro del monto total (con comisión) al cliente una vez resuelto el incidente.
 * El trigger es: conformidad aprobada → incidente resuelto → aparece como pendiente de cobro.
 */

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import type { ActionResult } from '@/shared/types'

export interface PendienteCobroCliente {
  id_presupuesto: number
  id_incidente: number
  id_cliente: number
  nombre_cliente: string
  apellido_cliente: string
  descripcion_problema: string
  categoria: string | null
  monto_cobro: number       // costo_total (incluye comisión)
  fecha_presupuesto: string
}

export interface CobroClienteRegistrado {
  id_cobro: number
  id_incidente: number
  id_presupuesto: number
  id_cliente: number
  monto_cobro: number
  metodo_pago: string
  referencia_pago: string | null
  banco: string | null
  cuotas: number | null
  marcado_por_email: string | null
  marcado_por_nombre: string | null
  observaciones: string | null
  fecha_cobro: string
  fecha_creacion: string
  nombre_cliente?: string
  apellido_cliente?: string
  descripcion_problema?: string
}

/**
 * Presupuestos aprobados con incidente resuelto sin cobro registrado.
 */
export async function getPendientesCobroCliente(): Promise<PendienteCobroCliente[]> {
  const supabase = createAdminClient()

  const { data: presupuestos, error } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, id_incidente, costo_total, fecha_creacion,
      incidentes!inner (
        id_incidente, descripcion_problema, categoria, estado_actual,
        id_cliente_reporta,
        clientes:id_cliente_reporta (id_cliente, nombre, apellido)
      )
    `)
    .eq('estado_presupuesto', 'aprobado')
    .eq('incidentes.estado_actual', 'resuelto')
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  if (!presupuestos?.length) return []

  // Filtrar los que ya tienen cobro
  const ids = presupuestos.map(p => p.id_presupuesto)
  const { data: cobrosYaHechos } = await supabase
    .from('cobros_clientes')
    .select('id_presupuesto')
    .in('id_presupuesto', ids)

  const cobradosSet = new Set((cobrosYaHechos || []).map((c: any) => c.id_presupuesto))

  const pendientes: PendienteCobroCliente[] = []
  for (const pres of presupuestos) {
    if (cobradosSet.has(pres.id_presupuesto)) continue
    const inc = pres.incidentes as any
    const cliente = Array.isArray(inc?.clientes) ? inc.clientes[0] : inc?.clientes
    if (!cliente) continue

    pendientes.push({
      id_presupuesto: pres.id_presupuesto,
      id_incidente: pres.id_incidente,
      id_cliente: cliente.id_cliente ?? inc.id_cliente_reporta,
      nombre_cliente: cliente.nombre,
      apellido_cliente: cliente.apellido,
      descripcion_problema: inc.descripcion_problema || '',
      categoria: inc.categoria,
      monto_cobro: Number(pres.costo_total) || 0,
      fecha_presupuesto: pres.fecha_creacion,
    })
  }

  return pendientes
}

/**
 * Cobros ya registrados (historial).
 */
export async function getCobrosClientesRealizados(): Promise<CobroClienteRegistrado[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('cobros_clientes')
    .select(`
      id_cobro, id_incidente, id_presupuesto, id_cliente,
      monto_cobro, metodo_pago, referencia_pago, banco, cuotas,
      marcado_por_email, marcado_por_nombre, observaciones,
      fecha_cobro, fecha_creacion,
      clientes (nombre, apellido),
      incidentes (descripcion_problema)
    `)
    .order('fecha_cobro', { ascending: false })

  if (error) throw error

  return (data || []).map((c: any) => ({
    ...c,
    nombre_cliente: c.clientes?.nombre,
    apellido_cliente: c.clientes?.apellido,
    descripcion_problema: c.incidentes?.descripcion_problema,
  }))
}

/**
 * Registra el cobro al cliente con método de pago y trazabilidad.
 */
export async function registrarCobroCliente(params: {
  idPresupuesto: number
  idIncidente: number
  idCliente: number
  montoCobro: number
  metodoPago: string
  referenciaPago?: string
  banco?: string
  cuotas?: number
  observaciones?: string
}): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const emailAdmin = user?.email ?? null

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
      .from('cobros_clientes')
      .insert({
        id_incidente: params.idIncidente,
        id_presupuesto: params.idPresupuesto,
        id_cliente: params.idCliente,
        monto_cobro: params.montoCobro,
        metodo_pago: params.metodoPago,
        referencia_pago: params.referenciaPago ?? null,
        banco: params.banco ?? null,
        cuotas: params.cuotas ?? null,
        marcado_por_email: emailAdmin,
        marcado_por_nombre: nombreAdmin,
        observaciones: params.observaciones ?? null,
        fecha_cobro: new Date().toISOString(),
      })

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al registrar cobro' }
  }
}
