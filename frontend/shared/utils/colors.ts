/**
 * Mapeos de colores centralizados
 * Evita duplicación de definiciones de colores en múltiples archivos
 */

// Colores para estados de asignación
export const ESTADO_ASIGNACION_COLORS: Record<string, string> = {
  'pendiente': 'bg-yellow-100 text-yellow-800',
  'aceptada': 'bg-blue-100 text-blue-800',
  'rechazada': 'bg-red-100 text-red-800',
  'en_curso': 'bg-orange-100 text-orange-800',
  'completada': 'bg-green-100 text-green-800',
}

export const ESTADO_ASIGNACION_LABELS: Record<string, string> = {
  'pendiente': 'Pendiente',
  'aceptada': 'Aceptada',
  'rechazada': 'Rechazada',
  'en_curso': 'En Curso',
  'completada': 'Completada',
}

// Colores para categorías de incidentes
export const CATEGORIA_COLORS: Record<string, string> = {
  'Plomería': 'bg-blue-100 text-blue-800',
  'Electricidad': 'bg-yellow-100 text-yellow-800',
  'Albañilería': 'bg-orange-100 text-orange-800',
  'Pintura': 'bg-purple-100 text-purple-800',
  'Carpintería': 'bg-amber-100 text-amber-800',
  'Herrería': 'bg-slate-100 text-slate-800',
  'Otros': 'bg-gray-100 text-gray-800',
}

// Colores para estados de presupuesto
export const ESTADO_PRESUPUESTO_COLORS: Record<string, string> = {
  'borrador': 'bg-gray-100 text-gray-800',
  'enviado': 'bg-blue-100 text-blue-800',
  'aprobado_admin': 'bg-cyan-100 text-cyan-800',
  'aprobado': 'bg-green-100 text-green-800',
  'rechazado': 'bg-red-100 text-red-800',
  'vencido': 'bg-orange-100 text-orange-800',
}

export const ESTADO_PRESUPUESTO_LABELS: Record<string, string> = {
  'borrador': 'Borrador',
  'enviado': 'Enviado',
  'aprobado_admin': 'Aprobado Admin',
  'aprobado': 'Aprobado',
  'rechazado': 'Rechazado',
  'vencido': 'Vencido',
}

// Funciones helper
export function getEstadoAsignacionColor(estado: string): string {
  return ESTADO_ASIGNACION_COLORS[estado] || 'bg-gray-100 text-gray-800'
}

export function getEstadoAsignacionLabel(estado: string): string {
  return ESTADO_ASIGNACION_LABELS[estado] || estado
}

export function getCategoriaColor(categoria: string | null): string {
  if (!categoria) return 'bg-gray-100 text-gray-800'
  return CATEGORIA_COLORS[categoria] || 'bg-gray-100 text-gray-800'
}

export function getEstadoPresupuestoColor(estado: string): string {
  return ESTADO_PRESUPUESTO_COLORS[estado] || 'bg-gray-100 text-gray-800'
}

export function getEstadoPresupuestoLabel(estado: string): string {
  return ESTADO_PRESUPUESTO_LABELS[estado] || estado
}
