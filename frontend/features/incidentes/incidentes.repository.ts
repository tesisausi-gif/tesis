/**
 * Repository de Incidentes
 * Queries puras a Supabase para incidentes
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  Incidente,
  IncidenteConCliente,
  IncidenteConDetalles,
  CreateIncidenteDTO,
  UpdateIncidenteDTO,
} from './incidentes.types'

// Select base para queries de incidentes
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

const INCIDENTE_CON_CLIENTE_SELECT = `
  ${INCIDENTE_SELECT},
  clientes:id_cliente_reporta (
    nombre,
    apellido,
    telefono
  )
`

/**
 * Obtener todos los incidentes (para admin)
 */
export async function findAll(
  supabase: SupabaseClient
): Promise<IncidenteConCliente[]> {
  const { data, error } = await supabase
    .from('incidentes')
    .select(INCIDENTE_CON_CLIENTE_SELECT)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data as unknown as IncidenteConCliente[]
}

/**
 * Obtener incidentes de un cliente específico
 */
export async function findByCliente(
  supabase: SupabaseClient,
  idCliente: number
): Promise<Incidente[]> {
  const { data, error } = await supabase
    .from('incidentes')
    .select(INCIDENTE_SELECT)
    .eq('id_cliente_reporta', idCliente)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data as unknown as Incidente[]
}

/**
 * Obtener un incidente por ID con todos los detalles
 */
export async function findById(
  supabase: SupabaseClient,
  idIncidente: number
): Promise<IncidenteConDetalles> {
  const { data, error } = await supabase
    .from('incidentes')
    .select(`
      ${INCIDENTE_CON_CLIENTE_SELECT},
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
 * Crear un nuevo incidente
 */
export async function create(
  supabase: SupabaseClient,
  dto: CreateIncidenteDTO
): Promise<{ id_incidente: number }> {
  const { data, error } = await supabase
    .from('incidentes')
    .insert({
      id_propiedad: dto.id_propiedad,
      id_cliente_reporta: dto.id_cliente_reporta,
      descripcion_problema: dto.descripcion_problema,
      disponibilidad: dto.disponibilidad || null,
      categoria: null,
      estado_actual: 'Reportado',
    })
    .select('id_incidente')
    .single()

  if (error) throw error
  return data
}

/**
 * Actualizar incidente
 */
export async function update(
  supabase: SupabaseClient,
  idIncidente: number,
  dto: UpdateIncidenteDTO
): Promise<void> {
  const { error } = await supabase
    .from('incidentes')
    .update(dto)
    .eq('id_incidente', idIncidente)

  if (error) throw error
}

/**
 * Actualizar estado de un incidente
 */
export async function updateEstado(
  supabase: SupabaseClient,
  idIncidente: number,
  estado: string
): Promise<void> {
  const { error } = await supabase
    .from('incidentes')
    .update({ estado_actual: estado })
    .eq('id_incidente', idIncidente)

  if (error) throw error
}
