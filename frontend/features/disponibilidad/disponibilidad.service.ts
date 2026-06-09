'use server'

import { createAdminClient } from '@/shared/lib/supabase/admin'
import type { ActionResult } from '@/shared/types'
import type { FranjaDisponibilidad, FranjaAgenda } from './disponibilidad.types'

// ── Franjas de disponibilidad (cliente) ──────────────────────────────────────

export async function guardarFranjasDisponibilidad(
  idIncidente: number,
  franjas: Omit<FranjaDisponibilidad, 'id_franja' | 'id_incidente'>[],
  fase: 'inspeccion' | 'reparacion' = 'inspeccion',
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()
    // Reemplazar solo las franjas de la fase indicada
    await supabase.from('franjas_disponibilidad')
      .delete()
      .eq('id_incidente', idIncidente)
      .eq('fase', fase)
    if (franjas.length === 0) return { success: true, data: undefined }
    const { error } = await supabase.from('franjas_disponibilidad').insert(
      franjas.map(f => ({ id_incidente: idIncidente, fase, ...f }))
    )
    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al guardar disponibilidad' }
  }
}

export async function getFranjasDisponibilidad(
  idIncidente: number,
  fase: 'inspeccion' | 'reparacion' = 'inspeccion',
): Promise<FranjaDisponibilidad[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('franjas_disponibilidad')
    .select('*')
    .eq('id_incidente', idIncidente)
    .eq('fase', fase)
    .order('fecha')
    .order('hora_inicio')
  if (error) return []
  return (data ?? []) as FranjaDisponibilidad[]
}

export async function getFranjasParaIncidentes(
  ids: number[],
): Promise<Record<number, FranjaDisponibilidad[]>> {
  if (ids.length === 0) return {}
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('franjas_disponibilidad')
    .select('*')
    .in('id_incidente', ids)
    .order('fecha')
    .order('hora_inicio')
  const resultado: Record<number, FranjaDisponibilidad[]> = {}
  for (const f of (data ?? []) as FranjaDisponibilidad[]) {
    if (!resultado[f.id_incidente]) resultado[f.id_incidente] = []
    resultado[f.id_incidente].push(f)
  }
  return resultado
}

// ── Compromisos de visita (técnico) ─────────────────────────────────────────
// Los datos se guardan directamente en asignaciones_tecnico:
//   fecha_visita_programada TIMESTAMPTZ  →  fecha + hora_inicio
//   hora_fin_programada     TIME         →  hora_fin_estimada


export async function guardarCompromisoTecnico(
  idAsignacion: number,
  idIncidente: number,
  _idTecnico: number,
  fechaVisita: string,
  horaInicio: string,
  horaFin: string,
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('asignaciones_tecnico')
      .update({
        fecha_visita_programada: `${fechaVisita}T${horaInicio}:00`,
        hora_fin_programada: horaFin,
      })
      .eq('id_asignacion', idAsignacion)

    if (error) return { success: false, error: error.message }

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

export async function getCompromisoDeAsignacion(idAsignacion: number): Promise<import('./disponibilidad.types').CompromisoTecnico | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('asignaciones_tecnico')
    .select('id_asignacion, id_incidente, id_tecnico, fecha_visita_programada, hora_fin_programada')
    .eq('id_asignacion', idAsignacion)
    .not('fecha_visita_programada', 'is', null)
    .not('hora_fin_programada', 'is', null)
    .maybeSingle()
  if (!data) return null
  const dt = data.fecha_visita_programada as string
  return {
    id_asignacion:     data.id_asignacion,
    id_incidente:      data.id_incidente,
    id_tecnico:        data.id_tecnico,
    fecha_visita:      dt.slice(0, 10),
    hora_inicio:       dt.slice(11, 16),
    hora_fin_estimada: (data.hora_fin_programada as string).slice(0, 5),
  }
}

// Agenda del técnico — muestra las visitas propuestas/confirmadas por el técnico
// (no las franjas de disponibilidad del cliente, que solo sirven de referencia).
export async function getFranjasAgendaTecnico(idTecnico: number): Promise<FranjaAgenda[]> {
  if (!idTecnico) return []
  const supabase = createAdminClient()

  const { data: asignaciones } = await supabase
    .from('asignaciones_tecnico')
    .select('id_asignacion, id_incidente, estado_asignacion')
    .eq('id_tecnico', idTecnico)
    .in('estado_asignacion', ['pendiente', 'aceptada', 'en_curso'])

  if (!asignaciones || asignaciones.length === 0) return []

  const idIncidentes = asignaciones.map(a => a.id_incidente)
  const asigPorIncidente: Record<number, { id: number; estado: string }> = Object.fromEntries(
    asignaciones.map(a => [a.id_incidente, { id: a.id_asignacion, estado: a.estado_asignacion }])
  )

  // Traer visitas propuestas o confirmadas del técnico para esos incidentes
  const { data: visitas } = await supabase
    .from('visitas')
    .select(`
      id_visita, id_incidente, fecha_visita, hora_inicio, hora_fin_estimada,
      incidentes(descripcion_problema, categoria, inmuebles(calle, altura, barrio, localidad))
    `)
    .eq('id_tecnico', idTecnico)
    .in('id_incidente', idIncidentes)
    .in('estado', ['propuesta', 'confirmada'])
    .order('fecha_visita')
    .order('hora_inicio')

  const visitasResult: FranjaAgenda[] = (visitas ?? []).map((v: any) => ({
    id_franja:        v.id_visita,
    id_incidente:     v.id_incidente,
    id_asignacion:    asigPorIncidente[v.id_incidente]?.id,
    estadoAsignacion: asigPorIncidente[v.id_incidente]?.estado as FranjaAgenda['estadoAsignacion'],
    fecha:            v.fecha_visita as string,
    hora_inicio:      (v.hora_inicio as string).slice(0, 5),
    hora_fin:         v.hora_fin_estimada ? (v.hora_fin_estimada as string).slice(0, 5) : '',
    tipo:             'visita' as const,
    incidentes:       v.incidentes ?? null,
  }))

  // Para incidentes sin visita agendada, mostrar la disponibilidad del cliente
  // así el admin/técnico sabe cuándo puede ir aunque no haya visita propuesta aún
  const conVisita = new Set(visitasResult.map(v => v.id_incidente))
  const sinVisita = idIncidentes.filter(id => !conVisita.has(id))

  if (sinVisita.length > 0) {
    const { data: franjas } = await supabase
      .from('franjas_disponibilidad')
      .select(`
        id_franja, id_incidente, fecha, hora_inicio, hora_fin,
        incidentes(descripcion_problema, categoria, inmuebles(calle, altura, barrio, localidad))
      `)
      .in('id_incidente', sinVisita)
      .order('fecha')
      .order('hora_inicio')

    const franjasResult: FranjaAgenda[] = (franjas ?? []).map((f: any) => ({
      id_franja:        f.id_franja,
      id_incidente:     f.id_incidente,
      id_asignacion:    asigPorIncidente[f.id_incidente]?.id,
      estadoAsignacion: asigPorIncidente[f.id_incidente]?.estado as FranjaAgenda['estadoAsignacion'],
      fecha:            f.fecha as string,
      hora_inicio:      (f.hora_inicio as string).slice(0, 5),
      hora_fin:         (f.hora_fin as string).slice(0, 5),
      tipo:             'disponibilidad' as const,
      incidentes:       f.incidentes ?? null,
    }))

    return [...visitasResult, ...franjasResult].sort((a, b) =>
      a.fecha === b.fecha ? a.hora_inicio.localeCompare(b.hora_inicio) : a.fecha.localeCompare(b.fecha)
    )
  }

  return visitasResult
}

export async function liberarCompromisoDeIncidente(idIncidente: number): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('asignaciones_tecnico')
    .update({ fecha_visita_programada: null, hora_fin_programada: null })
    .eq('id_incidente', idIncidente)
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

  // Visitas programadas activas (leen de asignaciones_tecnico)
  const { data: compromisos } = await supabase
    .from('asignaciones_tecnico')
    .select('id_tecnico, fecha_visita_programada, hora_fin_programada')
    .not('fecha_visita_programada', 'is', null)
    .not('hora_fin_programada', 'is', null)

  if (!compromisos) return {}

  const resultado: Record<number, boolean> = {}

  for (const comp of compromisos) {
    if (resultado[comp.id_tecnico]) continue
    const dt = comp.fecha_visita_programada as string
    const compFecha  = dt.slice(0, 10)
    const compInicio = dt.slice(11, 16)
    const compFin    = (comp.hora_fin_programada as string).slice(0, 5)
    for (const franja of franjas) {
      if (compFecha !== franja.fecha) continue
      // Hay superposición si NO se cumple: comp.fin <= franja.inicio || comp.inicio >= franja.fin
      const fInicio = franja.hora_inicio
      const fFin    = franja.hora_fin
      const hayConflicto = !(compFin <= fInicio || compInicio >= fFin)
      if (hayConflicto) {
        resultado[comp.id_tecnico] = true
        break
      }
    }
  }

  return resultado
}
