/**
 * Tipos para el módulo de Exportación de Reportes
 * Incluye tipos legacy (3 exportaciones básicas) + 12 reportes analíticos
 */

export type FormatoExport = 'csv' | 'pdf'
export type TipoReporte = 'incidentes' | 'pagos' | 'tecnicos'

// ─── Legacy types ──────────────────────────────────────────────────────────────

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

// ─── Select option types ─────────────────────────────────────────────────────

export interface TecnicoSelect {
  id_tecnico: number
  nombre: string
  apellido: string
}

export interface InmuebleSelect {
  id_inmueble: number
  calle: string
  localidad: string
}

// ─── R1: Incidentes por Tipo y Estado ────────────────────────────────────────

export interface R1FilaCategoria {
  categoria: string
  cantidad: number
  porcentaje: number
}

export interface R1FilaEstado {
  estado: string
  cantidad: number
  porcentaje: number
}

export interface R1Resultado {
  total: number
  porcentajeCerrados: number
  porcentajeEnCurso: number
  porcentajePendientes: number
  promedioDiario: number
  porCategoria: R1FilaCategoria[]
  porEstado: R1FilaEstado[]
}

// ─── R2: Tiempos de Resolución ────────────────────────────────────────────────

export interface R2FilaIncidente {
  id_incidente: number
  categoria: string
  descripcion: string
  inmueble: string
  fecha_registro: string
  fecha_cierre: string | null
  dias: number
}

export interface R2Resultado {
  promedioDias: number
  minDias: number
  maxDias: number
  totalIncidentes: number
  incidentesMasLentos: R2FilaIncidente[]
}

// ─── R3: Técnicos por Volumen ─────────────────────────────────────────────────

export interface R3FilaTecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  especialidad: string
  asignados: number
  cerrados: number
  enCurso: number
  tasaCierre: number
  promedioDias: number
}

export interface R3Resultado {
  totalTecnicos: number
  promedioAsignados: number
  promedioCerrados: number
  tecnicos: R3FilaTecnico[]
}

// ─── R4: Propiedades con Más Incidentes ───────────────────────────────────────

export interface R4FilaInmueble {
  id_inmueble: number
  nombre: string
  direccion: string
  totalIncidentes: number
  costoTotal: number
  tipoFrecuente: string
  incidentesAbiertos: number
}

export interface R4Resultado {
  totalPropiedades: number
  totalIncidentes: number
  costoTotal: number
  inmuebles: R4FilaInmueble[]
}

// ─── R5: Rentabilidad por Refacción ──────────────────────────────────────────

export interface R5FilaTipo {
  tipo: string
  ingresoBruto: number        // cobrado al cliente (cobros_clientes.monto_cobro)
  costoPagadoTecnico: number  // pagado al técnico (pagos_tecnicos.monto_pago)
  comision: number            // ingresoBruto - costoPagadoTecnico (margen ISBA)
  margen: number              // comision / ingresoBruto * 100
}

export interface R5Resultado {
  ingresoTotal: number
  costoTotal: number
  comisionTotal: number
  margenGlobal: number
  porTipo: R5FilaTipo[]
}

// ─── R6: Desempeño de Técnicos ────────────────────────────────────────────────

export interface R6FilaTecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  especialidad: string
  asignados: number
  cerrados: number
  rechazadas: number            // asignaciones rechazadas/canceladas por el técnico
  productividad: number         // cerrados/asignados * 100
  satisfaccion: number | null
  promedioDiasRespuesta: number // días promedio desde registro incidente hasta primera asignación
  rankingPos: number
}

export interface R6Resultado {
  totalTecnicos: number
  promedioProductividad: number
  promedioSatisfaccion: number
  tecnicos: R6FilaTecnico[]
}

// ─── R7: Satisfacción de ISBA ─────────────────────────────────────────────────

export interface R7FilaTecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  promedioPuntuacion: number
  totalEvaluaciones: number
  distribucion: Record<string, number>
  comentarios: string[]
}

export interface R7Resultado {
  promedioGlobal: number
  totalEvaluaciones: number
  tecnicos: R7FilaTecnico[]
}

// ─── R8: Costos de Mantenimiento ─────────────────────────────────────────────

export interface R8FilaCategoria {
  categoria: string
  costoTotal: number
  materiales: number
  manoObra: number
  gastosAdmin: number
  totalIncidentes: number
  promedioCosto: number
}

export interface R8Resultado {
  costoTotal: number
  totalIncidentes: number
  costoPromedio: number
  presupuestoTotal: number
  porCategoria: R8FilaCategoria[]
}

// ─── R10: Rentabilidad por Inmueble ──────────────────────────────────────────

export interface R10FilaInmueble {
  id_inmueble: number
  nombre: string
  ingresos: number
  costos: number
  rentabilidadNeta: number
  margen: number
  totalIncidentes: number
}

export interface R10Resultado {
  ingresosTotal: number
  costosTotal: number
  rentabilidadNeta: number
  margenGlobal: number
  inmuebles: R10FilaInmueble[]
}

// ─── R11: Comparativo de Desempeño ───────────────────────────────────────────

export interface R11FilaIndicador {
  indicador: string
  periodo1: number
  periodo2: number
  cambioPorcentaje: number
  tendencia: 'sube' | 'baja' | 'igual'
}

export interface R11Resultado {
  periodo1Label: string
  periodo2Label: string
  indicadores: R11FilaIndicador[]
}

// ─── R12: Indicadores Globales ───────────────────────────────────────────────

export interface R12FilaTecnico {
  nombre: string
  apellido: string
  asignados: number
  cerrados: number
  satisfaccion: number
}

export interface R12FilaPropiedad {
  nombre: string
  direccion: string
  incidentes: number
  costoTotal: number
}

export interface R12Resultado {
  totalIncidentes: number
  incidentesAbiertos: number
  incidentesCerrados: number
  promedioResolucionDias: number
  totalIngresos: number
  totalCostos: number
  rentabilidadNeta: number
  satisfaccionPromedio: number
  topTecnicos: R12FilaTecnico[]
  topPropiedades: R12FilaPropiedad[]
}

// ─── R13: Medios de Pago ─────────────────────────────────────────────────────

export interface R13FilaMetodo {
  metodo: string
  cantidad: number
  montoCobradoClientes: number
  montoPagadoTecnicos: number
  montoTotal: number
}

export interface R13Resultado {
  totalCobradoClientes: number
  totalPagadoTecnicos: number
  cantidadCobros: number
  cantidadPagos: number
  porMetodo: R13FilaMetodo[]
}
