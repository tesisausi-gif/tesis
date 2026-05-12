'use server'

import { createAdminClient } from '@/shared/lib/supabase/admin'
import type { ActionResult } from '@/shared/types'
import type { FranjaDisponibilidad, CompromisoTecnico } from './disponibilidad.types'

// ── Franjas de disponibilidad (cliente) ──────────────────────────────────────

export async function guardarFranjasDisponibilidad(
  idIncidente: number,
  franjas: Omit<FranjaDisponibilidad, 'id_franja' | 'id_incidente'>[],
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()
    // Reemplazar todas las franjas existentes del incidente
    await supabase.from('franjas_disponibilidad').delete().eq('id_incidente', idIncidente)
    if (franjas.length === 0) return { success: true, data: undefined }
    const { error } = await supabase.from('franjas_disponibilidad').insert(
      franjas.map(f => ({ id_incidente: idIncidente, ...f }))
    )
    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al guardar disponibilidad' }
  }
}

export async function getFranjasDisponibilidad(idIncidente: number): Promise<FranjaDisponibilidad[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('franjas_disponibilidad')
    .select('*')
    .eq('id_incidente', idIncidente)
    .order('fecha')
    .order('hora_inicio')
  if (error) return []
  return (data ?? []) as FranjaDisponibilidad[]
}

// ── Compromisos de visita (técnico) ─────────────────────────────────────────

export async function guardarCompromisoTecnico(
  idAsignacion: number,
  idIncidente: number,
  idTecnico: number,
  fechaVisita: string,
  horaInicio: string,
  horaFin: string,
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    // Cancelar compromiso anterior si existe
    await supabase
      .from('compromisos_tecnico')
      .update({ estado: 'cancelado' })
      .eq('id_asignacion', idAsignacion)
      .eq('estado', 'programado')

    const { error } = await supabase.from('compromisos_tecnico').insert({
      id_asignacion: idAsignacion,
      id_incidente: idIncidente,
      id_tecnico: idTecnico,
      fecha_visita: fechaVisita,
      hora_inicio: horaInicio,
      hora_fin_estimada: horaFin,
      estado: 'programado',
    })
    if (error) return { success: false, error: error.message }

    // Actualizar fecha_visita_programada en la asignacion
    await supabase
      .from('asignaciones_tecnico')
      .update({ fecha_visita_programada: `${fechaVisita}T${horaInicio}:00` })
      .eq('id_asignacion', idAsignacion)

    // Notificaciones
    try {
      const { data: asig } = await supabase
        .from('asignaciones_tecnico')
        .select('tecnicos(nombre, apellido), incidentes(id_cliente_reporta, clientes:id_cliente_reporta(id_cliente))')
        .eq('id_asignacion', idAsignacion)
        .single()
      const tec = (asig?.tecnicos as any)
      const tecNombre = tec ? `${tec.nombre} ${tec.apellido}` : 'El técnico'
      const fechaLegible = new Date(fechaVisita + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

      const { crearNotificacionAdmin, crearNotificacionCliente } = await import('@/features/notificaciones/notificaciones-inapp.service')
      await crearNotificacionAdmin({
        tipo: 'visita_programada',
        titulo: 'Visita programada',
        mensaje: `${tecNombre} programó su visita al incidente #${idIncidente} para el ${fechaLegible} de ${horaInicio} a ${horaFin}.`,
        id_incidente: idIncidente,
      })

      const idCliente = ((asig?.incidentes as any)?.clientes as any)?.id_cliente
      if (idCliente) {
        await crearNotificacionCliente({
          id_cliente: idCliente,
          tipo: 'visita_programada',
          titulo: 'Tu técnico programó la visita',
          mensaje: `${tecNombre} irá a tu propiedad el ${fechaLegible} entre las ${horaInicio} y las ${horaFin}. Asegurate de estar disponible.`,
          id_incidente: idIncidente,
        })
      }
    } catch { /* no bloquear */ }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al guardar compromiso' }
  }
}

export async function getCompromisoDeAsignacion(idAsignacion: number): Promise<CompromisoTecnico | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('compromisos_tecnico')
    .select('*')
    .eq('id_asignacion', idAsignacion)
    .eq('estado', 'programado')
    .maybeSingle()
  return data as CompromisoTecnico | null
}

export async function liberarCompromisoDeIncidente(idIncidente: number): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('compromisos_tecnico')
    .update({ estado: 'completado' })
    .eq('id_incidente', idIncidente)
    .eq('estado', 'programado')
}

// ── Detección de conflictos ──────────────────────────────────────────────────

/**
 * Dado un incidente y sus franjas de disponibilidad, devuelve qué técnicos
 * tienen un compromiso programado que se superpone con alguna de esas franjas.
 * Returns: Record<idTecnico, boolean>
 */
export async function getConflictosTecnicos(
  idIncidente: number,
): Promise<Record<number, boolean>> {
  const supabase = createAdminClient()

  // Franjas del incidente
  const { data: franjas } = await supabase
    .from('franjas_disponibilidad')
    .select('fecha, hora_inicio, hora_fin')
    .eq('id_incidente', idIncidente)

  if (!franjas || franjas.length === 0) return {}

  // Todos los compromisos activos
  const { data: compromisos } = await supabase
    .from('compromisos_tecnico')
    .select('id_tecnico, fecha_visita, hora_inicio, hora_fin_estimada')
    .eq('estado', 'programado')

  if (!compromisos) return {}

  const resultado: Record<number, boolean> = {}

  for (const comp of compromisos) {
    if (resultado[comp.id_tecnico]) continue // ya marcado como conflicto
    for (const franja of franjas) {
      if (comp.fecha_visita !== franja.fecha) continue
      // Hay superposición de horario si NO se cumple: comp.fin <= franja.inicio || comp.inicio >= franja.fin
      const compInicio = comp.hora_inicio
      const compFin    = comp.hora_fin_estimada
      const fInicio    = franja.hora_inicio
      const fFin       = franja.hora_fin
      const hayConflicto = !(compFin <= fInicio || compInicio >= fFin)
      if (hayConflicto) {
        resultado[comp.id_tecnico] = true
        break
      }
    }
  }

  return resultado
}
