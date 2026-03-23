import { Suspense } from 'react'
import { getIncidentesForAdmin } from '@/features/incidentes/incidentes.service'
import { IncidentesAdminContent } from '@/components/admin/incidentes-content.client'
import type { IncidenteConClienteAdmin } from '@/features/incidentes/incidentes.types'

export default async function IncidentesAdminPage() {
  const incidentes = await getIncidentesForAdmin()
  return (
    <Suspense>
      <IncidentesAdminContent incidentes={incidentes} />
    </Suspense>
  )
}
