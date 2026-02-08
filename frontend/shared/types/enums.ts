// Enumeraciones y constantes del sistema

export enum TipoCliente {
  PROPIETARIO = 'Propietario',
  INQUILINO = 'Inquilino',
  TERCERO = 'Tercero',
}

export enum TipoPropiedad {
  DEPARTAMENTO = 'Departamento',
  CASA = 'Casa',
  LOCAL = 'Local',
  OFICINA = 'Oficina',
}

export enum CategoriaIncidente {
  PLOMERIA = 'Plomería',
  ELECTRICIDAD = 'Electricidad',
  ALBANILERIA = 'Albañilería',
  PINTURA = 'Pintura',
  CARPINTERIA = 'Carpintería',
  HERRERIA = 'Herrería',
  OTROS = 'Otros',
}

export enum NivelPrioridad {
  BAJA = 'Baja',
  MEDIA = 'Media',
  ALTA = 'Alta',
  URGENTE = 'Urgente',
}

export enum EstadoIncidente {
  REPORTADO = 'Reportado',
  EN_EVALUACION = 'En Evaluación',
  ASIGNADO = 'Asignado',
  EN_PROCESO = 'En Proceso',
  ESPERANDO_APROBACION = 'Esperando Aprobación',
  APROBADO = 'Aprobado',
  EN_EJECUCION = 'En Ejecución',
  FINALIZADO = 'Finalizado',
  CERRADO = 'Cerrado',
  CANCELADO = 'Cancelado',
}

export enum EstadoAsignacion {
  PENDIENTE = 'Pendiente',
  ACEPTADA = 'Aceptada',
  RECHAZADA = 'Rechazada',
  EN_CURSO = 'En Curso',
  COMPLETADA = 'Completada',
}

export enum EstadoPresupuesto {
  BORRADOR = 'Borrador',
  ENVIADO = 'Enviado',
  APROBADO_ADMIN = 'Aprobado Admin',
  APROBADO = 'Aprobado',
  RECHAZADO = 'Rechazado',
  VENCIDO = 'Vencido',
}

export enum TipoPago {
  ADELANTO = 'Adelanto',
  PARCIAL = 'Parcial',
  TOTAL = 'Total',
  REEMBOLSO = 'Reembolso',
}

export enum MetodoPago {
  EFECTIVO = 'Efectivo',
  TRANSFERENCIA = 'Transferencia',
  TARJETA = 'Tarjeta',
  CHEQUE = 'Cheque',
}

export enum TipoDocumento {
  FOTO = 'Foto',
  PRESUPUESTO = 'Presupuesto',
  FACTURA = 'Factura',
  COMPROBANTE = 'Comprobante',
  CONFORMIDAD = 'Conformidad',
  OTRO = 'Otro',
}

export enum TipoCalificacion {
  SERVICIO = 'Servicio',
  CALIDAD = 'Calidad',
  PUNTUALIDAD = 'Puntualidad',
  GENERAL = 'General',
}

export enum UserRole {
  ADMIN = 'admin',
  GESTOR = 'gestor',
  TECNICO = 'tecnico',
  CLIENTE = 'cliente',
}

// Mapeo de colores para estados de incidentes
export const estadoIncidenteColors: Record<EstadoIncidente, string> = {
  [EstadoIncidente.REPORTADO]: 'bg-blue-100 text-blue-800',
  [EstadoIncidente.EN_EVALUACION]: 'bg-yellow-100 text-yellow-800',
  [EstadoIncidente.ASIGNADO]: 'bg-purple-100 text-purple-800',
  [EstadoIncidente.EN_PROCESO]: 'bg-orange-100 text-orange-800',
  [EstadoIncidente.ESPERANDO_APROBACION]: 'bg-amber-100 text-amber-800',
  [EstadoIncidente.APROBADO]: 'bg-cyan-100 text-cyan-800',
  [EstadoIncidente.EN_EJECUCION]: 'bg-indigo-100 text-indigo-800',
  [EstadoIncidente.FINALIZADO]: 'bg-green-100 text-green-800',
  [EstadoIncidente.CERRADO]: 'bg-gray-100 text-gray-800',
  [EstadoIncidente.CANCELADO]: 'bg-red-100 text-red-800',
}

// Mapeo de colores para prioridades
export const prioridadColors: Record<NivelPrioridad, string> = {
  [NivelPrioridad.BAJA]: 'bg-green-100 text-green-800',
  [NivelPrioridad.MEDIA]: 'bg-yellow-100 text-yellow-800',
  [NivelPrioridad.ALTA]: 'bg-orange-100 text-orange-800',
  [NivelPrioridad.URGENTE]: 'bg-red-100 text-red-800',
}
