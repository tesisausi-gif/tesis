/**
 * Tipos de Incidentes
 * Tipos del dominio para incidentes
 */

import type { InmuebleResumen, ClienteResumen, TecnicoResumen } from '@/shared/types'

// Incidente base (sin relaciones)
export interface IncidenteBase {
  id_incidente: number
  id_propiedad: number
  id_cliente_reporta: number
  descripcion_problema: string
  categoria: string | null
  nivel_prioridad: string | null
  estado_actual: string
  fecha_registro: string
  fecha_cierre: string | null
  fue_resuelto: boolean
  disponibilidad: string | null
}

// Incidente con datos de inmueble
export interface Incidente extends IncidenteBase {
  inmuebles: InmuebleResumen | null
}

// Incidente con datos de cliente (para admin)
export interface IncidenteConCliente extends Incidente {
  clientes: ClienteResumen | null
}

// Incidente con todos los detalles
export interface IncidenteConDetalles extends IncidenteConCliente {
  asignaciones_tecnico?: AsignacionResumen[]
}

// Resumen de asignación para incidentes
export interface AsignacionResumen {
  id_asignacion: number
  estado_asignacion: string
  fecha_asignacion: string
  tecnicos: TecnicoResumen | null
}

// DTO para crear incidente
export interface CreateIncidenteDTO {
  id_propiedad: number
  id_cliente_reporta: number
  descripcion_problema: string
  disponibilidad?: string
}

// DTO para actualizar incidente
export interface UpdateIncidenteDTO {
  estado_actual?: string
  nivel_prioridad?: string
  categoria?: string | null
}
