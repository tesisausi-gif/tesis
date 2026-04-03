/**
 * Tipos del módulo de Avances de Reparación
 * Columnas según esquema actual de producción.
 */

export interface Avance {
  id_avance: number
  id_incidente: number
  id_tecnico: number
  descripcion: string
  porcentaje_avance: number | null
  fotos_url?: string[] | null
  fecha_avance: string
  fecha_registro?: string
}

export interface AvanceConDetalle extends Avance {
  tecnicos: {
    nombre: string
    apellido: string
  } | null
}

export interface CreateAvanceDTO {
  id_incidente: number
  descripcion_avance: string
  porcentaje_completado?: number | null
}
