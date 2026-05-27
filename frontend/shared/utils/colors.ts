/**
 * Mapeos de colores y etiquetas centralizados para el sistema ISBA
 * Evita duplicación de definiciones de colores y asegura consistencia visual.
 */

// 1. Estados de Incidentes — configuración unificada para todas las vistas
export const ESTADO_INCIDENTE_CONFIG: Record<string, {
  stripe: string      // border-l-* para la raya lateral de la card
  bgGradient: string  // clase from-* para el gradiente de fondo
  badge: string       // bg + text para el badge/pill
  labelAdmin: string  // etiqueta en vista admin
  labelCliente: string // etiqueta en vista cliente
}> = {
  pendiente: {
    stripe: 'border-l-amber-400',
    bgGradient: 'from-amber-50/60',
    badge: 'bg-amber-100 text-amber-800',
    labelAdmin: 'Pendiente',
    labelCliente: 'Pendiente',
  },
  asignacion_solicitada: {
    stripe: 'border-l-blue-400',
    bgGradient: 'from-blue-50/50',
    badge: 'bg-blue-100 text-blue-800',
    labelAdmin: 'Asig. Solicitada',
    labelCliente: 'En espera de técnico',
  },
  en_proceso: {
    stripe: 'border-l-orange-400',
    bgGradient: 'from-orange-50/50',
    badge: 'bg-orange-100 text-orange-800',
    labelAdmin: 'En Proceso',
    labelCliente: 'En proceso',
  },
  finalizado: {
    stripe: 'border-l-emerald-400',
    bgGradient: 'from-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-800',
    labelAdmin: 'Finalizado',
    labelCliente: 'Finalizado',
  },
  resuelto: {
    stripe: 'border-l-emerald-400',
    bgGradient: 'from-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-800',
    labelAdmin: 'Finalizado',
    labelCliente: 'Finalizado',
  },
}

// Compat: mantiene compatibilidad con usos existentes
export const ESTADO_INCIDENTE_COLORS: Record<string, string> = {
  pendiente: 'border-amber-200 bg-amber-50 text-amber-700',
  asignacion_solicitada: 'border-blue-200 bg-blue-50 text-blue-700',
  en_proceso: 'border-orange-200 bg-orange-50 text-orange-700',
  finalizado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  resuelto: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export const ESTADO_INCIDENTE_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  asignacion_solicitada: 'Asig. Solicitada',
  en_proceso: 'En Proceso',
  finalizado: 'Finalizado',
  resuelto: 'Finalizado',
}

// 2. Prioridades
export const PRIORIDAD_COLORS: Record<string, string> = {
  Baja: 'border-gray-200 bg-gray-50 text-gray-600',
  Media: 'border-blue-200 bg-blue-50 text-blue-700',
  Alta: 'border-orange-200 bg-orange-50 text-orange-700',
  Urgente: 'border-red-200 bg-red-50 text-red-700',
}

// 3. Asignaciones de Técnicos
export const ESTADO_ASIGNACION_COLORS: Record<string, string> = {
  pendiente: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  aceptada: 'border-blue-200 bg-blue-50 text-blue-700',
  rechazada: 'border-red-200 bg-red-50 text-red-700',
  en_curso: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  completada: 'border-green-200 bg-green-50 text-green-700',
}

export const ESTADO_ASIGNACION_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  en_curso: 'En Curso',
  completada: 'Completada',
}

// 4. Presupuestos
export const ESTADO_PRESUPUESTO_COLORS: Record<string, string> = {
  borrador: 'border-gray-200 bg-gray-50 text-gray-600',
  enviado: 'border-blue-200 bg-blue-50 text-blue-700',
  aprobado_admin: 'border-amber-200 bg-amber-50 text-amber-700',
  aprobado: 'border-green-200 bg-green-50 text-green-700',
  rechazado: 'border-red-200 bg-red-50 text-red-700',
  vencido: 'border-orange-200 bg-orange-50 text-orange-700',
}

export const ESTADO_PRESUPUESTO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado_admin: 'Pendiente Cliente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
}

// 5. Categorías
export const CATEGORIA_COLORS: Record<string, string> = {
  'Plomería': 'bg-blue-100 text-blue-800',
  'Electricidad': 'bg-yellow-100 text-yellow-800',
  'Albañilería': 'bg-orange-100 text-orange-800',
  'Pintura': 'bg-purple-100 text-purple-800',
  'Carpintería': 'bg-amber-100 text-amber-800',
  'Herrería': 'bg-slate-100 text-slate-800',
  'Otros': 'bg-gray-100 text-gray-800',
}

/**
 * FUNCIONES HELPER PARA COMPONENTES
 */

export function getEstadoIncidenteColor(estado: string): string {
  return ESTADO_INCIDENTE_COLORS[estado] || 'border-gray-200 bg-gray-50 text-gray-600'
}

export function getEstadoIncidenteLabel(estado: string): string {
  return ESTADO_INCIDENTE_LABELS[estado] || estado
}

export function getPrioridadColor(prioridad: string | null): string {
  if (!prioridad) return 'border-gray-200 bg-gray-50 text-gray-400'
  return PRIORIDAD_COLORS[prioridad] || 'border-gray-200 bg-gray-50 text-gray-600'
}

export function getEstadoAsignacionColor(estado: string): string {
  return ESTADO_ASIGNACION_COLORS[estado] || 'border-gray-200 bg-gray-50 text-gray-600'
}

export function getEstadoAsignacionLabel(estado: string): string {
  return ESTADO_ASIGNACION_LABELS[estado] || estado
}

export function getEstadoPresupuestoColor(estado: string): string {
  return ESTADO_PRESUPUESTO_COLORS[estado] || 'border-gray-200 bg-gray-50 text-gray-600'
}

export function getEstadoPresupuestoLabel(estado: string): string {
  return ESTADO_PRESUPUESTO_LABELS[estado] || estado
}

export function getCategoriaColor(categoria: string | null): string {
  if (!categoria) return 'bg-gray-100 text-gray-800'
  return CATEGORIA_COLORS[categoria] || 'bg-gray-100 text-gray-800'
}
