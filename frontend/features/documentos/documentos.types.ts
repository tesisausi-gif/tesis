/**
 * Tipos para el módulo de Documentos y Fotos
 */

export const STORAGE_BUCKET = 'documentos'

export const STORAGE_PATHS = {
  inspecciones: (idInspeccion: number) => `inspecciones/${idInspeccion}`,
  diagnosticos: (idIncidente: number) => `diagnosticos/${idIncidente}`,
} as const

export type TipoDocumento = 'foto_inspeccion' | 'foto_diagnostico'
