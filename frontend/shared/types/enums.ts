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
  BORRADOR = 'borrador',
  ENVIADO = 'enviado',
  APROBADO_ADMIN = 'aprobado_admin',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  VENCIDO = 'vencido',
}

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

// Mapeos visuales movidos a @/shared/utils/colors.ts para evitar redundancias
