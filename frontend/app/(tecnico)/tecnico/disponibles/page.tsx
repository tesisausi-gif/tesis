import { getAsignacionesPendientes } from '@/features/asignaciones/asignaciones.service'
import { DisponiblesContent } from '@/components/tecnico/disponibles-content.client'

export default async function IncidentesDisponiblesPage() {
  const asignaciones = await getAsignacionesPendientes()
  return <DisponiblesContent asignaciones={asignaciones} />
}
