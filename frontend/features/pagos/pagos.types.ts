/**
 * Tipos y interfaces para el módulo de Pagos
 */

export enum TipoPago {
  ADELANTO = 'adelanto',
  PARCIAL = 'parcial',
  TOTAL = 'total',
  REEMBOLSO = 'reembolso',
}

export enum MetodoPago {
  EFECTIVO = 'efectivo',
  TRANSFERENCIA = 'transferencia',
  TARJETA = 'tarjeta',
  CHEQUE = 'cheque',
}

export interface PagoBase {
  id_pago?: number
  id_presupuesto: number
  id_cliente?: number
  tipo_pago: TipoPago | string
  monto: number
  metodo_pago: MetodoPago | string
  numero_referencia?: string | null
  comprobante_url?: string | null
  fecha_pago?: string
  fecha_registro?: string
  observaciones?: string | null
}

export interface Pago extends PagoBase {
  id_pago: number
}

export interface PagoConDetalle extends Pago {
  presupuestos?: {
    id_presupuesto: number
    costo_total: number
    estado_presupuesto: string
  }
  clientes?: {
    nombre: string
    apellido: string
  }
}
