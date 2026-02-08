/**
 * Feature: Usuarios
 *
 * Maneja usuarios, clientes y técnicos.
 *
 * Estructura:
 * - usuarios.types.ts: Tipos del dominio
 * - usuarios.repository.ts: Queries a Supabase
 * - usuarios.service.ts: Lógica para Server Components
 */

// Types
export * from './usuarios.types'

// Repository (usar como UsuarioRepository.findAll, etc)
export * as UsuarioRepository from './usuarios.repository'

// Service (funciones de alto nivel)
export * from './usuarios.service'
