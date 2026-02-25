/**
 * Tipos para el módulo de Exportación de Reportes
 */

export type FormatoExport = 'csv' | 'pdf'

export type TipoReporte = 'incidentes' | 'pagos' | 'tecnicos'

export interface FilaIncidenteExport {
  id_incidente: number
  fecha_registro: string
  descripcion_problema: string
  categoria: string
  nivel_prioridad: string
  estado_actual: string
  fue_resuelto: boolean
  fecha_cierre: string
  cliente_nombre: string
  cliente_apellido: string
  inmueble_calle: string
  inmueble_localidad: string
}

export interface FilaPagoExport {
  id_pago: number
  fecha_pago: string
  monto_pagado: number
  tipo_pago: string
  metodo_pago: string
  numero_comprobante: string
  incidente_id: number
  incidente_descripcion: string
  cliente_nombre: string
  cliente_apellido: string
}

export interface FilaTecnicoExport {
  nombre: string
  apellido: string
  especialidad: string
  email: string
  telefono: string
  total_asignaciones: number
  asignaciones_completadas: number
}

export interface DatosReporte {
  incidentes: FilaIncidenteExport[]
  pagos: FilaPagoExport[]
  tecnicos: FilaTecnicoExport[]
}
