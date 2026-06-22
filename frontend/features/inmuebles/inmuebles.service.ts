'use server'

/**
 * Servicio de Inmuebles
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { translateDbError } from '@/shared/lib/db-errors'
import { createClient } from '@/shared/lib/supabase/server'
import { requireClienteId } from '@/features/auth/auth.service'
import type { Inmueble, InmuebleConCliente, TipoInmueble } from './inmuebles.types'
import type { ActionResult } from '@/shared/types'

// Select base
const INMUEBLE_SELECT = `
  id_inmueble,
  id_cliente,
  id_tipo_inmueble,
  calle,
  altura,
  piso,
  dpto,
  barrio,
  localidad,
  provincia,
  informacion_adicional,
  esta_activo,
  fecha_creacion,
  tipos_inmuebles (nombre)
`

/**
 * Obtener todos los inmuebles (admin)
 */
export async function getInmueblesForAdmin(): Promise<InmuebleConCliente[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inmuebles')
    .select(`
      ${INMUEBLE_SELECT},
      clientes (nombre, apellido, correo_electronico)
    `)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as unknown as InmuebleConCliente[]
}

/**
 * Obtener inmuebles del cliente actual
 */
export async function getInmueblesByCurrentUser(): Promise<Inmueble[]> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()

  const { data, error } = await supabase
    .from('inmuebles')
    .select(INMUEBLE_SELECT)
    .eq('id_cliente', idCliente)
    .order('calle')

  if (error) throw error
  return data as unknown as Inmueble[]
}

/**
 * Obtener inmuebles activos del cliente actual
 */
export async function getInmueblesActivosByCurrentUser(): Promise<Inmueble[]> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()

  const { data, error } = await supabase
    .from('inmuebles')
    .select(INMUEBLE_SELECT)
    .eq('id_cliente', idCliente)
    .eq('esta_activo', true)
    .order('calle')

  if (error) throw error
  return data as unknown as Inmueble[]
}

/**
 * Obtener inmueble por ID
 */
export async function getInmuebleById(idInmueble: number): Promise<InmuebleConCliente> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inmuebles')
    .select(`
      ${INMUEBLE_SELECT},
      clientes (nombre, apellido, correo_electronico)
    `)
    .eq('id_inmueble', idInmueble)
    .single()

  if (error) throw error
  return data as unknown as InmuebleConCliente
}

/**
 * Obtener tipos de inmuebles
 */
export async function getTiposInmuebles(): Promise<TipoInmueble[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tipos_inmuebles')
    .select('id_tipo_inmueble, nombre')
    .eq('esta_activo', true)
    .order('nombre')

  if (error) throw error
  return data as TipoInmueble[]
}

// --- Escrituras ---

export async function crearInmueble(inmuebleData: {
  id_tipo_inmueble: number
  provincia: string
  localidad: string
  barrio: string | null
  calle: string
  altura: string
  piso: string | null
  dpto: string | null
  informacion_adicional: string | null
}): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const idCliente = await requireClienteId()

    const { error } = await supabase
      .from('inmuebles')
      .insert({
        ...inmuebleData,
        id_cliente: idCliente,
        esta_activo: true,
      })

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear inmueble' }
  }
}

export async function actualizarInmueble(
  idInmueble: number,
  inmuebleData: {
    id_tipo_inmueble: number
    provincia: string
    localidad: string
    barrio: string | null
    calle: string
    altura: string
    piso: string | null
    dpto: string | null
    informacion_adicional: string | null
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('inmuebles')
      .update(inmuebleData)
      .eq('id_inmueble', idInmueble)

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar inmueble' }
  }
}

/**
 * Devuelve los incidentes NO finalizados asociados a un inmueble.
 * Se usa para bloquear la baja del inmueble cuando hay trabajo pendiente.
 */
export async function getIncidentesEnCursoInmueble(idInmueble: number): Promise<
  Array<{ id_incidente: number; descripcion_problema: string | null; estado_actual: string }>
> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('incidentes')
      .select('id_incidente, descripcion_problema, estado_actual')
      .eq('id_propiedad', idInmueble)
      .neq('estado_actual', 'finalizado')
      .order('fecha_registro', { ascending: false })

    if (error) return []
    return (data || []) as Array<{
      id_incidente: number
      descripcion_problema: string | null
      estado_actual: string
    }>
  } catch {
    return []
  }
}

export async function toggleEstadoInmueble(
  idInmueble: number,
  nuevoEstado: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Validación: no permitir dar de baja un inmueble con incidentes en curso.
    // Defense in depth — la UI ya hace el check antes, esto es el guardián server-side.
    if (!nuevoEstado) {
      const { count, error: countError } = await supabase
        .from('incidentes')
        .select('id_incidente', { count: 'exact', head: true })
        .eq('id_propiedad', idInmueble)
        .neq('estado_actual', 'finalizado')

      if (countError) return { success: false, error: translateDbError(countError) }
      if ((count ?? 0) > 0) {
        return {
          success: false,
          error: 'No se puede dar de baja: el inmueble tiene incidentes en curso.',
        }
      }
    }

    const { error } = await supabase
      .from('inmuebles')
      .update({ esta_activo: nuevoEstado })
      .eq('id_inmueble', idInmueble)

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al cambiar estado' }
  }
}
