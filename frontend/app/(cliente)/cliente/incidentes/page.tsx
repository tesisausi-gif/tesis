import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getIncidentesByCurrentUser } from '@/features/incidentes/incidentes.service'
import { getIncidentesConPresupuestoPendiente } from '@/features/presupuestos/presupuestos.service'
import { IncidentesContent } from '@/components/cliente/incidentes-content.client'

export const dynamic = 'force-dynamic'

export default async function ClienteIncidentesPage() {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (!user.id_cliente) redirect('/login')

  const [incidentes, conPresupuestoPendiente] = await Promise.all([
    getIncidentesByCurrentUser(),
    getIncidentesConPresupuestoPendiente().catch(() => []),
  ])

  return <IncidentesContent incidentes={incidentes} incidentesConPresupuestoPendiente={conPresupuestoPendiente} />
}
