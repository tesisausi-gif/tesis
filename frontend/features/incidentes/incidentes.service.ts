/**
 * Servicio de Incidentes
 * Queries para Server Components
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireClienteId } from '@/features/auth'
import type { Incidente, IncidenteConCliente, IncidenteConDetalles } from './incidentes.types'

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
