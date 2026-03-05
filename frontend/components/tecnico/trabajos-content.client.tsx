'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MapPin, Calendar, ClipboardList, Clock, CheckCircle2, FileSignature, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  getEstadoAsignacionColor,
  getEstadoAsignacionLabel,
  getPrioridadColor,
} from '@/shared/utils/colors'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { AsignacionTecnico } from '@/features/asignaciones/asignaciones.types'
import { completarAsignacion } from '@/features/asignaciones/asignaciones.service'
import { crearAvance } from '@/features/avances/avances.service'
import { crearConformidadPorTecnico } from '@/features/conformidades/conformidades.service'

interface TrabajosContentProps {
  asignaciones: AsignacionTecnico[]
  estadoPresupuestoPorIncidente: Record<number, string>
}

export function TrabajosContent({ asignaciones, estadoPresupuestoPorIncidente }: TrabajosContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Dialog: Registrar avance
  const [avanceDialog, setAvanceDialog] = useState<{ open: boolean; idAsignacion: number; idIncidente: number } | null>(null)
  const [avanceDesc, setAvanceDesc] = useState('')
  const [avancePct, setAvancePct] = useState('')

  // Dialog: Completar trabajo
  const [completarDialog, setCompletarDialog] = useState<{ open: boolean; idAsignacion: number } | null>(null)

  // Dialog: Crear conformidad
  const [conformidadDialog, setConformidadDialog] = useState<{ open: boolean; idIncidente: number } | null>(null)

  const abrirModal = (id: number) => {
    setIncidenteSeleccionado(id)
    setModalOpen(true)
  }

  const handleCompletar = () => {
    if (!completarDialog) return
    startTransition(async () => {
      const res = await completarAsignacion(completarDialog.idAsignacion)
      if (res.success) {
        toast.success('Trabajo marcado como completado')
        setCompletarDialog(null)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al completar')
      }
    })
  }

  const handleAvance = () => {
    if (!avanceDialog || !avanceDesc.trim()) return
    startTransition(async () => {
      const res = await crearAvance({
        id_incidente: avanceDialog.idIncidente,
        descripcion_avance: avanceDesc.trim(),
        porcentaje_completado: avancePct ? parseInt(avancePct) : null,
      })
      if (res.success) {
        toast.success('Avance registrado')
        setAvanceDialog(null)
        setAvanceDesc('')
        setAvancePct('')
      } else {
        toast.error(res.error ?? 'Error al registrar avance')
      }
    })
  }

  const handleConformidad = () => {
    if (!conformidadDialog) return
    startTransition(async () => {
      const res = await crearConformidadPorTecnico(conformidadDialog.idIncidente)
      if (res.success) {
        toast.success('Conformidad creada. El cliente recibirá una notificación para firmarla.')
        setConformidadDialog(null)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al crear conformidad')
      }
    })
  }

  // Stats
  const totalTrabajos = asignaciones.length
  const aceptados = asignaciones.filter(a => a.estado_asignacion === 'aceptada').length
  const enCurso = asignaciones.filter(a => a.estado_asignacion === 'en_curso').length
  const completados = asignaciones.filter(a => a.estado_asignacion === 'completada').length

  return (
    <div className="space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Trabajos</h1>
        <p className="text-gray-600 text-sm mt-1">Trabajos asignados y su estado</p>
      </div>

      {asignaciones.length > 0 && (
        <div className="grid gap-3 grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-blue-700">{totalTrabajos}</div>
              <p className="text-xs text-blue-600">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-blue-700">{aceptados}</div>
              <p className="text-xs text-blue-600">Aceptados</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-orange-700">{enCurso}</div>
              <p className="text-xs text-orange-600">En Curso</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-green-700">{completados}</div>
              <p className="text-xs text-green-600">Completados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {asignaciones.length > 0 ? (
        <div className="space-y-3">
          {asignaciones.map((asignacion) => {
            const incidente = asignacion.incidentes
            const inmueble = incidente?.inmuebles

            const direccionPartes = inmueble
              ? [inmueble.calle, inmueble.altura, inmueble.piso && `Piso ${inmueble.piso}`, inmueble.dpto && `Dpto ${inmueble.dpto}`].filter(Boolean).join(' ')
              : ''
            const ubicacion = inmueble ? [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ') : ''
            const direccion = ubicacion ? `${direccionPartes}, ${ubicacion}` : direccionPartes || 'Sin dirección'

            const estado = asignacion.estado_asignacion
            const estadoPres = estadoPresupuestoPorIncidente[asignacion.id_incidente]
            const presupuestoAprobado = estadoPres === 'aprobado'
            const enTrabajo = (estado === 'aceptada' || estado === 'en_curso') && presupuestoAprobado
            const terminado = estado === 'completada'

            return (
              <Card key={asignacion.id_asignacion} className="hover:shadow-md transition-shadow">
                {/* Zona clickable para abrir modal */}
                <div className="cursor-pointer" onClick={() => abrirModal(asignacion.id_incidente)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          Incidente #{asignacion.id_incidente}
                        </CardTitle>
                        {direccion && (
                          <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{direccion}</span>
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end flex-shrink-0">
                        <Badge variant="outline" className={getEstadoAsignacionColor(estado)}>
                          {getEstadoAsignacionLabel(estado)}
                        </Badge>
                        {incidente?.nivel_prioridad && (
                          <Badge variant="outline" className={getPrioridadColor(incidente.nivel_prioridad)}>
                            {incidente.nivel_prioridad}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 space-y-2">
                    {incidente?.descripcion_problema && (
                      <p className="text-sm text-gray-700 line-clamp-2">{incidente.descripcion_problema}</p>
                    )}
                    {incidente?.clientes && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>Cliente: {incidente.clientes.nombre} {incidente.clientes.apellido}</span>
                        {incidente.clientes.telefono && <span>• Tel: {incidente.clientes.telefono}</span>}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(asignacion.fecha_asignacion), 'dd/MM/yy', { locale: es })}
                      </span>
                      {asignacion.fecha_visita_programada && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Clock className="h-3 w-3" />
                          Visita: {format(new Date(asignacion.fecha_visita_programada), 'dd/MM HH:mm', { locale: es })}
                        </span>
                      )}
                      {incidente?.categoria && <span>{incidente.categoria}</span>}
                    </div>
                  </CardContent>
                </div>

                {/* Botones de acción (no abren el modal) */}
                {(enTrabajo || terminado) && (
                  <div
                    className="px-6 pb-4 flex flex-wrap gap-2 border-t pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {enTrabajo && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                          onClick={() => {
                            setAvanceDesc('')
                            setAvancePct('')
                            setAvanceDialog({ open: true, idAsignacion: asignacion.id_asignacion, idIncidente: asignacion.id_incidente })
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          Registrar Avance
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => setCompletarDialog({ open: true, idAsignacion: asignacion.id_asignacion })}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Completar Trabajo
                        </Button>
                      </>
                    )}
                    {terminado && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-purple-700 border-purple-300 hover:bg-purple-50"
                        onClick={() => setConformidadDialog({ open: true, idIncidente: asignacion.id_incidente })}
                      >
                        <FileSignature className="h-3 w-3" />
                        Enviar Conformidad al Cliente
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-slate-200 p-4 mb-6">
              <ClipboardList className="h-12 w-12 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes trabajos asignados</h3>
            <p className="text-sm text-gray-600 max-w-md">Cuando te asignen un nuevo trabajo, aparecerá aquí.</p>
          </CardContent>
        </Card>
      )}

      {/* Modal detalle incidente */}
      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="tecnico"
      />

      {/* Dialog: Registrar Avance */}
      <Dialog open={avanceDialog?.open ?? false} onOpenChange={(o) => !o && setAvanceDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Avance</DialogTitle>
            <DialogDescription>Describe el progreso realizado en el trabajo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="avance-desc">Descripción del avance *</Label>
              <Textarea
                id="avance-desc"
                value={avanceDesc}
                onChange={(e) => setAvanceDesc(e.target.value)}
                placeholder="Describe qué trabajo se realizó..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avance-pct">Porcentaje completado (opcional)</Label>
              <input
                id="avance-pct"
                type="number"
                min={0}
                max={100}
                value={avancePct}
                onChange={(e) => setAvancePct(e.target.value)}
                placeholder="0-100"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvanceDialog(null)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleAvance} disabled={isPending || !avanceDesc.trim()}>
              {isPending ? 'Guardando...' : 'Guardar Avance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Completar Trabajo */}
      <Dialog open={completarDialog?.open ?? false} onOpenChange={(o) => !o && setCompletarDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Trabajo</DialogTitle>
            <DialogDescription>
              ¿Confirmas que el trabajo fue finalizado? El estado de la asignación pasará a "Completada".
              Después podrás enviar la conformidad al cliente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletarDialog(null)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleCompletar} disabled={isPending}>
              {isPending ? 'Procesando...' : 'Sí, completar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear Conformidad */}
      <Dialog open={conformidadDialog?.open ?? false} onOpenChange={(o) => !o && setConformidadDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Conformidad al Cliente</DialogTitle>
            <DialogDescription>
              Se creará una conformidad final. El cliente recibirá una notificación por email para firmarla.
              Una vez firmada, el administrador podrá cerrar el incidente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConformidadDialog(null)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleConformidad} disabled={isPending}>
              {isPending ? 'Enviando...' : 'Enviar Conformidad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
