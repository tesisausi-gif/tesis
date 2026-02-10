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
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  RESUELTO = 'resuelto',
}

export enum EstadoAsignacion {
  PENDIENTE = 'pendiente',
  ACEPTADA = 'aceptada',
  RECHAZADA = 'rechazada',
  EN_CURSO = 'en_curso',
  COMPLETADA = 'completada',
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
  [EstadoIncidente.PENDIENTE]: 'bg-blue-100 text-blue-800',
  [EstadoIncidente.EN_PROCESO]: 'bg-orange-100 text-orange-800',
  [EstadoIncidente.RESUELTO]: 'bg-green-100 text-green-800',
}

// Mapeo de colores para prioridades
export const prioridadColors: Record<NivelPrioridad, string> = {
  [NivelPrioridad.BAJA]: 'bg-green-100 text-green-800',
  [NivelPrioridad.MEDIA]: 'bg-yellow-100 text-yellow-800',
  [NivelPrioridad.ALTA]: 'bg-orange-100 text-orange-800',
  [NivelPrioridad.URGENTE]: 'bg-red-100 text-red-800',
}
