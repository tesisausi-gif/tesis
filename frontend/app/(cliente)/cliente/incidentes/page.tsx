import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getIncidentesByCurrentUser } from '@/features/incidentes/incidentes.service'
import { getIncidentesConPresupuestoPendiente, getIncidentesConAlgunPresupuesto } from '@/features/presupuestos/presupuestos.service'
import { getIncidentesConConformidadSubida } from '@/features/conformidades/conformidades.service'
import {
  getIncidentesQueNecesitanDisponibilidadReparacion,
  getIncidentesNecesitanNuevaDisponibilidadInspeccion,
  procesarDisponibilidadVencida,
} from '@/features/disponibilidad/disponibilidad.service'
import { getVisitasActivasPorIncidentes, processarVisitasVencidas } from '@/features/visitas/visitas.service'
import { IncidentesContent } from '@/components/cliente/incidentes-content.client'

export const dynamic = 'force-dynamic'

export default async function ClienteIncidentesPage() {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (!user.id_cliente) redirect('/login')

  // Procesamiento idempotente — silencioso
  void processarVisitasVencidas()
  void procesarDisponibilidadVencida()

  const incidentes = await getIncidentesByCurrentUser()
  const idsEnProceso = incidentes
    .filter(i => i.estado_actual === 'en_proceso')
    .map(i => i.id_incidente)

  const idsActivos = incidentes
    .filter(i => i.estado_actual !== 'cancelado' && i.estado_actual !== 'finalizado')
    .map(i => i.id_incidente)

  const [conPresupuestoPendiente, conConformidadSubida, necesitenDisponibilidadReparacion, visitasPorIncidente, conAlgunPresupuesto, necesitenNuevaDisponibilidadInspeccion] = await Promise.all([
    getIncidentesConPresupuestoPendiente().catch(() => []),
    getIncidentesConConformidadSubida(idsEnProceso).catch(() => []),
    getIncidentesQueNecesitanDisponibilidadReparacion(idsEnProceso).catch(() => []),
    getVisitasActivasPorIncidentes(idsActivos).catch(() => ({})),
    getIncidentesConAlgunPresupuesto(idsEnProceso).catch(() => []),
    getIncidentesNecesitanNuevaDisponibilidadInspeccion(idsActivos).catch(() => []),
  ])

  return (
    <IncidentesContent
      incidentes={incidentes}
      incidentesConPresupuestoPendiente={conPresupuestoPendiente}
      incidentesConConformidadSubida={conConformidadSubida}
      incidentesNecesitanDisponibilidadReparacion={necesitenDisponibilidadReparacion}
      visitasPorIncidente={visitasPorIncidente}
      incidentesConAlgunPresupuesto={conAlgunPresupuesto}
      incidentesNecesitanNuevaDisponibilidadInspeccion={necesitenNuevaDisponibilidadInspeccion}
    />
  )
}
