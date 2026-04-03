/**
 * Tipos del módulo de Avances de Reparación
 * Columnas según esquema actual de producción.
 */

export interface Avance {
  id_avance: number
  id_incidente: number
  id_tecnico: number
  descripcion_avance: string
  porcentaje_completado: number | null
  fecha_avance: string
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
