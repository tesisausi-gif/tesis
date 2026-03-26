'use server'

/**
 * Servicio de Asignaciones
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireTecnicoId } from '@/features/auth/auth.service'
import type { Asignacion, AsignacionTecnico } from './asignaciones.types'
import type { ActionResult } from '@/shared/types'

// Select con incidente y detalles
const ASIGNACION_SELECT = `
  id_asignacion,
  id_incidente,
  id_tecnico,
  estado_asignacion,
  fecha_asignacion,
  fecha_aceptacion,
  fecha_rechazo,
  fecha_visita_programada,
  observaciones,
  incidentes (
    id_incidente,
    descripcion_problema,
    categoria,
    nivel_prioridad,
    estado_actual,
    disponibilidad,
    inmuebles (
      calle,
      altura,
      piso,
      dpto,
      barrio,
      localidad
    ),
    clientes:id_cliente_reporta (
      nombre,
      apellido,
      telefono,
      correo_electronico
    )
  ),
  tecnicos (
    nombre,
    apellido
  )
`

/**
 * Obtener todas las asignaciones (admin)
 */
export async function getAsignacionesForAdmin(): Promise<Asignacion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(ASIGNACION_SELECT)
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as unknown as Asignacion[]
}

/**
 * Obtener asignaciones pendientes del técnico actual
 */
export async function getAsignacionesPendientes(): Promise<Asignacion[]> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(ASIGNACION_SELECT)
    .eq('id_tecnico', idTecnico)
    .eq('estado_asignacion', 'pendiente')
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as unknown as Asignacion[]
}

/**
 * Obtener cantidad de asignaciones pendientes del técnico actual
 */
export async function getCountAsignacionesPendientes(): Promise<number> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

  const { count, error } = await supabase
    .from('asignaciones_tecnico')
    .select('id_asignacion', { count: 'exact', head: true })
    .eq('id_tecnico', idTecnico)
    .eq('estado_asignacion', 'pendiente')

  if (error) return 0
  return count || 0
}

/**
 * Obtener asignaciones activas del técnico actual (aceptadas, en_curso, completadas)
 */
export async function getAsignacionesActivas(): Promise<AsignacionTecnico[]> {
  const { createAdminClient } = await import('@/shared/lib/supabase/admin')
  const supabase = createAdminClient()
  const idTecnico = await requireTecnicoId()

  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(`
      id_asignacion,
      id_incidente,
      id_tecnico,
      estado_asignacion,
      fecha_asignacion,
      fecha_visita_programada,
      observaciones,
      incidentes (
        id_incidente,
        descripcion_problema,
        categoria,
        nivel_prioridad,
        estado_actual,
        inmuebles (
          calle,
          altura,
          piso,
          dpto,
          barrio,
          localidad
        ),
        clientes:id_cliente_reporta (
          nombre,
          apellido,
          telefono,
          correo_electronico,
          direccion
        )
      )
    `)
    .eq('id_tecnico', idTecnico)
    .in('estado_asignacion', ['aceptada', 'en_curso', 'completada'])
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as unknown as AsignacionTecnico[]
}

// --- Escrituras ---

export async function aceptarAsignacion(
  idAsignacion: number,
  idIncidente: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Obtener nombre del técnico e id_cliente del incidente para notificaciones
    const { data: asig } = await supabase
      .from('asignaciones_tecnico')
      .select('tecnicos(nombre, apellido)')
      .eq('id_asignacion', idAsignacion)
      .single()

    const { data: inc } = await supabase
      .from('incidentes')
      .select('id_cliente_reporta, clientes(id_cliente)')
      .eq('id_incidente', idIncidente)
      .single()

    const { error: errorAsignacion } = await supabase
      .from('asignaciones_tecnico')
      .update({
        estado_asignacion: 'aceptada',
        fecha_aceptacion: new Date().toISOString(),
      })
      .eq('id_asignacion', idAsignacion)

    if (errorAsignacion) return { success: false, error: errorAsignacion.message }

    const { error: errorIncidente } = await supabase
      .from('incidentes')
      .update({ estado_actual: 'en_proceso' })
      .eq('id_incidente', idIncidente)

    if (errorIncidente) return { success: false, error: errorIncidente.message }

    // Notificar al admin y al cliente
    const tec = asig?.tecnicos as any
    const tecNombre = tec ? `${tec.nombre} ${tec.apellido}` : 'El técnico'
    const { crearNotificacionAdmin, crearNotificacionCliente } = await import('@/features/notificaciones/notificaciones-inapp.service')

    try {
      await crearNotificacionAdmin({
        tipo: 'asignacion_aceptada',
        titulo: 'Técnico aceptó la asignación',
        mensaje: `${tecNombre} aceptó el incidente #${idIncidente} y comenzó a trabajar en él.`,
        id_incidente: idIncidente,
      })
    } catch { /* no bloquear la operación principal */ }

    const idCliente = (inc?.clientes as any)?.id_cliente
    if (idCliente) {
      try {
        await crearNotificacionCliente({
          id_cliente: idCliente,
          tipo: 'asignacion_aceptada',
          titulo: 'Técnico asignado a tu incidente',
          mensaje: `${tecNombre} fue asignado y aceptó atender tu incidente #${idIncidente}. Ya está en proceso.`,
          id_incidente: idIncidente,
        })
      } catch { /* no bloquear la operación principal */ }
    }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al aceptar asignación' }
  }
}

export async function rechazarAsignacion(
  idAsignacion: number,
  idIncidente: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Obtener nombre del técnico para la notificación al admin
    const { data: asig } = await supabase
      .from('asignaciones_tecnico')
      .select('tecnicos(nombre, apellido)')
      .eq('id_asignacion', idAsignacion)
      .single()

    const { error: errorAsignacion } = await supabase
      .from('asignaciones_tecnico')
      .update({
        estado_asignacion: 'rechazada',
        fecha_rechazo: new Date().toISOString(),
      })
      .eq('id_asignacion', idAsignacion)

    if (errorAsignacion) return { success: false, error: errorAsignacion.message }

    // Al rechazar, el incidente queda en 'asignacion_solicitada' para que el admin pueda re-asignar
    const { error: errorIncidente } = await supabase
      .from('incidentes')
      .update({ estado_actual: 'asignacion_solicitada' })
      .eq('id_incidente', idIncidente)

    if (errorIncidente) return { success: false, error: errorIncidente.message }

    // Notificar al admin
    const tec = asig?.tecnicos as any
    const tecNombre = tec ? `${tec.nombre} ${tec.apellido}` : 'El técnico'
    try {
      const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
      await crearNotificacionAdmin({
        tipo: 'asignacion_rechazada',
        titulo: 'Técnico rechazó la asignación',
        mensaje: `${tecNombre} rechazó el incidente #${idIncidente}. Requiere reasignación.`,
        id_incidente: idIncidente,
      })
    } catch { /* no bloquear la operación principal */ }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al rechazar asignación' }
  }
}

export async function crearAsignacion(data: {
  id_incidente: number
  id_tecnico: number
  observaciones: string | null
}): Promise<ActionResult> {
  try {
    const { createAdminClient } = await import('@/shared/lib/supabase/admin')
    const supabase = createAdminClient()

    // Cancelar asignaciones pendientes anteriores (re-asignación por parte del admin)
    await supabase
      .from('asignaciones_tecnico')
      .update({ estado_asignacion: 'rechazada', fecha_rechazo: new Date().toISOString() })
      .eq('id_incidente', data.id_incidente)
      .eq('estado_asignacion', 'pendiente')

    const { error } = await supabase
      .from('asignaciones_tecnico')
      .insert({
        ...data,
        estado_asignacion: 'pendiente',
      })

    if (error) return { success: false, error: error.message }

    // Actualizar estado del incidente a "asignacion_solicitada" para indicar solicitud enviada
    await supabase
      .from('incidentes')
      .update({ estado_actual: 'asignacion_solicitada' })
      .eq('id_incidente', data.id_incidente)
      .in('estado_actual', ['pendiente', 'asignacion_solicitada'])

    // Notificar al técnico: in-app + email
    try {
      const { crearNotificacion } = await import('@/features/notificaciones/notificaciones-inapp.service')
      await crearNotificacion({
        id_tecnico: data.id_tecnico,
        tipo: 'nueva_asignacion',
        titulo: 'Nueva asignación',
        mensaje: `Se te asignó el incidente #${data.id_incidente}. Revisá los detalles y aceptá o rechazá la asignación.`,
        id_incidente: data.id_incidente,
      })
    } catch { /* no bloquear la operación principal */ }

    const { notificarNuevaAsignacion } = await import('@/features/notificaciones/notificaciones.service')
    notificarNuevaAsignacion(data.id_incidente, data.id_tecnico).catch(console.error)

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear asignación' }
  }
}

/**
 * Técnico marca su asignación como completada
 */
export async function completarAsignacion(idAsignacion: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireTecnicoId()

    // Obtener id_incidente antes de actualizar para notificar al admin
    const { data: asig } = await supabase
      .from('asignaciones_tecnico')
      .select('id_incidente, tecnicos(nombre, apellido)')
      .eq('id_asignacion', idAsignacion)
      .single()

    const { error } = await supabase
      .from('asignaciones_tecnico')
      .update({ estado_asignacion: 'completada', fecha_completado: new Date().toISOString() })
      .eq('id_asignacion', idAsignacion)

    if (error) return { success: false, error: error.message }

    // Notificar al admin que el trabajo fue completado
    if (asig?.id_incidente) {
      const tecNombre = asig.tecnicos
        ? `${(asig.tecnicos as any).nombre} ${(asig.tecnicos as any).apellido}`
        : 'El técnico'
      try {
        const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
        await crearNotificacionAdmin({
          tipo: 'trabajo_completado',
          titulo: 'Trabajo completado',
          mensaje: `${tecNombre} marcó el incidente #${asig.id_incidente} como completado. Pendiente de conformidad.`,
          id_incidente: asig.id_incidente,
        })
      } catch { /* no bloquear la operación principal */ }
    }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al completar asignación' }
  }
}
