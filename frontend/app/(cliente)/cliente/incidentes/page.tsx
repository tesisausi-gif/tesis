import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth'
import { getIncidentesByCurrentUser } from '@/features/incidentes'
import { IncidentesContent } from '@/components/cliente/incidentes-content.client'

export default async function ClienteIncidentesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.id_cliente) {
    redirect('/login')
  }

  const incidentes = await getIncidentesByCurrentUser()

  return <IncidentesContent incidentes={incidentes} />
}
