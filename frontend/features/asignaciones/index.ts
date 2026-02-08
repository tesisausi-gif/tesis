/**
 * Feature: Asignaciones
 *
 * Maneja las asignaciones de técnicos a incidentes.
 *
 * Estructura:
 * - asignaciones.types.ts: Tipos del dominio
 * - asignaciones.repository.ts: Queries a Supabase
 * - asignaciones.service.ts: Lógica para Server Components
 * - asignaciones.actions.ts: Server Actions para mutaciones
 */

// Types
export * from './asignaciones.types'

// Repository (usar como AsignacionRepository.findAll, etc)
export * as AsignacionRepository from './asignaciones.repository'

// Service (funciones de alto nivel)
export * from './asignaciones.service'

// Actions (Server Actions)
export * from './asignaciones.actions'
