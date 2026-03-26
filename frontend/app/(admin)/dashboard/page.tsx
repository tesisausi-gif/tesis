import { getDashboardStats, getDashboardActividad } from '@/features/incidentes/incidentes.service'
import { getNotificacionesAdmin } from '@/features/notificaciones/notificaciones-inapp.service'
import { DashboardContent } from '@/components/admin/dashboard-content.client'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [stats, actividad, notificaciones] = await Promise.all([
    getDashboardStats(),
    getDashboardActividad(),
    getNotificacionesAdmin().catch(() => []),
  ])

  return (
    <DashboardContent
      stats={stats}
      incidentesRecientes={actividad.incidentesRecientes as any}
      asignacionesRecientes={actividad.asignacionesRecientes as any}
      notificaciones={notificaciones}
    />
  )
}
