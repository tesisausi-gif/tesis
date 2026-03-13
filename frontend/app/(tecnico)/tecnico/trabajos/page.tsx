import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getAsignacionesActivas } from '@/features/asignaciones/asignaciones.service'
import { getPresupuestosDeTecnico } from '@/features/presupuestos/presupuestos.service'
import { getConformidadesPorIncidentes } from '@/features/conformidades/conformidades.service'
import { TrabajosContent } from '@/components/tecnico/trabajos-content.client'

export default async function TecnicoTrabajosPage() {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (!user.id_tecnico) redirect('/login')

  const [asignaciones, presupuestos] = await Promise.all([
    getAsignacionesActivas(),
    getPresupuestosDeTecnico(),
  ])

  // Mapa de id_incidente → estado del presupuesto
  const estadoPresupuestoPorIncidente: Record<number, string> = {}
  for (const p of presupuestos) {
    if (p.id_incidente) {
      estadoPresupuestoPorIncidente[p.id_incidente] = p.estado_presupuesto ?? ''
    }
  }

  // Conformidades de los incidentes activos
  const idIncidentes = asignaciones.map(a => a.id_incidente).filter(Boolean) as number[]
  const conformidades = await getConformidadesPorIncidentes(idIncidentes)

  const conformidadesPorIncidente: Record<number, { id_conformidad: number; id_incidente: number; esta_firmada: number | boolean; url_documento: string | null }> = {}
  for (const c of conformidades) {
    conformidadesPorIncidente[c.id_incidente] = c
  }

  return (
    <TrabajosContent
      asignaciones={asignaciones}
      estadoPresupuestoPorIncidente={estadoPresupuestoPorIncidente}
      conformidadesPorIncidente={conformidadesPorIncidente}
    />
  )
}
