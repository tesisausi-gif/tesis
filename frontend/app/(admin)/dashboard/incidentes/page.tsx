import { Suspense } from 'react'
import { getIncidentesForAdmin } from '@/features/incidentes/incidentes.service'
import { getIncidentesPagados } from '@/features/pagos/pagos-tecnicos.service'
import { getVisitasActivasPorIncidentes } from '@/features/visitas/visitas.service'
import { getFranjasParaIncidentes } from '@/features/disponibilidad/disponibilidad.service'
import { IncidentesAdminContent } from '@/components/admin/incidentes-content.client'

export default async function IncidentesAdminPage() {
  const [incidentes, incidentesPagadosIds] = await Promise.all([
    getIncidentesForAdmin(),
    getIncidentesPagados(),
  ])

  const ids = incidentes.map(i => i.id_incidente)
  const [visitasActivas, franjasPorIncidente] = await Promise.all([
    getVisitasActivasPorIncidentes(ids),
    getFranjasParaIncidentes(ids),
  ])

  const incidentesConVisitas = incidentes.map(i => ({
    ...i,
    visita_activa:        visitasActivas[i.id_incidente] ?? null,
    tiene_disponibilidad: (franjasPorIncidente[i.id_incidente]?.length ?? 0) > 0,
  }))

  return (
    <Suspense>
      <IncidentesAdminContent incidentes={incidentesConVisitas} incidentesPagadosIds={incidentesPagadosIds} />
    </Suspense>
  )
}
