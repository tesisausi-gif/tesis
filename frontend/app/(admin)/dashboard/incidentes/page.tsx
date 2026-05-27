import { Suspense } from 'react'
import { getIncidentesForAdmin } from '@/features/incidentes/incidentes.service'
import { getIncidentesPagados } from '@/features/pagos/pagos-tecnicos.service'
import { IncidentesAdminContent } from '@/components/admin/incidentes-content.client'

export default async function IncidentesAdminPage() {
  const [incidentes, incidentesPagadosIds] = await Promise.all([
    getIncidentesForAdmin(),
    getIncidentesPagados(),
  ])
  return (
    <Suspense>
      <IncidentesAdminContent incidentes={incidentes} incidentesPagadosIds={incidentesPagadosIds} />
    </Suspense>
  )
}
