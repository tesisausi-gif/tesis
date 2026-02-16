'use server'

/**
 * Servicio de Incidentes
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireClienteId } from '@/features/auth/auth.service'
import type { Incidente, IncidenteConCliente, IncidenteConDetalles } from './incidentes.types'
import type { ActionResult } from '@/shared/types'

// Select base para incidentes
const INCIDENTE_SELECT = `
  id_incidente,
  descripcion_problema,
  categoria,
  nivel_prioridad,
  estado_actual,
  fecha_registro,
  fecha_cierre,
  fue_resuelto,
  disponibilidad,
  id_propiedad,
  id_cliente_reporta,
  inmuebles (
    calle,
    altura,
    piso,
    dpto,
    barrio,
    localidad
  )
`

/**
 * Obtener todos los incidentes (admin)
 */
export async function getIncidentesForAdmin(): Promise<IncidenteConCliente[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('incidentes')
    .select(`
      ${INCIDENTE_SELECT},
      clientes:id_cliente_reporta (
        nombre,
        apellido,
        telefono
      )
    `)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data as unknown as IncidenteConCliente[]
}

/**
 * Obtener incidentes del cliente actual
 */
export async function getIncidentesByCurrentUser(): Promise<Incidente[]> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()

  const { data, error } = await supabase
    .from('incidentes')
    .select(INCIDENTE_SELECT)
    .eq('id_cliente_reporta', idCliente)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data as unknown as Incidente[]
}

/**
 * Obtener incidente por ID con todos los detalles
 */
export async function getIncidenteById(idIncidente: number): Promise<IncidenteConDetalles> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('incidentes')
    .select(`
      ${INCIDENTE_SELECT},
      clientes:id_cliente_reporta (
        nombre,
        apellido,
        telefono
      ),
      asignaciones_tecnico (
        id_asignacion,
        estado_asignacion,
        fecha_asignacion,
        tecnicos (
          nombre,
          apellido
        )
      )
    `)
    .eq('id_incidente', idIncidente)
    .single()

  if (error) throw error
  return data as unknown as IncidenteConDetalles
}

/**
 * Obtener incidente completo para el modal de detalle
 */
export async function getIncidenteCompleto(idIncidente: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('incidentes')
    .select(`
      *,
      inmuebles:id_propiedad (
        calle, altura, piso, dpto, barrio, localidad, provincia,
        tipos_inmuebles (nombre)
      ),
      clientes:id_cliente_reporta (
        nombre, apellido, correo_electronico, telefono
      )
    `)
    .eq('id_incidente', idIncidente)
    .single()

  if (error) throw error
  return data
}

/**
 * Obtener asignaciones de un incidente con datos del técnico
 */
export async function getAsignacionesDelIncidente(idIncidente: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select('*, tecnicos(nombre, apellido, especialidad)')
    .eq('id_incidente', idIncidente)
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtener datos de timeline (inspecciones, presupuestos, pagos) de un incidente
 */
export async function getTimelineData(idIncidente: number) {
  const supabase = await createClient()

  const [inspecciones, presupuestos, pagos] = await Promise.all([
    supabase
      .from('inspecciones')
      .select('*, tecnicos(nombre, apellido)')
      .eq('id_incidente', idIncidente)
      .order('fecha_inspeccion', { ascending: true }),
    supabase
      .from('presupuestos')
      .select('*')
      .eq('id_incidente', idIncidente)
      .order('fecha_creacion', { ascending: true }),
    supabase
      .from('pagos')
      .select('*')
      .eq('id_incidente', idIncidente)
      .order('fecha_pago', { ascending: true }),
  ])

  return {
    inspecciones: inspecciones.data || [],
    presupuestos: presupuestos.data || [],
    pagos: pagos.data || [],
  }
}

// --- Escrituras ---

export async function actualizarIncidente(
  idIncidente: number,
  updates: {
    estado_actual?: string
    nivel_prioridad?: string
    categoria?: string | null
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('incidentes')
      .update(updates)
      .eq('id_incidente', idIncidente)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar incidente' }
  }
}
