import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getAsignacionesActivas } from '@/features/asignaciones/asignaciones.service'
import { getPresupuestosDeTecnico } from '@/features/presupuestos/presupuestos.service'
import { TrabajosContent } from '@/components/tecnico/trabajos-content.client'

export default async function TecnicoTrabajosPage() {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (!user.id_tecnico) redirect('/login')

  const [asignaciones, presupuestos] = await Promise.all([
    getAsignacionesActivas(),
    getPresupuestosDeTecnico(),
  ])

  // Mapa de id_incidente → estado del presupuesto (si existe)
  const estadoPresupuestoPorIncidente: Record<number, string> = {}
  for (const p of presupuestos) {
    if (p.id_incidente) {
      estadoPresupuestoPorIncidente[p.id_incidente] = p.estado_presupuesto ?? ""
    }
  }

  return <TrabajosContent asignaciones={asignaciones} estadoPresupuestoPorIncidente={estadoPresupuestoPorIncidente} />
}
