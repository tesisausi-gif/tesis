'use client'

import { useState } from 'react'
import { NotificacionesPanel } from '@/components/shared/notificaciones-panel.client'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'

interface Props {
  notificaciones: Notificacion[]
}

export function NotificacionesTecnicoContent({ notificaciones }: Props) {
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleClick = (n: Notificacion) => {
    if (n.id_incidente) {
      setIncidenteSeleccionado(n.id_incidente)
      setModalOpen(true)
    }
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Alertas y novedades de tus incidentes</p>
      </div>

      <NotificacionesPanel
        notificaciones={notificaciones}
        rol="tecnico"
        onNotificacionClick={handleClick}
      />

      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="tecnico"
      />
    </div>
  )
}
