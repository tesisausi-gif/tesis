'use client'

import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'

interface Props {
  notificaciones: Notificacion[]
}

export function NotificacionesAdminContent({ notificaciones }: Props) {
  return (
    <div className="px-6 py-6 max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Alertas del sistema que requieren tu atención</p>
      </div>
      <NotificacionesPanel notificaciones={notificaciones} rol="admin" />
    </div>
  )
}
