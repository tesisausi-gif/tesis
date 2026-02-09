/**
 * Servicio de Asignaciones
 * Queries para Server Components
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireTecnicoId } from '@/features/auth/auth.service'
import type { Asignacion, AsignacionTecnico } from './asignaciones.types'

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
      telefono
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
 * Obtener asignaciones activas del técnico actual (aceptadas, en_curso, completadas)
 */
export async function getAsignacionesActivas(): Promise<AsignacionTecnico[]> {
  const supabase = await createClient()
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
        )
      )
    `)
    .eq('id_tecnico', idTecnico)
    .in('estado_asignacion', ['aceptada', 'en_curso', 'completada'])
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as unknown as AsignacionTecnico[]
}
