import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getIncidentesByCurrentUser } from '@/features/incidentes/incidentes.service'
import { getIncidentesConPresupuestoPendiente } from '@/features/presupuestos/presupuestos.service'
import { getIncidentesConConformidadSubida } from '@/features/conformidades/conformidades.service'
import { IncidentesContent } from '@/components/cliente/incidentes-content.client'

export const dynamic = 'force-dynamic'

export default async function ClienteIncidentesPage() {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (!user.id_cliente) redirect('/login')

  const incidentes = await getIncidentesByCurrentUser()
  const idsEnProceso = incidentes
    .filter(i => i.estado_actual === 'en_proceso')
    .map(i => i.id_incidente)

  const [conPresupuestoPendiente, conConformidadSubida] = await Promise.all([
    getIncidentesConPresupuestoPendiente().catch(() => []),
    getIncidentesConConformidadSubida(idsEnProceso).catch(() => []),
  ])

  return (
    <IncidentesContent
      incidentes={incidentes}
      incidentesConPresupuestoPendiente={conPresupuestoPendiente}
      incidentesConConformidadSubida={conConformidadSubida}
    />
  )
}
