'use server'

/**
 * Servicio de Asignaciones
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { translateDbError } from '@/shared/lib/db-errors'
import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
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
    url_foto_diagnostico,
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
        fue_resuelto,
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

    // Aceptar SOLO si la asignación sigue pendiente (evita revivir un incidente
    // cancelado/reasignado y evita doble aceptación por otro técnico)
    const { data: asigActualizada, error: errorAsignacion } = await supabase
      .from('asignaciones_tecnico')
      .update({
        estado_asignacion: 'aceptada',
        fecha_aceptacion: new Date().toISOString(),
      })
      .eq('id_asignacion', idAsignacion)
      .eq('estado_asignacion', 'pendiente')
      .select('id_asignacion')

    if (errorAsignacion) return { success: false, error: errorAsignacion.message }
    if (!asigActualizada || asigActualizada.length === 0) {
      return {
        success: false,
        error: 'La asignación ya no está disponible: el incidente pudo haber sido cancelado o reasignado.',
      }
    }

    // Marcar otras asignaciones pendientes del mismo incidente como superadas
    // (otro técnico aceptó primero — no cuenta como rechazo del técnico)
    await supabase
      .from('asignaciones_tecnico')
      .update({ estado_asignacion: 'superada' })
      .eq('id_incidente', idIncidente)
      .eq('estado_asignacion', 'pendiente')
      .neq('id_asignacion', idAsignacion)

    // Pasar a en_proceso SOLO si el incidente sigue esperando asignación
    // (un incidente cancelado no debe revivir)
    const { error: errorIncidente } = await supabase
      .from('incidentes')
      .update({ estado_actual: 'en_proceso' })
      .eq('id_incidente', idIncidente)
      .in('estado_actual', ['asignacion_solicitada', 'pendiente'])

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

    // Bloquear si el incidente ya tiene un técnico ocupándolo: ya sea una asignación
    // pendiente de respuesta o una ya activa (aceptada/en_curso/completada). Así se
    // evita tener dos técnicos sobre el mismo incidente. Para cambiar de técnico, el
    // admin primero debe darlo de baja (eso cancela la asignación anterior).
    const { data: ocupada } = await supabase
      .from('asignaciones_tecnico')
      .select('id_asignacion, estado_asignacion, tecnicos(nombre, apellido)')
      .eq('id_incidente', data.id_incidente)
      .in('estado_asignacion', ['pendiente', 'aceptada', 'en_curso', 'completada'])
      .limit(1)
      .maybeSingle()

    if (ocupada) {
      const tec = (ocupada as any).tecnicos
      const nombre = tec ? `${tec.nombre} ${tec.apellido}` : 'un técnico'
      const esPendiente = (ocupada as any).estado_asignacion === 'pendiente'
      return {
        success: false,
        error: esPendiente
          ? `${nombre} ya tiene una asignación pendiente de respuesta. Esperá a que acepte o rechace antes de asignar a otro técnico.`
          : `El incidente ya tiene a ${nombre} asignado. Para cambiar de técnico, primero dalo de baja del incidente.`,
      }
    }

    const { error } = await supabase
      .from('asignaciones_tecnico')
      .insert({
        ...data,
        estado_asignacion: 'pendiente',
      })

    if (error) return { success: false, error: translateDbError(error) }

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
 * Rutina única de "cierre de residuos" de un incidente.
 * Deja el incidente sin cabos sueltos cuando se cancela o se reasigna:
 *  - libera el compromiso de calendario del técnico (fecha_visita_programada)
 *  - cancela las visitas activas (propuesta/confirmada)
 *  - anula las inspecciones vigentes
 *  - cierra los presupuestos en vuelo (opcional) para que no reviva el incidente
 *    ni el nuevo técnico herede el precio/inspección del anterior
 * Cada paso es tolerante a fallos para no bloquear la operación principal.
 */
export async function cerrarResiduosDeIncidente(
  idIncidente: number,
  opciones: { cerrarPresupuestos?: boolean } = {},
): Promise<void> {
  const { cerrarPresupuestos = true } = opciones
  const admin = createAdminClient()

  // 1. Liberar el compromiso de calendario del técnico
  try {
    const { liberarCompromisoDeIncidente } = await import('@/features/disponibilidad/disponibilidad.service')
    await liberarCompromisoDeIncidente(idIncidente)
  } catch { /* no bloquear */ }

  // 2. Cancelar visitas activas
  try {
    await admin
      .from('visitas')
      .update({ estado: 'cancelada' })
      .eq('id_incidente', idIncidente)
      .in('estado', ['propuesta', 'confirmada'])
  } catch { /* no bloquear */ }

  // 3. Anular inspecciones vigentes
  try {
    await admin
      .from('inspecciones')
      .update({ esta_anulada: true })
      .eq('id_incidente', idIncidente)
      .eq('esta_anulada', false)
  } catch { /* no bloquear */ }

  // 4. Cerrar presupuestos en vuelo (no toca los ya rechazados/vencidos)
  if (cerrarPresupuestos) {
    try {
      await admin
        .from('presupuestos')
        .update({ estado_presupuesto: 'rechazado', fecha_modificacion: new Date().toISOString() })
        .eq('id_incidente', idIncidente)
        .in('estado_presupuesto', ['borrador', 'enviado', 'aprobado_admin', 'aprobado'])
    } catch { /* no bloquear */ }
  }
}

/**
 * Técnico cancela una asignación ya aceptada.
 * Consecuencias:
 * - La asignación queda como 'cancelada'
 * - El incidente vuelve a 'pendiente' para que el admin reasigne
 * - Se registra una calificación de 1 estrella como penalización
 */
export async function cancelarAsignacionAceptada(
  idAsignacion: number,
  idIncidente: number,
  motivo?: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const idTecnico = await requireTecnicoId()

    // 1. Marcar asignación como cancelada — guardar motivo en observaciones
    const { error: errAsig } = await supabase
      .from('asignaciones_tecnico')
      .update({
        estado_asignacion: 'cancelada',
        fecha_rechazo: new Date().toISOString(),
        observaciones: motivo ?? null,
      })
      .eq('id_asignacion', idAsignacion)
      .eq('id_tecnico', idTecnico)

    if (errAsig) return { success: false, error: errAsig.message }

    // 2. Resetear incidente a pendiente
    const { error: errInc } = await supabase
      .from('incidentes')
      .update({ estado_actual: 'pendiente' })
      .eq('id_incidente', idIncidente)

    if (errInc) return { success: false, error: errInc.message }

    // Nota: se eliminó la penalización de 1 estrella.
    // La baja queda registrada y afecta el factor Disponibilidad del IRT automáticamente.

    // 3. Obtener nombre del técnico para la notificación
    const { data: asig } = await supabase
      .from('asignaciones_tecnico')
      .select('tecnicos(nombre, apellido)')
      .eq('id_asignacion', idAsignacion)
      .single()

    const tec = asig?.tecnicos as any
    const tecNombre = tec ? `${tec.nombre} ${tec.apellido}` : 'El técnico'

    // 5b/5c. Cierre de residuos: libera calendario, cancela visitas, anula
    // inspecciones y cierra presupuestos en vuelo para que el nuevo técnico
    // arranque limpio en la reasignación.
    await cerrarResiduosDeIncidente(idIncidente)

    // 6. Notificar al admin
    try {
      const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
      await crearNotificacionAdmin({
        tipo: 'asignacion_cancelada',
        titulo: 'Técnico canceló el trabajo',
        mensaje: `${tecNombre} se dio de baja del incidente #${idIncidente}${motivo ? ` — Motivo: ${motivo}` : ''}. Requiere reasignación urgente.`,
        id_incidente: idIncidente,
      })
    } catch { /* no bloquear la operación principal */ }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al cancelar la asignación' }
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

    if (error) return { success: false, error: translateDbError(error) }

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

/**
 * Admin da de baja a un técnico de un incidente.
 * - Solo se permite si no hay conformidad subida aún.
 * - Marca la asignación como 'cancelada' y vuelve el incidente a 'pendiente'.
 * - Envía notificación al técnico y al cliente con el motivo.
 */
/**
 * El cliente cancela su propio incidente antes de que sea aceptado por un técnico.
 * Solo disponible cuando estado_actual es 'pendiente' o 'asignacion_solicitada'
 * y no hay asignaciones aceptadas/en curso/completadas.
 */
export async function cancelarIncidenteCliente(
  idIncidente: number,
  motivo: string,
): Promise<ActionResult> {
  try {
    const { requireClienteId } = await import('@/features/auth/auth.service')
    const idCliente = await requireClienteId()
    const adminClient = createAdminClient()

    // Verificar que el incidente pertenece al cliente
    const { data: inc } = await adminClient
      .from('incidentes')
      .select('id_incidente, estado_actual, id_cliente_reporta')
      .eq('id_incidente', idIncidente)
      .eq('id_cliente_reporta', idCliente)
      .maybeSingle()

    if (!inc) return { success: false, error: 'No se encontró el incidente' }

    if (!['pendiente', 'asignacion_solicitada'].includes(inc.estado_actual)) {
      return { success: false, error: 'Solo podés cancelar incidentes que todavía no tienen técnico asignado' }
    }

    // Bloquear si hay asignación ya aceptada
    const { data: asigAceptada } = await adminClient
      .from('asignaciones_tecnico')
      .select('id_asignacion')
      .eq('id_incidente', idIncidente)
      .in('estado_asignacion', ['aceptada', 'en_curso', 'completada'])
      .limit(1)
      .maybeSingle()

    if (asigAceptada) {
      return { success: false, error: 'No podés cancelar el incidente porque ya tiene un técnico asignado' }
    }

    // Cancelar asignación pendiente si existe
    await adminClient
      .from('asignaciones_tecnico')
      .update({ estado_asignacion: 'cancelada', fecha_rechazo: new Date().toISOString(), cancelada_por_admin: false })
      .eq('id_incidente', idIncidente)
      .eq('estado_asignacion', 'pendiente')

    // Marcar incidente como cancelado por el cliente
    const { error } = await adminClient
      .from('incidentes')
      .update({ estado_actual: 'cancelado', cancelado_por_cliente: true })
      .eq('id_incidente', idIncidente)

    if (error) return { success: false, error: error.message }

    // Cierre de residuos (defensivo: cubre visita propuesta durante asignacion_solicitada)
    await cerrarResiduosDeIncidente(idIncidente)

    // Notificar al admin
    try {
      const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
      await crearNotificacionAdmin({
        tipo: 'baja_admin',
        titulo: 'Incidente cancelado por el cliente',
        mensaje: `El cliente canceló el incidente #${idIncidente}. Motivo: ${motivo}`,
        id_incidente: idIncidente,
      })
    } catch { /* no bloquear */ }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al cancelar el incidente' }
  }
}

/**
 * Cancela un incidente definitivamente (estado 'cancelado').
 * Solo permitido antes de que el cliente apruebe el presupuesto.
 * El registro queda en DB para historial pero se excluye de estadísticas.
 */
export async function cancelarIncidente(
  idIncidente: number,
  motivo: string,
): Promise<ActionResult> {
  try {
    const adminClient = createAdminClient()

    // 1. Bloquear si el cliente ya aprobó el presupuesto
    const { data: presupAprobado } = await adminClient
      .from('presupuestos')
      .select('id_presupuesto')
      .eq('id_incidente', idIncidente)
      .eq('estado_presupuesto', 'aprobado')
      .limit(1)
      .maybeSingle()

    if (presupAprobado) {
      return { success: false, error: 'No se puede cancelar un incidente con presupuesto aprobado por el cliente' }
    }

    // 2. Obtener datos del incidente y asignación activa (si existe)
    const { data: incData } = await adminClient
      .from('incidentes')
      .select('id_cliente_reporta')
      .eq('id_incidente', idIncidente)
      .single()

    const idCliente = incData?.id_cliente_reporta ?? null

    const { data: asigData } = await adminClient
      .from('asignaciones_tecnico')
      .select('id_asignacion, id_tecnico')
      .eq('id_incidente', idIncidente)
      .in('estado_asignacion', ['pendiente', 'aceptada', 'en_curso', 'completada'])
      .order('fecha_asignacion', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 3. Marcar asignación activa como cancelada (si existe)
    if (asigData) {
      await adminClient
        .from('asignaciones_tecnico')
        .update({
          estado_asignacion: 'cancelada',
          fecha_rechazo: new Date().toISOString(),
          cancelada_por_admin: true,
        })
        .eq('id_asignacion', asigData.id_asignacion)
    }

    // 4. Marcar incidente como cancelado
    const { error: errInc } = await adminClient
      .from('incidentes')
      .update({ estado_actual: 'cancelado' })
      .eq('id_incidente', idIncidente)

    if (errInc) return { success: false, error: errInc.message }

    // 4b. Cierre de residuos: libera calendario, cancela visitas, anula
    // inspecciones y cierra presupuestos en vuelo (evita el "incidente zombie")
    await cerrarResiduosDeIncidente(idIncidente)

    // 5. Notificaciones
    try {
      const { crearNotificacion, crearNotificacionCliente } = await import('@/features/notificaciones/notificaciones-inapp.service')

      if (asigData?.id_tecnico) {
        await crearNotificacion({
          id_tecnico: asigData.id_tecnico,
          tipo: 'baja_admin',
          titulo: 'Incidente cancelado por administración',
          mensaje: `El incidente #${idIncidente} fue cancelado. Motivo: ${motivo}`,
          id_incidente: idIncidente,
        })
      }

      if (idCliente) {
        await crearNotificacionCliente({
          id_cliente: idCliente,
          tipo: 'baja_admin',
          titulo: 'Incidente cancelado',
          mensaje: `Tu incidente #${idIncidente} fue cancelado por la administración. Motivo: ${motivo}`,
          id_incidente: idIncidente,
        })
      }
    } catch { /* no bloquear la operación principal */ }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al cancelar el incidente' }
  }
}

export async function darDeBajaIncidente(
  idIncidente: number,
  motivo: string,
): Promise<ActionResult> {
  try {
    const adminClient = createAdminClient()

    // 1. Verificar que no haya conformidad con foto subida
    const { data: conformidades } = await adminClient
      .from('conformidades')
      .select('id_conformidad')
      .eq('id_incidente', idIncidente)
      .not('url_documento', 'is', null)

    if (conformidades && conformidades.length > 0) {
      return { success: false, error: 'No se puede dar de baja después de que el técnico subió la conformidad' }
    }

    // 2. Obtener la asignación activa
    const { data: asigData, error: errQuery } = await adminClient
      .from('asignaciones_tecnico')
      .select('id_asignacion, id_tecnico, tecnicos(nombre, apellido)')
      .eq('id_incidente', idIncidente)
      .in('estado_asignacion', ['pendiente', 'aceptada', 'en_curso', 'completada'])
      .order('fecha_asignacion', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (errQuery) return { success: false, error: errQuery.message }
    if (!asigData) return { success: false, error: 'No se encontró asignación activa para este incidente' }

    const tec = asigData.tecnicos as any
    const tecNombre = tec ? `${tec.nombre} ${tec.apellido}` : 'El técnico'
    const idTecnico = asigData.id_tecnico

    // 3. Obtener id_cliente del incidente
    const { data: incData } = await adminClient
      .from('incidentes')
      .select('id_cliente_reporta')
      .eq('id_incidente', idIncidente)
      .single()

    const idCliente = incData?.id_cliente_reporta ?? null

    // 4. Marcar asignación como cancelada (por admin)
    const { error: errAsig } = await adminClient
      .from('asignaciones_tecnico')
      .update({
        estado_asignacion: 'cancelada',
        fecha_rechazo: new Date().toISOString(),
        cancelada_por_admin: true,
      })
      .eq('id_asignacion', asigData.id_asignacion)

    if (errAsig) return { success: false, error: errAsig.message }

    // 5. Resetear incidente a pendiente
    const { error: errInc } = await adminClient
      .from('incidentes')
      .update({ estado_actual: 'pendiente' })
      .eq('id_incidente', idIncidente)

    if (errInc) return { success: false, error: errInc.message }

    // 5b. Cierre de residuos: el nuevo técnico arranca limpio (sin heredar
    // presupuesto/inspección del anterior) y se libera el calendario/visitas
    await cerrarResiduosDeIncidente(idIncidente)

    // 6. Notificaciones al técnico y al cliente
    try {
      const { crearNotificacion, crearNotificacionCliente } = await import('@/features/notificaciones/notificaciones-inapp.service')

      await crearNotificacion({
        id_tecnico: idTecnico,
        tipo: 'baja_admin',
        titulo: 'Fuiste desafectado de un incidente',
        mensaje: `La administración te desafectó del incidente #${idIncidente}. Motivo: ${motivo}`,
        id_incidente: idIncidente,
      })

      if (idCliente) {
        await crearNotificacionCliente({
          id_cliente: idCliente,
          tipo: 'baja_admin',
          titulo: 'Cambio en tu incidente',
          mensaje: `La administración realizó un cambio en tu incidente #${idIncidente}: ${motivo}. Tu incidente está nuevamente pendiente de asignación.`,
          id_incidente: idIncidente,
        })
      }
    } catch { /* no bloquear la operación principal */ }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al dar de baja el incidente' }
  }
}
