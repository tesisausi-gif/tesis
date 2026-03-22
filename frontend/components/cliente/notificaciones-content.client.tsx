'use client'

import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'

interface Props {
  notificaciones: Notificacion[]
}

export function NotificacionesClienteContent({ notificaciones }: Props) {
  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Novedades sobre tus incidentes y presupuestos</p>
      </div>
      <NotificacionesPanel notificaciones={notificaciones} rol="cliente" />
    </div>
  )
}
