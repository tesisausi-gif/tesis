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
  requiere_nueva_etapa?: number | null  // INTEGER 0/1 en DB
  observaciones?: string | null
  fecha_avance: string
  fecha_creacion?: string
  fecha_modificacion?: string
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
