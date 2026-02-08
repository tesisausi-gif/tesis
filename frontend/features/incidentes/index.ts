/**
 * Feature: Incidentes
 *
 * Maneja todo lo relacionado con incidentes reportados por clientes.
 *
 * Estructura:
 * - incidentes.types.ts: Tipos del dominio
 * - incidentes.repository.ts: Queries a Supabase
 * - incidentes.service.ts: Lógica para Server Components
 * - incidentes.actions.ts: Server Actions para mutaciones
 */

// Types
export * from './incidentes.types'

// Repository (usar como IncidenteRepository.findAll, etc)
export * as IncidenteRepository from './incidentes.repository'

// Service (funciones de alto nivel)
export * from './incidentes.service'

// Actions (Server Actions)
export * from './incidentes.actions'
