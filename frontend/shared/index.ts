/**
 * Shared - Código compartido entre features
 *
 * Contiene:
 * - lib/supabase: Clientes de Supabase (server, client, middleware)
 * - types: Tipos de base de datos y enums
 * - utils: Utilidades (cn, colors, address, error-messages)
 */

// Re-exportar todo para facilitar imports
export * from './lib/supabase'
export * from './types'
export * from './utils'
