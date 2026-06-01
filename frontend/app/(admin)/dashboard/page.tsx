import { getDashboardStats } from '@/features/incidentes/incidentes.service'
import { getNotificacionesAdmin } from '@/features/notificaciones/notificaciones-inapp.service'
import { DashboardContent } from '@/components/admin/dashboard-content.client'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [stats, notificaciones] = await Promise.all([
    getDashboardStats(),
    getNotificacionesAdmin().catch(() => []),
  ])

  return (
    <DashboardContent
      stats={stats}
      notificaciones={notificaciones}
    />
  )
}
