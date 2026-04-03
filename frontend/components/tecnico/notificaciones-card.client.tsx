'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, XCircle, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { marcarNotificacionLeida } from '@/features/notificaciones/notificaciones-inapp.service'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'

interface Props {
  notificaciones: Notificacion[]
}

export function NotificacionesCard({ notificaciones: inicial }: Props) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(inicial)
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [, startTransition] = useTransition()

  const abrirIncidente = (id: number) => {
    setIncidenteSeleccionado(id)
    setModalOpen(true)
  }

  const descartar = (e: React.MouseEvent, idNotificacion: number) => {
    e.stopPropagation()
    setNotificaciones(prev => prev.filter(n => n.id_notificacion !== idNotificacion))
    startTransition(async () => {
      const result = await marcarNotificacionLeida(idNotificacion)
      if (!result.success) toast.error('No se pudo descartar la notificación')
    })
  }

  return (
    <>
      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Notificaciones
            {notificaciones.length > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                {notificaciones.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notificaciones.length > 0 ? (
            <div className="space-y-3">
              {notificaciones.map(n => (
                <div
                  key={n.id_notificacion}
                  onClick={() => n.id_incidente && abrirIncidente(n.id_incidente)}
                  className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 cursor-pointer hover:bg-red-100 transition-colors"
                >
                  <XCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-800">{n.titulo}</p>
                    <p className="text-xs text-red-700 mt-0.5">{n.mensaje}</p>
                    {n.id_incidente && (
                      <p className="text-xs text-red-600 mt-0.5">Incidente #{n.id_incidente} — tocá para ver detalles</p>
                    )}
                    <p className="text-xs text-red-500 mt-1">
                      {n.fecha_creacion ? format(new Date(n.fecha_creacion), "dd 'de' MMM, HH:mm", { locale: es }) : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => descartar(e, n.id_notificacion)}
                    className="shrink-0 p-1 rounded hover:bg-red-200 transition-colors text-red-400 hover:text-red-600"
                    title="Descartar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No tenés notificaciones pendientes
            </p>
          )}
        </CardContent>
      </Card>

      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="tecnico"
      />
    </>
  )
}
