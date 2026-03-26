import { getNotificacionesCliente } from '@/features/notificaciones/notificaciones-inapp.service'
import { NotificacionesClienteContent } from '@/components/cliente/notificaciones-content.client'

export const dynamic = 'force-dynamic'

export default async function ClienteNotificacionesPage() {
  const notificaciones = await getNotificacionesCliente().catch(() => [])
  return <NotificacionesClienteContent notificaciones={notificaciones} />
}
