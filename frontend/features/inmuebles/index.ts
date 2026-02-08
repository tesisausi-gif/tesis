/**
 * Feature: Inmuebles
 *
 * Maneja las propiedades/inmuebles de los clientes.
 *
 * Estructura:
 * - inmuebles.types.ts: Tipos del dominio
 * - inmuebles.repository.ts: Queries a Supabase
 * - inmuebles.service.ts: Lógica para Server Components
 * - inmuebles.actions.ts: Server Actions para mutaciones
 */

// Types
export * from './inmuebles.types'

// Repository (usar como InmuebleRepository.findAll, etc)
export * as InmuebleRepository from './inmuebles.repository'

// Service (funciones de alto nivel)
export * from './inmuebles.service'

// Actions (Server Actions)
export * from './inmuebles.actions'
