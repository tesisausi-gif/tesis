'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Hash,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
} from 'lucide-react'
import type { SolicitudRegistro } from '@/features/usuarios/usuarios.types'
import { getEstadoSolicitudColor, resolverEspecialidades } from './solicitudes.utils'

interface SolicitudDetalleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  solicitud: SolicitudRegistro | null
  onAprobar: () => Promise<void>
  onRechazar: () => Promise<void>
  procesando: boolean
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="flex items-center gap-1.5 text-gray-500 shrink-0">
        {icon}
        {label}
      </span>
      <span className="font-medium text-right text-gray-800">{value}</span>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {icon}
      {title}
    </div>
  )
}

export function SolicitudDetalleModal({
  open,
  onOpenChange,
  solicitud,
  onAprobar,
  onRechazar,
  procesando,
}: SolicitudDetalleModalProps) {
  if (!solicitud) return null

  const especialidades = resolverEspecialidades(solicitud)
  const esPendiente = solicitud.estado_solicitud === 'pendiente'

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Solicitud de técnico</DialogTitle>
          <DialogDescription>
            {solicitud.nombre} {solicitud.apellido} — {solicitud.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Información Personal */}
          <div className="bg-gray-50 rounded-lg p-4">
            <SectionHeader
              icon={<User className="h-3.5 w-3.5" />}
              title="Información Personal"
            />
            <div className="divide-y divide-gray-100">
              <InfoRow
                icon={<User className="h-3.5 w-3.5" />}
                label="Nombre"
                value={`${solicitud.nombre} ${solicitud.apellido}`}
              />
              <InfoRow
                icon={<Mail className="h-3.5 w-3.5" />}
                label="Email"
                value={solicitud.email}
              />
              <InfoRow
                icon={<Phone className="h-3.5 w-3.5" />}
                label="Teléfono"
                value={solicitud.telefono ?? <span className="text-gray-400 italic">No informado</span>}
              />
              <InfoRow
                icon={<Hash className="h-3.5 w-3.5" />}
                label="DNI"
                value={solicitud.dni ?? <span className="text-gray-400 italic">No informado</span>}
              />
              <InfoRow
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Dirección"
                value={solicitud.direccion ?? <span className="text-gray-400 italic">No informada</span>}
              />
            </div>
          </div>

          {/* Especialidades */}
          <div className="bg-gray-50 rounded-lg p-4">
            <SectionHeader
              icon={<Briefcase className="h-3.5 w-3.5" />}
              title="Especialidades"
            />
            {especialidades.length === 0 ? (
              <p className="text-gray-400 italic">No especificadas</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {especialidades.map((esp) => (
                  <Badge key={esp} variant="secondary">
                    {esp}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Estado y Fechas */}
          <div className="bg-gray-50 rounded-lg p-4">
            <SectionHeader
              icon={<Calendar className="h-3.5 w-3.5" />}
              title="Estado y Fechas"
            />
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-gray-500">Estado</span>
                <Badge className={getEstadoSolicitudColor(solicitud.estado_solicitud)}>
                  {solicitud.estado_solicitud}
                </Badge>
              </div>
              <InfoRow
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Fecha de solicitud"
                value={formatFecha(solicitud.fecha_solicitud)}
              />
              {solicitud.fecha_aprobacion && (
                <InfoRow
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label={solicitud.estado_solicitud === 'aprobada' ? 'Fecha de aprobación' : 'Fecha de resolución'}
                  value={formatFecha(solicitud.fecha_aprobacion)}
                />
              )}
            </div>
          </div>

          {/* Nota informativa solo para pendientes */}
          {esPendiente && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
              <span>
                Al aprobar, el sistema generará una contraseña temporal y la enviará por email al técnico.
                En su primer inicio de sesión deberá cambiarla obligatoriamente.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={procesando}
          >
            Cerrar
          </Button>
          {esPendiente && (
            <>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={onRechazar}
                disabled={procesando}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Rechazar
              </Button>
              <Button onClick={onAprobar} disabled={procesando} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {procesando ? 'Aprobando...' : 'Aprobar y crear cuenta'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
