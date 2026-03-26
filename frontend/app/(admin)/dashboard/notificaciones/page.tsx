import { getNotificacionesAdmin } from '@/features/notificaciones/notificaciones-inapp.service'
import { NotificacionesAdminContent } from '@/components/admin/notificaciones-content.client'

export const dynamic = 'force-dynamic'

export default async function AdminNotificacionesPage() {
  const notificaciones = await getNotificacionesAdmin().catch(() => [])
  return <NotificacionesAdminContent notificaciones={notificaciones} />
}
