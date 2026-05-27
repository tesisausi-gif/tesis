/**
 * Mapeos de colores y etiquetas centralizados para el sistema ISBA
 * Evita duplicación de definiciones de colores y asegura consistencia visual.
 */

// 1. Estados de Incidentes — configuración unificada para todas las vistas
export const ESTADO_INCIDENTE_CONFIG: Record<string, {
  stripe: string       // border-l-* para la raya lateral de la card
  bgGradient: string   // clase from-* para el gradiente de fondo
  badge: string        // bg + text + ring para el badge/pill de estado principal
  labelAdmin: string   // etiqueta en vista admin
  labelCliente: string // etiqueta en vista cliente
  labelTecnico: string // etiqueta en vista técnico (sobre incidente, no sobre asignación)
}> = {
  pendiente: {
    stripe: 'border-l-amber-400',
    bgGradient: 'from-amber-50/60',
    badge: 'bg-amber-100 text-amber-800 ring-amber-200',
    labelAdmin: 'Pendiente',
    labelCliente: 'Pendiente',
    labelTecnico: 'Pendiente',
  },
  asignacion_solicitada: {
    stripe: 'border-l-blue-400',
    bgGradient: 'from-blue-50/50',
    badge: 'bg-blue-100 text-blue-800 ring-blue-200',
    labelAdmin: 'Asig. Solicitada',
    labelCliente: 'En espera de técnico',
    labelTecnico: 'Asig. Solicitada',
  },
  en_proceso: {
    stripe: 'border-l-orange-400',
    bgGradient: 'from-orange-50/50',
    badge: 'bg-orange-100 text-orange-800 ring-orange-200',
    labelAdmin: 'En Proceso',
    labelCliente: 'En proceso',
    labelTecnico: 'En proceso',
  },
  finalizado: {
    stripe: 'border-l-emerald-400',
    bgGradient: 'from-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    labelAdmin: 'Finalizado',
    labelCliente: 'Finalizado',
    labelTecnico: 'Finalizado',
  },
  resuelto: {
    stripe: 'border-l-emerald-400',
    bgGradient: 'from-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    labelAdmin: 'Finalizado',
    labelCliente: 'Finalizado',
    labelTecnico: 'Finalizado',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 1b. Sub-estados de "En Proceso" — FUENTE ÚNICA para cards, grupos y timeline
//
// Cada clave es el identificador canónico del sub-estado:
//   - Admin:    AccionPendiente['tipo'] para las variantes de en_proceso
//   - Técnico:  valor devuelto por getStatusKey()
//   - Timeline: referencia a timelineColor para el evento de entrada
//
// Para agregar un sub-estado nuevo:
//   1. Agregar la entrada aquí
//   2. Agregar la detección en getAccionPendiente() (admin) y getStatusKey() (técnico)
//   3. Agregar el icono en ICON_BY_SUB_ESTADO de cada componente
// ─────────────────────────────────────────────────────────────────────────────
export type SubEstadoEnProceso =
  | 'aceptada'
  | 'presupuesto_enviado'
  | 'presupuesto_cliente'
  | 'en_curso'
  | 'completada_pendiente'
  | 'conformidad_rechazada'
  | 'finalizado'

export const SUB_ESTADO_EN_PROCESO_CONFIG: Record<SubEstadoEnProceso, {
  labelGrupo: string       // label del header de sección (admin = técnico)
  labelBadge: string       // label corto del badge en la card
  stripe: string           // border-l-* de la card
  bgGradient: string       // from-* del gradiente de la card
  badge: string            // clases del badge inline
  groupHeaderCls: string   // clases del div-header del grupo
  groupDotCls: string      // clases del dot/pulse del grupo
  bannerBg: string | null  // bg-* del banner superior (null = sin banner)
  bannerText: string | null
  timelineColor: string    // bg-* del evento que ENTRA a este sub-estado
}> = {
  aceptada: {
    labelGrupo:    'Asignaciones por iniciar',
    labelBadge:    'Por iniciar',
    stripe:        'border-l-blue-400',
    bgGradient:    'from-blue-50/50',
    badge:         'bg-blue-100 text-blue-800 ring-blue-200',
    groupHeaderCls:'text-blue-700 bg-blue-50 border-blue-200',
    groupDotCls:   'bg-blue-500 animate-pulse',
    bannerBg:      null,
    bannerText:    null,
    timelineColor: 'bg-orange-400',
  },
  presupuesto_enviado: {
    labelGrupo:    'Presupuesto para revisar',
    labelBadge:    'Presup. enviado',
    stripe:        'border-l-amber-400',
    bgGradient:    'from-amber-50/50',
    badge:         'bg-amber-100 text-amber-800 ring-amber-200',
    groupHeaderCls:'text-amber-700 bg-amber-50 border-amber-200',
    groupDotCls:   'bg-amber-500 animate-pulse',
    bannerBg:      'bg-amber-500',
    bannerText:    'Presupuesto enviado — revisar y aprobar',
    timelineColor: 'bg-amber-500',
  },
  presupuesto_cliente: {
    labelGrupo:    'Aguarda aprobación del cliente',
    labelBadge:    'Esp. cliente',
    stripe:        'border-l-yellow-400',
    bgGradient:    'from-yellow-50/50',
    badge:         'bg-yellow-100 text-yellow-800 ring-yellow-200',
    groupHeaderCls:'text-yellow-700 bg-yellow-50 border-yellow-200',
    groupDotCls:   'bg-yellow-400',
    bannerBg:      'bg-yellow-500',
    bannerText:    'Presupuesto aprobado — aguarda decisión del cliente',
    timelineColor: 'bg-yellow-500',
  },
  en_curso: {
    labelGrupo:    'Trabajo en progreso',
    labelBadge:    'En curso',
    stripe:        'border-l-orange-400',
    bgGradient:    'from-orange-50/50',
    badge:         'bg-orange-100 text-orange-800 ring-orange-200',
    groupHeaderCls:'text-orange-700 bg-orange-50 border-orange-200',
    groupDotCls:   'bg-orange-400',
    bannerBg:      null,
    bannerText:    null,
    timelineColor: 'bg-orange-400',
  },
  completada_pendiente: {
    labelGrupo:    'Conformidad para revisar',
    labelBadge:    'Conf. subida',
    stripe:        'border-l-purple-400',
    bgGradient:    'from-purple-50/50',
    badge:         'bg-purple-100 text-purple-800 ring-purple-200',
    groupHeaderCls:'text-purple-700 bg-purple-50 border-purple-200',
    groupDotCls:   'bg-purple-500 animate-pulse',
    bannerBg:      'bg-purple-600',
    bannerText:    'Conformidad subida — revisar y aprobar',
    timelineColor: 'bg-purple-500',
  },
  conformidad_rechazada: {
    labelGrupo:    'Conformidad rechazada',
    labelBadge:    'Conf. rechazada',
    stripe:        'border-l-red-400',
    bgGradient:    'from-red-50/50',
    badge:         'bg-red-100 text-red-800 ring-red-200',
    groupHeaderCls:'text-red-700 bg-red-50 border-red-200',
    groupDotCls:   'bg-red-500 animate-pulse',
    bannerBg:      'bg-red-500',
    bannerText:    'Conformidad rechazada — técnico debe re-subir',
    timelineColor: 'bg-red-500',
  },
  finalizado: {
    labelGrupo:    'Finalizados',
    labelBadge:    'Finalizado',
    stripe:        'border-l-emerald-400',
    bgGradient:    'from-emerald-50/50',
    badge:         'bg-emerald-100 text-emerald-800 ring-emerald-200',
    groupHeaderCls:'text-emerald-700 bg-emerald-50 border-emerald-200',
    groupDotCls:   'bg-emerald-500',
    bannerBg:      null,
    bannerText:    null,
    timelineColor: 'bg-emerald-500',
  },
}

// Compat: usado por vista cliente (pills dentro de cards en pestaña "En proceso")
export const SUB_ESTADO_EN_PROCESO = {
  en_progreso: {
    pill: 'bg-white border border-orange-300 text-orange-700',
    dot: 'bg-orange-500 animate-pulse',
    labelCliente: 'Trabajo en progreso',
    labelAdmin: 'Trabajo en progreso',
    labelTecnico: 'En curso',
  },
  revision_conformidad: {
    pill: 'bg-purple-100 border border-purple-200 text-purple-700',
    dot: 'bg-purple-500',
    labelCliente: 'En revisión final',
    labelAdmin: 'En revisión final',
    labelTecnico: 'Pend. revisión',
  },
} as const

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
