'use server'

/**
 * Servicio de Presupuestos
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireAdminOrGestorId, requireTecnicoId } from '@/features/auth/auth.service'
import type { ActionResult } from '@/shared/types'
import { EstadoPresupuesto } from '@/shared/types/enums'
import type { Presupuesto, PresupuestoConDetalle } from './presupuestos.types'

const PRESUPUESTO_SELECT = `
  id_presupuesto,
  id_incidente,
  id_inspeccion,
  descripcion_detallada,
  costo_materiales,
  costo_mano_obra,
  gastos_administrativos,
  costo_total,
  estado_presupuesto,
  fecha_aprobacion,
  id_aprobado_por,
  alternativas_reparacion,
  fecha_creacion,
  fecha_modificacion,
  incidentes (
    id_incidente,
    descripcion_problema,
    categoria,
    id_cliente_reporta
  )
`

/**
 * Obtener todos los presupuestos (admin/gestor)
 */
export async function getPresupuestosForAdmin(): Promise<PresupuestoConDetalle[]> {
  const supabase = await createClient()
  await requireAdminOrGestorId()

  const { data, error } = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as unknown as PresupuestoConDetalle[]
}

/**
 * Obtener presupuestos de un incidente específico
 */
export async function getPresupuestosDelIncidente(idIncidente: number): Promise<Presupuesto[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .eq('id_incidente', idIncidente)
    .order('fecha_creacion', { ascending: true })

  if (error) throw error
  return data as unknown as Presupuesto[]
}

/**
 * Obtener presupuestos del técnico actual.
 * Busca a través de las asignaciones del técnico para encontrar los incidentes relacionados.
 */
export async function getPresupuestosDeTecnico(): Promise<PresupuestoConDetalle[]> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

  const { data: asignaciones, error: asigError } = await supabase
    .from('asignaciones_tecnico')
    .select('id_incidente')
    .eq('id_tecnico', idTecnico)

  if (asigError) throw asigError
  if (!asignaciones?.length) return []

  const idIncidentes = asignaciones.map((a: any) => a.id_incidente).filter(Boolean)
  if (!idIncidentes.length) return []

  const { data, error } = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .in('id_incidente', idIncidentes)
    .in('estado_presupuesto', [EstadoPresupuesto.ENVIADO, EstadoPresupuesto.APROBADO_ADMIN, EstadoPresupuesto.APROBADO])
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as unknown as PresupuestoConDetalle[]
}

/**
 * IDs de incidentes del cliente con presupuesto pendiente de aprobación (aprobado_admin)
 */
export async function getIncidentesConPresupuestoPendiente(): Promise<number[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('presupuestos')
    .select('id_incidente')
    .eq('estado_presupuesto', EstadoPresupuesto.APROBADO_ADMIN)

  return (data ?? []).map((p: any) => p.id_incidente).filter(Boolean) as number[]
}

/**
 * Obtener presupuestos de los incidentes de un cliente
 */
export async function getPresupuestosDelCliente(idCliente: number): Promise<PresupuestoConDetalle[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto,
      id_incidente,
      id_inspeccion,
      descripcion_detallada,
      costo_materiales,
      costo_mano_obra,
      gastos_administrativos,
      costo_total,
      estado_presupuesto,
      fecha_aprobacion,
      id_aprobado_por,
      alternativas_reparacion,
      fecha_creacion,
      fecha_modificacion,
      incidentes!inner (
        id_incidente,
        descripcion_problema,
        categoria,
        id_cliente_reporta
      )
    `)
    .eq('incidentes.id_cliente_reporta', idCliente)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as unknown as PresupuestoConDetalle[]
}

/**
 * Obtener un presupuesto específico
 */
export async function getPresupuesto(idPresupuesto: number): Promise<PresupuestoConDetalle | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .eq('id_presupuesto', idPresupuesto)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return (data as unknown as PresupuestoConDetalle) || null
}

// --- Escrituras ---

/**
 * Crear un nuevo presupuesto
 */
export async function crearPresupuesto(data: {
  id_incidente: number
  id_inspeccion?: number | null
  descripcion_detallada: string
  costo_total: number
  costo_materiales?: number
  costo_mano_obra?: number
  gastos_administrativos?: number
  alternativas_reparacion?: string
}): Promise<ActionResult<Presupuesto>> {
  try {
    const supabase = await createClient()

    const { data: presupuesto, error } = await supabase
      .from('presupuestos')
      .insert({
        ...data,
        estado_presupuesto: EstadoPresupuesto.ENVIADO,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    // Notificar al cliente (fire-and-forget)
    const { notificarPresupuestoCreado } = await import('@/features/notificaciones/notificaciones.service')
    notificarPresupuestoCreado(presupuesto.id_presupuesto).catch(console.error)

    return { success: true, data: presupuesto as Presupuesto }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear presupuesto' }
  }
}

/**
 * Actualizar presupuesto (solo en estado enviado)
 */
export async function actualizarPresupuesto(
  idPresupuesto: number,
  updates: {
    descripcion_detallada?: string
    costo_total?: number
    costo_materiales?: number
    costo_mano_obra?: number
    gastos_administrativos?: number
    alternativas_reparacion?: string
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const presupuesto = await getPresupuesto(idPresupuesto)
    if (!presupuesto) {
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (presupuesto.estado_presupuesto !== EstadoPresupuesto.ENVIADO) {
      return { success: false, error: 'No se puede editar un presupuesto en este estado' }
    }

    const { error } = await supabase
      .from('presupuestos')
      .update(updates)
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar presupuesto' }
  }
}

/**
 * Enviar presupuesto (marcar como enviado)
 */
export async function enviarPresupuesto(idPresupuesto: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Obtener id_incidente para la notificación
    const { data: pres } = await supabase
      .from('presupuestos')
      .select('id_incidente')
      .eq('id_presupuesto', idPresupuesto)
      .single()

    const { error } = await supabase
      .from('presupuestos')
      .update({ estado_presupuesto: EstadoPresupuesto.ENVIADO })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }

    // Notificar al admin que hay un presupuesto para revisar
    if (pres?.id_incidente) {
      try {
        const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
        await crearNotificacionAdmin({
          tipo: 'presupuesto_enviado_admin',
          titulo: 'Presupuesto para revisar',
          mensaje: `El técnico envió un presupuesto para el incidente #${pres.id_incidente}. Revisalo y aprobalo para continuar.`,
          id_incidente: pres.id_incidente,
          id_presupuesto: idPresupuesto,
        })
      } catch { /* no bloquear la operación principal */ }
    }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al enviar presupuesto' }
  }
}

/**
 * Aprobar presupuesto (admin/gestor) — guarda comisión y notifica al técnico
 */
export async function aprobarPresupuesto(
  idPresupuesto: number,
  gastosAdministrativos: number = 0,
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdminOrGestorId()

    // Obtener costos base para recalcular total
    const { data: pres, error: errGet } = await supabase
      .from('presupuestos')
      .select('costo_materiales, costo_mano_obra')
      .eq('id_presupuesto', idPresupuesto)
      .single()

    if (errGet || !pres) return { success: false, error: 'Presupuesto no encontrado' }

    const costoTotal = (pres.costo_materiales || 0) + (pres.costo_mano_obra || 0) + gastosAdministrativos

    const { error } = await supabase
      .from('presupuestos')
      .update({
        estado_presupuesto: EstadoPresupuesto.APROBADO_ADMIN,
        gastos_administrativos: gastosAdministrativos,
        costo_total: costoTotal,
      })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }

    // Notificar al cliente para que revise y apruebe (email, fire-and-forget)
    const { notificarPresupuestoAprobadoAdmin } = await import('@/features/notificaciones/notificaciones.service')
    notificarPresupuestoAprobadoAdmin(idPresupuesto).catch(console.error)

    // Notificar al cliente in-app
    const supabaseAdmin = (await import('@/shared/lib/supabase/admin')).createAdminClient()
    const { data: presConInc } = await supabaseAdmin
      .from('presupuestos')
      .select('id_incidente, incidentes!inner(id_cliente_reporta)')
      .eq('id_presupuesto', idPresupuesto)
      .single()
    const idClienteNotif = (presConInc?.incidentes as any)?.id_cliente_reporta
    if (idClienteNotif) {
      try {
        const { crearNotificacionCliente } = await import('@/features/notificaciones/notificaciones-inapp.service')
        await crearNotificacionCliente({
          id_cliente: idClienteNotif,
          tipo: 'presupuesto_aprobado_admin',
          titulo: 'Presupuesto listo para revisar',
          mensaje: `La administración revisó y aprobó el presupuesto del incidente #${presConInc?.id_incidente}. Por favor revisalo y aprobalo para que el técnico pueda comenzar el trabajo.`,
          id_incidente: presConInc?.id_incidente,
          id_presupuesto: idPresupuesto,
        })
      } catch { /* no bloquear la operación principal */ }
    }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al aprobar presupuesto' }
  }
}

/**
 * Rechazar presupuesto (admin/gestor).
 * Si ya existe un presupuesto aprobado para el incidente → presupuesto adicional:
 *   no desvincula al técnico, no cambia estado del incidente, notifica que debe terminar como está.
 * Si es el primer presupuesto → comportamiento original (desvincula técnico, vuelve a pendiente).
 */
export async function rechazarPresupuesto(
  idPresupuesto: number,
  _razonRechazo?: string
): Promise<ActionResult> {
  try {
    await requireAdminOrGestorId()
    const { createAdminClient } = await import('@/shared/lib/supabase/admin')
    const supabase = createAdminClient()

    // Obtener id_incidente del presupuesto
    const { data: pres, error: errGet } = await supabase
      .from('presupuestos')
      .select('id_incidente')
      .eq('id_presupuesto', idPresupuesto)
      .single()

    if (errGet || !pres) return { success: false, error: 'Presupuesto no encontrado' }

    // Detectar si es presupuesto adicional (ya existe uno aprobado para el incidente)
    const { data: presAprobados } = await supabase
      .from('presupuestos')
      .select('id_presupuesto')
      .eq('id_incidente', pres.id_incidente)
      .eq('estado_presupuesto', EstadoPresupuesto.APROBADO)
      .neq('id_presupuesto', idPresupuesto)

    const esAdicional = presAprobados && presAprobados.length > 0

    // Marcar presupuesto como rechazado
    const { error } = await supabase
      .from('presupuestos')
      .update({ estado_presupuesto: EstadoPresupuesto.RECHAZADO })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }

    if (esAdicional) {
      // Presupuesto adicional rechazado: el técnico continúa con lo que tiene
      // Notificar al técnico que debe terminar el trabajo como está
      const { data: asigConTecnico } = await supabase
        .from('asignaciones_tecnico')
        .select('id_tecnico')
        .eq('id_incidente', pres.id_incidente)
        .in('estado_asignacion', ['aceptada', 'en_curso', 'completada'])
        .maybeSingle()

      if (asigConTecnico?.id_tecnico) {
        try {
          const { crearNotificacion } = await import('@/features/notificaciones/notificaciones-inapp.service')
          await crearNotificacion({
            id_tecnico: asigConTecnico.id_tecnico,
            tipo: 'presupuesto_adicional_rechazado',
            titulo: 'Presupuesto adicional rechazado',
            mensaje: `La administración rechazó tu presupuesto adicional del incidente #${pres.id_incidente}. Deberás terminar el trabajo con los recursos aprobados anteriormente. El trabajo puede quedar incompleto.`,
            id_incidente: pres.id_incidente,
            id_presupuesto: idPresupuesto,
          })
        } catch { /* no bloquear la operación principal */ }
      }
      return { success: true, data: undefined }
    }

    // Primer presupuesto rechazado — comportamiento original
    const { data: asig } = await supabase
      .from('asignaciones_tecnico')
      .select('id_asignacion')
      .eq('id_incidente', pres.id_incidente)
      .in('estado_asignacion', ['pendiente', 'aceptada', 'en_curso'])
      .maybeSingle()

    if (asig) {
      const { data: asigConTecnico } = await supabase
        .from('asignaciones_tecnico')
        .select('id_tecnico')
        .eq('id_asignacion', asig.id_asignacion)
        .single()

      await supabase
        .from('asignaciones_tecnico')
        .update({ estado_asignacion: 'rechazada', fecha_rechazo: new Date().toISOString() })
        .eq('id_asignacion', asig.id_asignacion)

      if (asigConTecnico?.id_tecnico) {
        await supabase
          .from('inspecciones')
          .update({ esta_anulada: true })
          .eq('id_incidente', pres.id_incidente)
          .eq('id_tecnico', asigConTecnico.id_tecnico)
          .eq('esta_anulada', false)

        try {
          const { crearNotificacion } = await import('@/features/notificaciones/notificaciones-inapp.service')
          await crearNotificacion({
            id_tecnico: asigConTecnico.id_tecnico,
            tipo: 'presupuesto_rechazado',
            titulo: 'Presupuesto rechazado',
            mensaje: `La administración rechazó tu presupuesto del incidente #${pres.id_incidente}. Tu asignación fue revocada.`,
            id_incidente: pres.id_incidente,
            id_presupuesto: idPresupuesto,
          })
        } catch { /* no bloquear la operación principal */ }
      }
    }

    await supabase
      .from('incidentes')
      .update({ estado_actual: 'pendiente' })
      .eq('id_incidente', pres.id_incidente)

    const { notificarTecnicoPresupuestoRechazado } = await import('@/features/notificaciones/notificaciones.service')
    notificarTecnicoPresupuestoRechazado(idPresupuesto).catch(console.error)

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al rechazar presupuesto' }
  }
}

/**
 * Marcar presupuesto como vencido
 */
export async function marcarPresupuestoVencido(idPresupuesto: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdminOrGestorId()

    const { error } = await supabase
      .from('presupuestos')
      .update({ estado_presupuesto: EstadoPresupuesto.VENCIDO })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al marcar presupuesto como vencido' }
  }
}

/**
 * Aprobar presupuesto como cliente (cambiar de aprobado_admin a aprobado)
 */
export async function aprobarPresupuestoCliente(idPresupuesto: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const presupuesto = await getPresupuesto(idPresupuesto)
    if (!presupuesto) {
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (presupuesto.estado_presupuesto !== EstadoPresupuesto.APROBADO_ADMIN) {
      return { success: false, error: 'El presupuesto no está listo para aprobación del cliente' }
    }

    const { error } = await supabase
      .from('presupuestos')
      .update({
        estado_presupuesto: EstadoPresupuesto.APROBADO,
        fecha_aprobacion: new Date().toISOString(),
      })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }

    // Poner incidente en_proceso
    const supabaseAdmin = (await import('@/shared/lib/supabase/admin')).createAdminClient()
    const { data: pres } = await supabase.from('presupuestos').select('id_incidente').eq('id_presupuesto', idPresupuesto).single()
    if (pres?.id_incidente) {
      await supabaseAdmin.from('incidentes').update({ estado_actual: 'en_proceso' }).eq('id_incidente', pres.id_incidente)

      // Obtener técnico asignado para notificación in-app
      const { data: asig } = await supabaseAdmin
        .from('asignaciones_tecnico')
        .select('id_tecnico')
        .eq('id_incidente', pres.id_incidente)
        .in('estado_asignacion', ['aceptada', 'en_curso'])
        .maybeSingle()

      if (asig?.id_tecnico) {
        try {
          const { crearNotificacion } = await import('@/features/notificaciones/notificaciones-inapp.service')
          await crearNotificacion({
            id_tecnico: asig.id_tecnico,
            tipo: 'presupuesto_aprobado_cliente',
            titulo: '¡Presupuesto aprobado!',
            mensaje: `El cliente aprobó el presupuesto del incidente #${pres.id_incidente}. Ya podés comenzar el trabajo.`,
            id_incidente: pres.id_incidente,
            id_presupuesto: idPresupuesto,
          })
        } catch { /* no bloquear la operación principal */ }
      }
    }

    // Notificar al admin que el cliente aprobó el presupuesto
    if (pres?.id_incidente) {
      try {
        const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
        await crearNotificacionAdmin({
          tipo: 'presupuesto_aprobado_cliente',
          titulo: 'Presupuesto aprobado por el cliente',
          mensaje: `El cliente aprobó el presupuesto del incidente #${pres.id_incidente}. El técnico puede comenzar el trabajo.`,
          id_incidente: pres.id_incidente,
          id_presupuesto: idPresupuesto,
        })
      } catch { /* no bloquear la operación principal */ }
    }

    // Email al técnico (fire-and-forget)
    const { notificarTecnicoPresupuestoAprobado } = await import('@/features/notificaciones/notificaciones.service')
    notificarTecnicoPresupuestoAprobado(idPresupuesto).catch(console.error)

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al aprobar presupuesto' }
  }
}

/**
 * Rechazar presupuesto como cliente.
 * Si ya existe un presupuesto aprobado → es adicional: no desvincula técnico, el trabajo sigue.
 * Si es el primero → comportamiento original (desvincula técnico, vuelve a pendiente).
 */
export async function rechazarPresupuestoCliente(
  idPresupuesto: number,
  _razonRechazo?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const supabaseAdmin = (await import('@/shared/lib/supabase/admin')).createAdminClient()

    const presupuesto = await getPresupuesto(idPresupuesto)
    if (!presupuesto) return { success: false, error: 'Presupuesto no encontrado' }
    if (presupuesto.estado_presupuesto !== EstadoPresupuesto.APROBADO_ADMIN) {
      return { success: false, error: 'El presupuesto no puede ser rechazado en este estado' }
    }

    // Detectar si es presupuesto adicional
    const { data: presAprobados } = await supabaseAdmin
      .from('presupuestos')
      .select('id_presupuesto')
      .eq('id_incidente', presupuesto.id_incidente)
      .eq('estado_presupuesto', EstadoPresupuesto.APROBADO)
      .neq('id_presupuesto', idPresupuesto)

    const esAdicional = presAprobados && presAprobados.length > 0

    const { error } = await supabase
      .from('presupuestos')
      .update({ estado_presupuesto: EstadoPresupuesto.RECHAZADO })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }

    if (esAdicional) {
      // Presupuesto adicional: notificar al técnico y al admin, el trabajo continúa
      const { data: asigConTecnico } = await supabaseAdmin
        .from('asignaciones_tecnico')
        .select('id_tecnico')
        .eq('id_incidente', presupuesto.id_incidente)
        .in('estado_asignacion', ['aceptada', 'en_curso', 'completada'])
        .maybeSingle()

      try {
        const { crearNotificacion, crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
        if (asigConTecnico?.id_tecnico) {
          await crearNotificacion({
            id_tecnico: asigConTecnico.id_tecnico,
            tipo: 'presupuesto_adicional_rechazado',
            titulo: 'Presupuesto adicional rechazado por el cliente',
            mensaje: `El cliente rechazó tu presupuesto adicional del incidente #${presupuesto.id_incidente}. Deberás terminar el trabajo con los recursos aprobados anteriormente.`,
            id_incidente: presupuesto.id_incidente,
            id_presupuesto: idPresupuesto,
          })
        }
        await crearNotificacionAdmin({
          tipo: 'presupuesto_adicional_rechazado_cliente',
          titulo: 'Presupuesto adicional rechazado por el cliente',
          mensaje: `El cliente rechazó el presupuesto adicional del incidente #${presupuesto.id_incidente}. El técnico deberá terminar el trabajo con los recursos disponibles.`,
          id_incidente: presupuesto.id_incidente,
          id_presupuesto: idPresupuesto,
        })
      } catch { /* no bloquear la operación principal */ }
      return { success: true, data: undefined }
    }

    // Primer presupuesto — comportamiento original
    if (presupuesto.id_incidente) {
      const { data: asig } = await supabaseAdmin
        .from('asignaciones_tecnico')
        .select('id_asignacion')
        .eq('id_incidente', presupuesto.id_incidente)
        .in('estado_asignacion', ['pendiente', 'aceptada', 'en_curso'])
        .maybeSingle()
      if (asig) {
        await supabaseAdmin.from('asignaciones_tecnico').update({ estado_asignacion: 'rechazada' }).eq('id_asignacion', asig.id_asignacion)
      }
      await supabaseAdmin.from('incidentes').update({ estado_actual: 'pendiente' }).eq('id_incidente', presupuesto.id_incidente)

      try {
        const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
        await crearNotificacionAdmin({
          tipo: 'presupuesto_rechazado_cliente',
          titulo: 'Presupuesto rechazado por el cliente',
          mensaje: `El cliente rechazó el presupuesto del incidente #${presupuesto.id_incidente}.`,
          id_incidente: presupuesto.id_incidente,
          id_presupuesto: idPresupuesto,
        })
      } catch { /* no bloquear la operación principal */ }
    }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al rechazar presupuesto' }
  }
}
