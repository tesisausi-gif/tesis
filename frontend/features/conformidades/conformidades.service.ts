'use server'

/**
 * Servicio de Conformidades
 * Nueva columna url_documento: el técnico sube una foto de la conformidad física firmada.
 * El admin revisa la foto y aprueba o rechaza.
 * Columnas según esquema actual de producción:
 *   - tipo_conformidad (CHECK: 'final' | 'intermedia')
 *   - esta_firmada INTEGER (0/1)
 *   - fecha_conformidad (no fecha_firma)
 */

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import type { ActionResult } from '@/shared/types'
import type { Conformidad, CreateConformidadDTO } from './conformidades.types'

/**
 * Obtener la conformidad de un incidente (si existe)
 */
export async function getConformidadDelIncidente(idIncidente: number): Promise<Conformidad | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conformidades')
    .select('*')
    .eq('id_incidente', idIncidente)
    .maybeSingle()

  if (error) throw error
  return data as Conformidad | null
}

/**
 * Obtener conformidades pendientes de revisión (con foto subida, no aprobadas)
 * Para la página de administración
 */
export async function getConformidadesPendientes() {
  const { requireAdminOrGestorId } = await import('@/features/auth/auth.service')
  await requireAdminOrGestorId()
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('conformidades')
    .select(`
      id_conformidad, id_incidente, id_cliente, tipo_conformidad,
      esta_firmada, url_documento, fecha_creacion, observaciones,
      incidentes (
        id_incidente, descripcion_problema, categoria,
        clientes:id_cliente_reporta (nombre, apellido),
        asignaciones_tecnico (
          id_asignacion, estado_asignacion, id_tecnico,
          tecnicos (id_tecnico, nombre, apellido, correo_electronico)
        )
      )
    `)
    .not('url_documento', 'is', null)
    .eq('esta_firmada', 0)
    .eq('esta_rechazada', false)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtener conformidades por lista de incidentes (para el técnico)
 */
export async function getConformidadesPorIncidentes(idIncidentes: number[]) {
  if (idIncidentes.length === 0) return []
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('conformidades')
    .select('id_conformidad, id_incidente, esta_firmada, url_documento, fecha_creacion')
    .in('id_incidente', idIncidentes)

  if (error) throw error
  return data || []
}

/**
 * Crear una conformidad (admin)
 */
export async function crearConformidad(dto: CreateConformidadDTO): Promise<ActionResult> {
  try {
    const supabase = await createAdminClient()

    const { data: existing } = await supabase
      .from('conformidades')
      .select('id_conformidad')
      .eq('id_incidente', dto.id_incidente)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Ya existe una conformidad para este incidente' }
    }

    const { data: conformidad, error } = await supabase
      .from('conformidades')
      .insert({
        id_incidente: dto.id_incidente,
        id_cliente: dto.id_cliente,
        tipo_conformidad: dto.tipo_conformidad ?? 'intermedia',
        esta_firmada: 0,
      })
      .select('id_conformidad')
      .single()

    if (error) return { success: false, error: error.message }

    // Notificar al cliente que tiene una conformidad para firmar (fire-and-forget)
    const { notificarConformidadParaFirmar } = await import('@/features/notificaciones/notificaciones.service')
    notificarConformidadParaFirmar(conformidad.id_conformidad, dto.id_cliente, dto.id_incidente).catch(console.error)

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al crear conformidad' }
  }
}

/**
 * Firmar una conformidad (cliente)
 */
export async function firmarConformidad(idConformidad: number, observaciones?: string | null): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('conformidades')
      .update({
        esta_firmada: 1,
        fecha_conformidad: new Date().toISOString(),
        observaciones: observaciones ?? null,
      })
      .eq('id_conformidad', idConformidad)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al firmar conformidad' }
  }
}

/**
 * Técnico sube foto de la conformidad física firmada por el cliente.
 * Crea el registro de conformidad con url_documento = fotoUrl.
 * El admin luego revisa la foto y aprueba o rechaza.
 */
export async function crearConformidadPorTecnico(idIncidente: number, fotoUrl: string): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    // Verificar que no exista ya una conformidad pendiente (no rechazada, no aprobada)
    const { data: existing } = await supabase
      .from('conformidades')
      .select('id_conformidad, esta_firmada, esta_rechazada')
      .eq('id_incidente', idIncidente)
      .eq('esta_rechazada', false)
      .maybeSingle()

    if (existing) {
      if (existing.esta_firmada === 1 || existing.esta_firmada === true) {
        return { success: false, error: 'La conformidad ya fue aprobada' }
      }
      return { success: false, error: 'Ya existe una conformidad pendiente de revisión para este incidente' }
    }

    // Obtener id_cliente del incidente
    const { data: incidente, error: errInc } = await supabase
      .from('incidentes')
      .select('id_cliente_reporta')
      .eq('id_incidente', idIncidente)
      .single()

    if (errInc || !incidente) return { success: false, error: 'No se pudo obtener el incidente' }

    const { error } = await supabase
      .from('conformidades')
      .insert({
        id_incidente: idIncidente,
        id_cliente: incidente.id_cliente_reporta,
        tipo_conformidad: 'final',
        esta_firmada: 0,
        url_documento: fotoUrl,
        fecha_conformidad: new Date().toISOString(),
      })

    if (error) return { success: false, error: error.message }

    // Notificar al admin que hay una nueva conformidad para revisar
    const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
    crearNotificacionAdmin({
      tipo: 'nueva_conformidad',
      titulo: 'Nueva conformidad para revisar',
      mensaje: `El técnico subió una foto de conformidad para el incidente #${idIncidente}. Revisala en el módulo de Conformidades.`,
      id_incidente: idIncidente,
    }).catch(console.error)

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al crear conformidad' }
  }
}

/**
 * Admin aprueba la conformidad:
 * - Marca esta_firmada = 1
 * - Crea calificación para el técnico
 * - Marca el incidente como resuelto
 * - Notifica al cliente
 */
export async function aprobarConformidad(
  idConformidad: number,
  puntuacion: number,
  comentarios?: string | null,
  resolvioPrblema?: boolean,
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    // Obtener conformidad con datos relacionados
    const { data: conf, error: errConf } = await supabase
      .from('conformidades')
      .select(`
        id_conformidad, id_incidente, id_cliente,
        incidentes (
          id_incidente,
          asignaciones_tecnico (id_tecnico, estado_asignacion)
        )
      `)
      .eq('id_conformidad', idConformidad)
      .single()

    if (errConf || !conf) return { success: false, error: 'Conformidad no encontrada' }

    const inc = conf.incidentes as any
    const idIncidente = conf.id_incidente
    const asigs = Array.isArray(inc?.asignaciones_tecnico) ? inc.asignaciones_tecnico : []
    const asig = asigs.find((a: any) => a.estado_asignacion === 'completada') || asigs[0]
    const idTecnico = asig?.id_tecnico

    // 1. Marcar conformidad como aprobada
    const { error: errUpd } = await supabase
      .from('conformidades')
      .update({ esta_firmada: 1, fecha_conformidad: new Date().toISOString() })
      .eq('id_conformidad', idConformidad)

    if (errUpd) return { success: false, error: errUpd.message }

    // 2. Crear calificación si tenemos técnico
    if (idTecnico) {
      await supabase
        .from('calificaciones')
        .insert({
          id_incidente: idIncidente,
          id_tecnico: idTecnico,
          puntuacion,
          comentarios: comentarios ?? null,
          resolvio_problema: resolvioPrblema ? 1 : 0,
          fecha_calificacion: new Date().toISOString(),
        })
    }

    // 3. Marcar incidente como resuelto con fecha de cierre
    await supabase
      .from('incidentes')
      .update({ estado_actual: 'resuelto', fue_resuelto: 1, fecha_cierre: new Date().toISOString() })
      .eq('id_incidente', idIncidente)

    // 4. Notificar al cliente: email (fire-and-forget)
    const { notificarIncidenteResuelto } = await import('@/features/notificaciones/notificaciones.service')
    notificarIncidenteResuelto(idIncidente).catch(console.error)

    // 5. Notificar al cliente: in-app (fire-and-forget)
    if (conf.id_cliente) {
      const { crearNotificacionCliente } = await import('@/features/notificaciones/notificaciones-inapp.service')
      crearNotificacionCliente({
        id_cliente: conf.id_cliente,
        tipo: 'incidente_resuelto',
        titulo: '¡Tu incidente fue resuelto!',
        mensaje: `El incidente #${idIncidente} fue marcado como resuelto por la administración. Podés calificar al técnico desde el módulo de Incidentes.`,
        id_incidente: idIncidente,
      }).catch(console.error)
    }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al aprobar conformidad' }
  }
}

/**
 * Admin rechaza la conformidad:
 * - Elimina el registro para que el técnico pueda volver a subir la foto
 * - Notifica al técnico
 */
export async function rechazarConformidad(idConformidad: number): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    // Obtener conformidad con datos del técnico asignado
    const { data: conf, error: errConf } = await supabase
      .from('conformidades')
      .select(`
        id_conformidad, id_incidente,
        incidentes (
          asignaciones_tecnico (id_tecnico, estado_asignacion)
        )
      `)
      .eq('id_conformidad', idConformidad)
      .single()

    if (errConf || !conf) return { success: false, error: 'Conformidad no encontrada' }

    // Obtener id_tecnico del asignado
    const inc = conf.incidentes as any
    const asigs = Array.isArray(inc?.asignaciones_tecnico) ? inc.asignaciones_tecnico : []
    const asig = asigs.find((a: any) => a.estado_asignacion === 'completada') || asigs[0]
    const idTecnico = asig?.id_tecnico

    // Notificar al técnico: email (fire-and-forget)
    const { notificarTecnicoConformidadRechazada } = await import('@/features/notificaciones/notificaciones.service')
    notificarTecnicoConformidadRechazada(conf.id_incidente).catch(console.error)

    // Notificar al técnico: in-app (fire-and-forget)
    if (idTecnico) {
      const { crearNotificacion } = await import('@/features/notificaciones/notificaciones-inapp.service')
      crearNotificacion({
        id_tecnico: idTecnico,
        tipo: 'conformidad_rechazada',
        titulo: 'Conformidad rechazada',
        mensaje: `La foto de conformidad del incidente #${conf.id_incidente} fue rechazada. Por favor subí una nueva foto clara de la conformidad firmada por el cliente.`,
        id_incidente: conf.id_incidente,
      }).catch(console.error)
    }

    // Marcar como rechazada (sin eliminar, para conservar historial en timeline)
    const { error } = await supabase
      .from('conformidades')
      .update({
        esta_rechazada: true,
        fecha_rechazo: new Date().toISOString(),
      })
      .eq('id_conformidad', idConformidad)

    if (error) return { success: false, error: error.message }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al rechazar conformidad' }
  }
}
