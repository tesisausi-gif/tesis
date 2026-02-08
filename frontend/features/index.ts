/**
 * Features - Módulos de dominio
 *
 * Cada feature contiene SOLO 2 archivos:
 * - types.ts: Tipos del dominio (interfaces, DTOs)
 * - service.ts: Queries para Server Components (SOLO LECTURA)
 *
 * Las ESCRITURAS (insert, update, delete) se hacen directo
 * desde los componentes cliente usando Supabase client.
 *
 * Estructura:
 * features/
 * ├── auth/           # Autenticación (getCurrentUser, requireAdmin)
 * ├── incidentes/     # Incidentes reportados
 * ├── asignaciones/   # Asignaciones de técnicos
 * ├── inmuebles/      # Propiedades de clientes
 * └── usuarios/       # Usuarios, clientes y técnicos
 *
 * USO:
 * import { getCurrentUser, requireAdmin } from '@/features/auth'
 * import { getIncidentesForAdmin, Incidente } from '@/features/incidentes'
 * import { getAsignacionesPendientes } from '@/features/asignaciones'
 */

// No re-exportamos todo para evitar colisiones de nombres
// Usar imports directos: import { ... } from '@/features/nombreFeature'
