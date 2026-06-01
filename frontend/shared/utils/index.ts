/**
 * Utilidades compartidas
 */

export { cn } from './cn'
export * from './colors'
export * from './address'
export * from './error-messages'

/** Normaliza un string para búsqueda: elimina acentos y pasa a minúsculas */
export const normalizeSearch = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
