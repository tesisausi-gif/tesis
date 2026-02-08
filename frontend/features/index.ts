/**
 * Features - Módulos de dominio
 *
 * Cada feature contiene:
 * - types: Tipos del dominio
 * - repository: Queries a Supabase
 * - service: Lógica para Server Components
 * - actions: Server Actions para mutaciones (si aplica)
 *
 * Estructura por feature:
 * features/
 * ├── incidentes/     # Incidentes reportados
 * ├── asignaciones/   # Asignaciones de técnicos
 * ├── inmuebles/      # Propiedades de clientes
 * ├── usuarios/       # Usuarios, clientes y técnicos
 * └── auth/           # Autenticación y autorización
 *
 * USO: Importar directamente desde cada feature
 *
 * import { getCurrentUser, requireAdmin } from '@/features/auth'
 * import { getIncidentesForAdmin, Incidente } from '@/features/incidentes'
 * import { getAsignacionesPendientes } from '@/features/asignaciones'
 * import { getInmueblesByCurrentUser } from '@/features/inmuebles'
 * import { getClientes, getTecnicos } from '@/features/usuarios'
 */

// No re-exportamos todo para evitar colisiones de nombres
// Usar imports directos: import { ... } from '@/features/nombreFeature'
