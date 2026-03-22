import { getNotificacionesTecnico } from '@/features/notificaciones/notificaciones-inapp.service'
import { NotificacionesTecnicoContent } from '@/components/tecnico/notificaciones-content.client'

export const dynamic = 'force-dynamic'

export default async function TecnicoNotificacionesPage() {
  const notificaciones = await getNotificacionesTecnico().catch(() => [])
  return <NotificacionesTecnicoContent notificaciones={notificaciones} />
}
