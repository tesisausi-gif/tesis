/**
 * Tipos y interfaces para el módulo de Presupuestos
 * Columnas según esquema actual de producción.
 */

import { EstadoPresupuesto } from '@/shared/types/enums'

export interface PresupuestoBase {
  id_presupuesto?: number
  id_incidente: number
  id_inspeccion?: number | null
  descripcion_detallada: string
  costo_materiales?: number | null
  costo_mano_obra?: number | null
  gastos_administrativos?: number | null
  costo_total: number
  estado_presupuesto?: EstadoPresupuesto | string
  fecha_aprobacion?: string | null
  id_aprobado_por?: number | null
  alternativas_reparacion?: string | null
  fecha_creacion?: string
  fecha_modificacion?: string
  nota_rechazo_cliente?: string | null
  decision_cliente?: 'nuevo_tecnico' | 'otra_oportunidad' | null
  decision_tecnico?: 'acepta' | 'rechaza' | null
}

export interface Presupuesto extends PresupuestoBase {
  id_presupuesto: number
}

export interface PresupuestoConDetalle extends Presupuesto {
  incidentes?: {
    id_incidente: number
    descripcion_problema: string
    categoria: string
    id_cliente_reporta?: number
  }
}

export interface PresupuestoParaCliente extends Presupuesto {
  incidente_categoria?: string
}
