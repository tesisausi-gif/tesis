/**
 * Servicio de Asignaciones
 * Orquesta repositories + auth para Server Components
 */

import { createClient } from '@/shared/lib/supabase/server'
import * as AsignacionRepository from './asignaciones.repository'
import { requireTecnicoId } from '@/features/auth'
import type { Asignacion, AsignacionTecnico } from './asignaciones.types'

// Re-exportar tipos para compatibilidad
export type { Asignacion, AsignacionTecnico }

/**
 * Obtener todas las asignaciones (admin)
 * Para usar en Server Components
 */
export async function getAsignacionesForAdmin(): Promise<Asignacion[]> {
  const supabase = await createClient()
  return AsignacionRepository.findAll(supabase)
}

/**
 * Obtener asignaciones pendientes del técnico actual
 * Para usar en Server Components
 */
export async function getAsignacionesPendientes(): Promise<Asignacion[]> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()
  return AsignacionRepository.findPendientesByTecnico(supabase, idTecnico)
}

/**
 * Obtener asignaciones activas del técnico actual
 * Para usar en Server Components
 */
export async function getAsignacionesActivas(): Promise<AsignacionTecnico[]> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()
  return AsignacionRepository.findActivasByTecnico(supabase, idTecnico)
}
