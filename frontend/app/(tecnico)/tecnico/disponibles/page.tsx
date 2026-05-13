import { getAsignacionesPendientes } from '@/features/asignaciones/asignaciones.service'
import { getFranjasParaIncidentes } from '@/features/disponibilidad/disponibilidad.service'
import { DisponiblesContent } from '@/components/tecnico/disponibles-content.client'

export default async function IncidentesDisponiblesPage() {
  const asignaciones = await getAsignacionesPendientes()
  const ids = asignaciones.map(a => a.id_incidente)
  const franjasPorIncidente = await getFranjasParaIncidentes(ids)
  return <DisponiblesContent asignaciones={asignaciones} franjasPorIncidente={franjasPorIncidente} />
}
