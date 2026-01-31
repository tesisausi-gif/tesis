/**
 * Servicios de datos
 *
 * Centraliza todas las queries de Supabase para:
 * - Reutilización de código
 * - Tipado consistente
 * - Facilitar testing
 * - Reducir duplicación
 *
 * Uso:
 * import { getIncidentes, createIncidente } from '@/lib/services'
 * import { getIncidentesByCliente } from '@/lib/services/incidentes'
 */

// Incidentes
export {
  type Incidente,
  type IncidenteConDetalles,
  getIncidentes,
  getIncidentesByCliente,
  getIncidentesByTecnico,
  getIncidenteById,
  createIncidente,
  updateIncidente,
  updateIncidenteEstado,
} from './incidentes'

// Asignaciones
export {
  type Asignacion,
  getAsignaciones,
  getAsignacionesPendientes,
  getAsignacionesActivas,
  createAsignacion,
  aceptarAsignacion,
  rechazarAsignacion,
  updateAsignacionEstado,
} from './asignaciones'

// Usuarios, Clientes y Técnicos
export {
  type Usuario,
  type Cliente,
  type Tecnico,
  getCurrentUser,
  getUsuarios,
  getClientes,
  getTecnicos,
  getTecnicosActivos,
  getClienteById,
  getTecnicoById,
  toggleUsuarioActivo,
  toggleClienteActivo,
  toggleTecnicoActivo,
} from './usuarios'

// Inmuebles
export {
  type Inmueble,
  type TipoInmueble,
  getInmuebles,
  getInmueblesByCliente,
  getInmuebleById,
  getTiposInmuebles,
  createInmueble,
  updateInmueble,
  toggleInmuebleActivo,
} from './inmuebles'
