/**
 * Tipos de Autenticación
 */

// Usuario autenticado actual
export interface UsuarioActual {
  id: string
  nombre: string
  apellido: string
  rol: string
  id_cliente: number | null
  id_tecnico: number | null
  esta_activo: boolean
  fecha_creacion: string
  email: string
}
