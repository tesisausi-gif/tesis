'use server'

import { translateDbError } from '@/shared/lib/db-errors'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import type { ActionResult } from '@/shared/types'
import type { Visita, VisitaResumen, TipoVisita } from './visitas.types'

// ── Lectura ──────────────────────────────────────────────────────────────────

export async function getVisitasDeIncidente(idIncidente: number): Promise<Visita[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('visitas')
    .select('*')
    .eq('id_incidente', idIncidente)
    .order('fecha_creacion', { ascending: true })
  return (data ?? []) as Visita[]
}

export async function getVisitaActivaDeIncidente(idIncidente: number): Promise<VisitaResumen | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('visitas')
    .select('id_visita, id_incidente, tipo, fecha_visita, hora_inicio, hora_fin_estimada, estado, fuera_de_disponibilidad, notas_tecnico')
    .eq('id_incidente', idIncidente)
    .in('estado', ['propuesta', 'confirmada'])
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as VisitaResumen | null
}

export async function getVisitaActivaPorTipo(
  idIncidente: number,
  tipo: TipoVisita,
): Promise<VisitaResumen | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('visitas')
    .select('id_visita, id_incidente, tipo, fecha_visita, hora_inicio, hora_fin_estimada, estado, fuera_de_disponibilidad, notas_tecnico')
    .eq('id_incidente', idIncidente)
    .eq('tipo', tipo)
    .in('estado', ['propuesta', 'confirmada'])
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as VisitaResumen | null
}

// Bulk para alimentar listas de incidentes
export async function getVisitasActivasPorIncidentes(
  ids: number[],
): Promise<Record<number, VisitaResumen | null>> {
  if (!ids.length) return {}
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('visitas')
    .select('id_visita, id_incidente, tipo, fecha_visita, hora_inicio, hora_fin_estimada, estado, fuera_de_disponibilidad, notas_tecnico')
    .in('id_incidente', ids)
    .in('estado', ['propuesta', 'confirmada'])
    .order('fecha_creacion', { ascending: false })

  const result: Record<number, VisitaResumen | null> = {}
  for (const id of ids) result[id] = null
  // Keep only the most-recent active visita per incidente
  for (const v of (data ?? []) as VisitaResumen[]) {
    if (!result[v.id_incidente]) result[v.id_incidente] = v
  }
  return result
}

// ── Escritura ─────────────────────────────────────────────────────────────────

/**
 * El técnico propone una visita. Detecta automáticamente si el horario
 * cae fuera de las franjas de disponibilidad declaradas por el cliente.
 */
export async function proponerVisita(params: {
  idIncidente: number
  idTecnico:   number
  tipo:        TipoVisita
  fecha:       string   // 'YYYY-MM-DD'
  horaInicio:  string   // 'HH:MM'
  horaFin:     string   // 'HH:MM'
  notas?:      string
}): Promise<ActionResult<{ id_visita: number; fuera_de_disponibilidad: boolean }>> {
  try {
    const supabase = createAdminClient()

    // Verificar si cae dentro de alguna franja del cliente
    const { data: franjas } = await supabase
      .from('franjas_disponibilidad')
      .select('fecha, hora_inicio, hora_fin')
      .eq('id_incidente', params.idIncidente)

    const fueraDeDisponibilidad = !franjas?.some(f => {
      if (f.fecha !== params.fecha) return false
      const hI = params.horaInicio
      const hF = params.horaFin
      return hI >= (f.hora_inicio as string).slice(0, 5) &&
             hF <= (f.hora_fin   as string).slice(0, 5)
    })

    const { data: visita, error } = await supabase
      .from('visitas')
      .insert({
        id_incidente:            params.idIncidente,
        id_tecnico:              params.idTecnico,
        tipo:                    params.tipo,
        fecha_visita:            params.fecha,
        hora_inicio:             params.horaInicio,
        hora_fin_estimada:       params.horaFin,
        estado:                  'propuesta',
        fuera_de_disponibilidad: fueraDeDisponibilidad,
        notas_tecnico:           params.notas ?? null,
      })
      .select('id_visita')
      .single()

    if (error) return { success: false, error: translateDbError(error) }

    // Notificar al cliente
    try {
      const { data: inc } = await supabase
        .from('incidentes')
        .select('id_cliente_reporta, clientes:id_cliente_reporta(id_cliente)')
        .eq('id_incidente', params.idIncidente)
        .single()

      const { data: tec } = await supabase
        .from('tecnicos')
        .select('nombre, apellido')
        .eq('id_tecnico', params.idTecnico)
        .single()

      const tecNombre = tec ? `${(tec as any).nombre} ${(tec as any).apellido}` : 'El técnico'
      const fechaLeg  = new Date(params.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
      const advertencia = fueraDeDisponibilidad
        ? ' Este horario está fuera de tu disponibilidad declarada — podés rechazarlo.'
        : ''

      const idCliente = ((inc?.clientes as any))?.id_cliente
      if (idCliente) {
        const { crearNotificacionCliente } = await import('@/features/notificaciones/notificaciones-inapp.service')
        await crearNotificacionCliente({
          id_cliente: idCliente,
          tipo: 'visita_propuesta',
          titulo: fueraDeDisponibilidad ? 'Visita propuesta — fuera de tu horario' : 'Tu técnico propuso una visita',
          mensaje: `${tecNombre} propone visitarte el ${fechaLeg} de ${params.horaInicio} a ${params.horaFin}.${advertencia}`,
          id_incidente: params.idIncidente,
        })
      }
    } catch { /* no bloquear */ }

    return { success: true, data: { id_visita: visita.id_visita, fuera_de_disponibilidad: fueraDeDisponibilidad } }
  } catch {
    return { success: false, error: 'Error al proponer visita' }
  }
}

/**
 * El cliente confirma la visita propuesta.
 * Actualiza también asignaciones_tecnico.fecha_visita_programada para
 * mantener compatibilidad con el código existente.
 */
export async function confirmarVisita(idVisita: number): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    const { data: visita, error } = await supabase
      .from('visitas')
      .update({ estado: 'confirmada' })
      .eq('id_visita', idVisita)
      .eq('estado', 'propuesta')
      .select('id_incidente, id_tecnico, fecha_visita, hora_inicio, hora_fin_estimada')
      .single()

    if (error || !visita) return { success: false, error: error?.message ?? 'Visita no encontrada' }

    // Sync a asignaciones_tecnico para compatibilidad
    await supabase
      .from('asignaciones_tecnico')
      .update({
        fecha_visita_programada: `${visita.fecha_visita}T${visita.hora_inicio}:00`,
        hora_fin_programada:     visita.hora_fin_estimada ?? null,
      })
      .eq('id_incidente', visita.id_incidente)
      .in('estado_asignacion', ['aceptada', 'en_curso'])

    // Notificar al técnico
    try {
      const { data: tec } = await supabase
        .from('asignaciones_tecnico')
        .select('tecnicos(nombre, apellido)')
        .eq('id_incidente', visita.id_incidente)
        .in('estado_asignacion', ['aceptada', 'en_curso'])
        .limit(1)
        .maybeSingle()

      const tecNombre = (tec as any)?.tecnicos?.nombre ?? 'Técnico'
      const fechaLeg  = new Date(visita.fecha_visita + 'T00:00:00').toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long',
      })

      const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
      await crearNotificacionAdmin({
        tipo: 'visita_confirmada',
        titulo: 'Visita confirmada por el cliente',
        mensaje: `El cliente confirmó la visita del incidente #${visita.id_incidente} para el ${fechaLeg}.`,
        id_incidente: visita.id_incidente,
      })
      void tecNombre // usado implícitamente en logs futuros
    } catch { /* no bloquear */ }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al confirmar visita' }
  }
}

/**
 * El cliente rechaza la visita propuesta (solo disponible cuando está
 * fuera de su disponibilidad declarada).
 * Cancela la asignación del técnico actual y notifica al admin para reasignar.
 */
export async function rechazarVisita(idVisita: number, motivo?: string): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    const { data: visita, error: errV } = await supabase
      .from('visitas')
      .update({ estado: 'rechazada', motivo_rechazo: motivo ?? null })
      .eq('id_visita', idVisita)
      .eq('estado', 'propuesta')
      .select('id_incidente, id_tecnico, fecha_visita, hora_inicio')
      .single()

    if (errV || !visita) return { success: false, error: errV?.message ?? 'Visita no encontrada' }

    // Cancelar la asignación del técnico
    await supabase
      .from('asignaciones_tecnico')
      .update({ estado_asignacion: 'cancelada' })
      .eq('id_incidente', visita.id_incidente)
      .eq('id_tecnico',   visita.id_tecnico)
      .in('estado_asignacion', ['aceptada', 'en_curso'])

    // Notificar al admin para reasignar
    try {
      const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
      await crearNotificacionAdmin({
        tipo: 'visita_rechazada',
        titulo: '⚠️ Visita rechazada — reasignar técnico',
        mensaje: `El cliente rechazó la propuesta de horario del incidente #${visita.id_incidente}. Se requiere reasignación de técnico.`,
        id_incidente: visita.id_incidente,
      })
    } catch { /* no bloquear */ }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al rechazar visita' }
  }
}

/**
 * El técnico marca una visita como completada.
 */
export async function completarVisita(idVisita: number): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('visitas')
      .update({ estado: 'completada' })
      .eq('id_visita', idVisita)
      .in('estado', ['propuesta', 'confirmada'])
    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al completar visita' }
  }
}
