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
  calificacion_admin: number | null
  comentario_admin: string | null
}

// Incidente con datos de inmueble
export interface Incidente extends IncidenteBase {
  inmuebles: InmuebleResumen | null
}

// Incidente con datos de cliente (para admin)
export interface IncidenteConCliente extends Incidente {
  clientes: ClienteResumen | null
  asignaciones_tecnico?: { estado_asignacion: string; tecnicos: { nombre: string; apellido: string } | null }[]
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

// Filtros para métricas y reportes
export interface FiltrosMetricas {
  fechaDesde?: string | null
  fechaHasta?: string | null
  categoria?: string | null
}

// Métricas del dashboard admin
export interface MetricasMes {
  mes: string
  total: number
  resueltos: number
}

export interface MetricasCategoria {
  categoria: string
  count: number
}

export interface MetricasPrioridad {
  prioridad: string
  count: number
}

export interface MetricasTecnico {
  nombre: string
  apellido: string
  incidentesResueltos: number
}

export interface MetricasDashboard {
  incidentesPorMes: MetricasMes[]
  distribucionCategorias: MetricasCategoria[]
  distribucionPrioridades: MetricasPrioridad[]
  tiempoPromedioResolucion: number
  topTecnicos: MetricasTecnico[]
  totalIncidentes: number
}
