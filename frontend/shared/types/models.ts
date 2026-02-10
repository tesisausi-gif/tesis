/**
 * Tipos de modelos compartidos entre features
 * Tipos base que son referenciados por múltiples features
 */

// ==============================================
// Resúmenes para relaciones (usados en JOINs)
// ==============================================

/**
 * Resumen de cliente para relaciones
 */
export interface ClienteResumen {
  nombre: string
  apellido: string
  telefono?: string | null
  correo_electronico?: string | null
}

/**
 * Resumen de técnico para relaciones
 */
export interface TecnicoResumen {
  nombre: string
  apellido: string
  especialidad?: string | null
}

/**
 * Resumen de inmueble para relaciones
 */
export interface InmuebleResumen {
  calle: string | null
  altura: string | null
  piso: string | null
  dpto: string | null
  barrio: string | null
  localidad: string | null
}

// ==============================================
// Tipos para selects/dropdowns
// ==============================================

/**
 * Técnico activo (para selects)
 */
export interface TecnicoActivo {
  id_tecnico: number
  nombre: string
  apellido: string
  especialidad: string | null
}

/**
 * Tipo de inmueble (para selects)
 */
export interface TipoInmueble {
  id_tipo_inmueble: number
  nombre: string
  descripcion?: string | null
}

// ==============================================
// Resultado de acciones
// ==============================================

/**
 * Resultado genérico de Server Actions
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
