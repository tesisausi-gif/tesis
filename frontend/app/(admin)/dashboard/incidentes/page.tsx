import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getIncidentesForAdmin } from '@/features/incidentes/incidentes.service'
import { IncidentesAdminContent } from '@/components/admin/incidentes-content.client'

export default async function IncidentesAdminPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.rol !== 'admin' && user.rol !== 'gestor') {
    redirect('/login')
  }

  const incidentes = await getIncidentesForAdmin()

  return <IncidentesAdminContent incidentes={incidentes} />
}
