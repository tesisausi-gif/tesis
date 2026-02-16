import { getIncidentesForAdmin } from '@/features/incidentes/incidentes.service'
import { IncidentesAdminContent } from '@/components/admin/incidentes-content.client'

export default async function IncidentesAdminPage() {
  const incidentes = await getIncidentesForAdmin()
  return <IncidentesAdminContent incidentes={incidentes} />
}
