'use client'

import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

interface Props {
  notificaciones: Notificacion[]
}

export function NotificacionesAdminContent({ notificaciones }: Props) {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Notificaciones" subtitle="Alertas del sistema que requieren tu atención" />
      <div className="max-w-2xl">
        <NotificacionesPanel notificaciones={notificaciones} rol="admin" />
      </div>
    </div>
  )
}
