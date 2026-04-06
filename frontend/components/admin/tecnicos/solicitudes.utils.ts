import type { SolicitudRegistro } from '@/features/usuarios/usuarios.types'

export function getEstadoSolicitudColor(estado: string): string {
  const colors: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    aprobada: 'bg-green-100 text-green-800',
    rechazada: 'bg-red-100 text-red-800',
  }
  return colors[estado] ?? 'bg-gray-100 text-gray-800'
}

export function resolverEspecialidades(
  sol: Pick<SolicitudRegistro, 'especialidades' | 'especialidad'>
): string[] {
  return sol.especialidades?.length
    ? sol.especialidades
    : sol.especialidad ? [sol.especialidad] : []
}
