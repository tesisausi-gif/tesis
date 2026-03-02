/**
 * Tipos y interfaces para el módulo de Pagos
 * Columnas según esquema actual de producción.
 */

import { TipoPago, MetodoPago } from '@/shared/types/enums'

export interface PagoBase {
  id_pago?: number
  id_incidente: number
  id_presupuesto: number
  tipo_pago: TipoPago | string
  monto_pagado: number
  metodo_pago: MetodoPago | string
  numero_comprobante?: string | null
  url_comprobante?: string | null
  fecha_pago?: string
  observaciones?: string | null
  fecha_creacion?: string
  fecha_modificacion?: string
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
  incidentes?: {
    id_incidente: number
    descripcion_problema: string
    id_cliente_reporta: number
  }
}
