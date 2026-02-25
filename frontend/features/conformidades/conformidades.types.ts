/**
 * Tipos del módulo de Conformidades
 */

export interface Conformidad {
  id_conformidad: number
  id_incidente: number
  id_cliente: number
  descripcion_trabajo: string | null
  esta_firmada: boolean
  fecha_firma: string | null
  observaciones: string | null
  fecha_creacion: string
}

export interface CreateConformidadDTO {
  id_incidente: number
  id_cliente: number
  descripcion_trabajo?: string | null
}

export interface FirmarConformidadDTO {
  id_conformidad: number
  observaciones?: string | null
}
