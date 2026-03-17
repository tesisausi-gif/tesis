'use client'

import { useState, useTransition, useRef } from 'react'
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
import {
  MapPin, Calendar, ClipboardList, Clock, CheckCircle2, Upload,
  Plus, ImageIcon, Loader2, Phone, Mail, Home, FileText, Wrench,
} from 'lucide-react'
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
import { crearInspeccion } from '@/features/inspecciones/inspecciones.service'
import { createClient } from '@/shared/lib/supabase/client'

interface ConformidadInfo {
  id_conformidad: number
  id_incidente: number
  esta_firmada: number | boolean
  url_documento: string | null
}

interface TrabajosContentProps {
  asignaciones: AsignacionTecnico[]
  estadoPresupuestoPorIncidente: Record<number, string>
  conformidadesPorIncidente: Record<number, ConformidadInfo>
  idTecnico: number
}

export function TrabajosContent({ asignaciones, estadoPresupuestoPorIncidente, conformidadesPorIncidente, idTecnico }: TrabajosContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Dialog: Registrar avance
  const [avanceDialog, setAvanceDialog] = useState<{ open: boolean; idAsignacion: number; idIncidente: number } | null>(null)
  const [avanceDesc, setAvanceDesc] = useState('')
  const [avancePct, setAvancePct] = useState('')

  // Dialog: Completar trabajo
  const [completarDialog, setCompletarDialog] = useState<{ open: boolean; idAsignacion: number } | null>(null)

  // Dialog: Subir conformidad (foto)
  const [conformidadDialog, setConformidadDialog] = useState<{ open: boolean; idIncidente: number } | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)

  // Dialog: Cargar inspección
  const [inspeccionDialog, setInspeccionDialog] = useState<{ open: boolean; idIncidente: number } | null>(null)
  const [inspeccionDesc, setInspeccionDesc] = useState('')
  const [inspeccionCausas, setInspeccionCausas] = useState('')
  const [loadingInspeccion, setLoadingInspeccion] = useState(false)

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

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const handleSubirConformidad = async () => {
    if (!conformidadDialog || !fotoFile) return
    setUploadingFoto(true)
    try {
      const supabase = createClient()
      const ext = fotoFile.name.split('.').pop() || 'jpg'
      const path = `tecnico/${conformidadDialog.idIncidente}/${Date.now()}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('conformidades')
        .upload(path, fotoFile, { upsert: false })

      if (uploadError) {
        toast.error('Error al subir la foto: ' + uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('conformidades')
        .getPublicUrl(uploadData.path)

      const res = await crearConformidadPorTecnico(conformidadDialog.idIncidente, publicUrl)
      if (res.success) {
        toast.success('Conformidad enviada', { description: 'La administración revisará la foto y te notificará.' })
        setConformidadDialog(null)
        setFotoFile(null)
        setFotoPreview(null)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al enviar conformidad')
      }
    } catch {
      toast.error('Error inesperado al subir la foto')
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleCargarInspeccion = async () => {
    if (!inspeccionDialog || !inspeccionDesc.trim()) return
    if (inspeccionDesc.trim().length < 10) {
      toast.error('La descripción debe tener al menos 10 caracteres')
      return
    }
    setLoadingInspeccion(true)
    try {
      const result = await crearInspeccion({
        id_incidente: inspeccionDialog.idIncidente,
        id_tecnico: idTecnico,
        descripcion_inspeccion: inspeccionDesc.trim(),
        causas_determinadas: inspeccionCausas.trim() || undefined,
      })
      if (result.success) {
        toast.success('Inspección registrada', { description: 'Se ha guardado el reporte de inspección.' })
        setInspeccionDialog(null)
        setInspeccionDesc('')
        setInspeccionCausas('')
        router.refresh()
      } else {
        toast.error('Error', { description: result.error })
      }
    } finally {
      setLoadingInspeccion(false)
    }
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
            const cliente = incidente?.clientes

            const direccionPartes = inmueble
              ? [inmueble.calle, inmueble.altura, inmueble.piso && `Piso ${inmueble.piso}`, inmueble.dpto && `Dpto ${inmueble.dpto}`].filter(Boolean).join(' ')
              : ''
            const ubicacion = inmueble ? [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ') : ''
            const direccionInmueble = ubicacion ? `${direccionPartes}, ${ubicacion}` : direccionPartes || 'Sin dirección'

            const estado = asignacion.estado_asignacion
            const estadoPres = estadoPresupuestoPorIncidente[asignacion.id_incidente]
            const presupuestoAprobado = estadoPres === 'aprobado'
            const enTrabajo = (estado === 'aceptada' || estado === 'en_curso') && presupuestoAprobado
            const terminado = estado === 'completada'

            const confInfo = conformidadesPorIncidente[asignacion.id_incidente]
            const conformidadPendiente = confInfo && !confInfo.esta_firmada && confInfo.url_documento
            const conformidadAprobada = confInfo && (confInfo.esta_firmada === 1 || confInfo.esta_firmada === true)
            const puedeSubirConformidad = terminado && !confInfo

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
                        {direccionInmueble && (
                          <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{direccionInmueble}</span>
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

                  <CardContent className="pt-0 pb-3 space-y-3">
                    {/* Descripción del problema + contacto del cliente juntos */}
                    {incidente?.descripcion_problema && (
                      <div className="flex items-start gap-2 bg-slate-50 rounded-md p-2.5 border border-slate-200">
                        <FileText className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Descripción del problema</p>
                          <p className="text-sm text-gray-700 mb-2">{incidente.descripcion_problema}</p>
                          {cliente && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-slate-200">
                              <span className="text-xs font-semibold text-gray-700">
                                {cliente.nombre} {cliente.apellido}
                              </span>
                              {cliente.telefono && (
                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                  <Phone className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                  {cliente.telefono}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Información de contacto adicional (email y dirección) */}
                    {cliente && (cliente.correo_electronico || cliente.direccion) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5 space-y-1.5">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Contacto del cliente</p>
                        {cliente.correo_electronico && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Mail className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            <span>{cliente.correo_electronico}</span>
                          </div>
                        )}
                        {cliente.direccion && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Home className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            <span>{cliente.direccion}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fechas y categoría */}
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
                <div
                  className="px-6 pb-4 flex flex-wrap gap-2 border-t pt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Botón de inspección — siempre visible si hay incidente */}
                  {incidente && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                      onClick={() => {
                        setInspeccionDesc('')
                        setInspeccionCausas('')
                        setInspeccionDialog({ open: true, idIncidente: asignacion.id_incidente })
                      }}
                    >
                      <Wrench className="h-3 w-3" />
                      Cargar Inspección
                    </Button>
                  )}

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
                  {puedeSubirConformidad && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-purple-700 border-purple-300 hover:bg-purple-50"
                      onClick={() => {
                        setFotoFile(null)
                        setFotoPreview(null)
                        setConformidadDialog({ open: true, idIncidente: asignacion.id_incidente })
                      }}
                    >
                      <Upload className="h-3 w-3" />
                      Subir Conformidad Firmada
                    </Button>
                  )}
                  {conformidadPendiente && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Conformidad en revisión por la administración
                    </div>
                  )}
                  {conformidadAprobada && (
                    <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Conformidad aprobada — incidente resuelto
                    </div>
                  )}
                </div>
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

      {/* Dialog: Cargar Inspección */}
      <Dialog
        open={inspeccionDialog?.open ?? false}
        onOpenChange={(o) => {
          if (!o) {
            setInspeccionDialog(null)
            setInspeccionDesc('')
            setInspeccionCausas('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Inspección</DialogTitle>
            <DialogDescription>
              Documenta los resultados de tu inspección técnica para el incidente #{inspeccionDialog?.idIncidente}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inspeccion-desc">Descripción de la Inspección *</Label>
              <Textarea
                id="inspeccion-desc"
                placeholder="Describe en detalle qué inspeccionaste y qué encontraste..."
                value={inspeccionDesc}
                onChange={(e) => setInspeccionDesc(e.target.value)}
                rows={4}
                maxLength={1000}
                disabled={loadingInspeccion}
              />
              <p className="text-xs text-gray-500">{inspeccionDesc.length}/1000 caracteres</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspeccion-causas">Causas Determinadas (opcional)</Label>
              <Textarea
                id="inspeccion-causas"
                placeholder="Problemas detectados, causas del incidente, recomendaciones..."
                value={inspeccionCausas}
                onChange={(e) => setInspeccionCausas(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={loadingInspeccion}
              />
              <p className="text-xs text-gray-500">{inspeccionCausas.length}/500 caracteres</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInspeccionDialog(null)
                setInspeccionDesc('')
                setInspeccionCausas('')
              }}
              disabled={loadingInspeccion}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCargarInspeccion}
              disabled={loadingInspeccion || !inspeccionDesc.trim() || inspeccionDesc.trim().length < 10}
            >
              {loadingInspeccion ? 'Guardando...' : 'Registrar Inspección'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              ¿Confirmas que el trabajo fue finalizado? El estado de la asignación pasará a &quot;Completada&quot;.
              Después podrás subir la conformidad firmada por el cliente.
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

      {/* Dialog: Subir Conformidad Firmada */}
      <Dialog
        open={conformidadDialog?.open ?? false}
        onOpenChange={(o) => {
          if (!o) {
            setConformidadDialog(null)
            setFotoFile(null)
            setFotoPreview(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Conformidad Firmada</DialogTitle>
            <DialogDescription>
              Tomá una foto de la conformidad física firmada por el cliente y subila aquí.
              La administración la revisará y aprobará para cerrar el incidente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Foto de la conformidad *</Label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Preview" className="max-h-48 mx-auto rounded-md object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <ImageIcon className="h-10 w-10 text-gray-400" />
                    <p className="text-sm font-medium">Tocá para seleccionar una foto</p>
                    <p className="text-xs text-gray-400">JPG, PNG, HEIC — máx. 10 MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFotoChange}
              />
              {fotoFile && (
                <p className="text-xs text-gray-500">
                  {fotoFile.name} ({(fotoFile.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConformidadDialog(null)
                setFotoFile(null)
                setFotoPreview(null)
              }}
              disabled={uploadingFoto}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubirConformidad}
              disabled={uploadingFoto || !fotoFile}
              className="gap-2"
            >
              {uploadingFoto ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Subiendo...</>
              ) : (
                <><Upload className="h-4 w-4" />Enviar Conformidad</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
