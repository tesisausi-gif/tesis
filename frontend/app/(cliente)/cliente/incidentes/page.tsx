import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getIncidentesByCurrentUser } from '@/features/incidentes/incidentes.service'
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
