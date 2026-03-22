'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
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
  MapPin, Calendar, ClipboardList, Clock, CheckCircle2, Upload, Wrench,
  Plus, ImageIcon, Loader2, Phone, Mail, Home, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getEstadoAsignacionColor,
  getEstadoAsignacionLabel,
} from '@/shared/utils/colors'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { AsignacionTecnico } from '@/features/asignaciones/asignaciones.types'
import { completarAsignacion } from '@/features/asignaciones/asignaciones.service'
import { crearAvance } from '@/features/avances/avances.service'
import { crearConformidadPorTecnico } from '@/features/conformidades/conformidades.service'
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

  // Realtime: notificar cuando el cliente aprueba un presupuesto
  useEffect(() => {
    const supabase = createClient()
    const idIncidentes = asignaciones.map(a => a.id_incidente)

    const channel = supabase
      .channel('presupuestos-tecnico-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presupuestos' }, (payload) => {
        const next = payload.new as any
        const prev = payload.old as any
        if (
          next?.estado_presupuesto === 'aprobado' &&
          prev?.estado_presupuesto !== 'aprobado' &&
          idIncidentes.includes(next.id_incidente)
        ) {
          toast.success('¡Presupuesto aprobado por el cliente!', {
            description: `Incidente #${next.id_incidente} — ya podés comenzar el trabajo`,
          })
          router.refresh()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [asignaciones, router])

  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalTab, setModalTab] = useState('detalles')
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


  const abrirModal = (id: number, tab = 'detalles') => {
    setIncidenteSeleccionado(id)
    setModalTab(tab)
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


  // Stats
  const totalTrabajos = asignaciones.length
  const aceptados = asignaciones.filter(a => a.estado_asignacion === 'aceptada').length
  const enCurso = asignaciones.filter(a => a.estado_asignacion === 'en_curso').length
  const completados = asignaciones.filter(a => a.estado_asignacion === 'completada').length

  const enProceso = asignaciones.filter(a => ['aceptada', 'en_curso'].includes(a.estado_asignacion))
  const resueltas = asignaciones.filter(a => a.estado_asignacion === 'completada')

  const renderCard = (asignacion: AsignacionTecnico) => {
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
      <Card key={asignacion.id_asignacion} className="shadow-sm">
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
            <Badge variant="outline" className={`flex-shrink-0 ${getEstadoAsignacionColor(estado)}`}>
              {getEstadoAsignacionLabel(estado)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-3 space-y-3">
          {incidente?.descripcion_problema && (
            <p className="text-sm text-gray-700 line-clamp-2">{incidente.descripcion_problema}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(asignacion.fecha_asignacion), 'dd/MM/yy', { locale: es })}
            </span>
            {asignacion.fecha_visita_programada && (
              <span className="flex items-center gap-1 text-blue-500">
                <Clock className="h-3 w-3" />
                Visita: {format(new Date(asignacion.fecha_visita_programada), 'dd/MM HH:mm', { locale: es })}
              </span>
            )}
            {incidente?.categoria && <span>{incidente.categoria}</span>}
          </div>

          {/* 3 botones de navegación directa */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-gray-700"
              onClick={() => abrirModal(asignacion.id_incidente, 'detalles')}
            >
              <FileText className="h-3.5 w-3.5" />
              Detalles
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-gray-700"
              onClick={() => abrirModal(asignacion.id_incidente, 'timeline')}
            >
              <Clock className="h-3.5 w-3.5" />
              Timeline
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-gray-900 hover:bg-gray-800 text-white"
              onClick={() => abrirModal(asignacion.id_incidente, 'inspecciones')}
            >
              <Wrench className="h-3.5 w-3.5" />
              Gestión
            </Button>
          </div>
        </CardContent>

        <div className="px-4 pb-4 space-y-2 border-t pt-3">
          {enTrabajo && (
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
                onClick={() => { setAvanceDesc(''); setAvancePct(''); setAvanceDialog({ open: true, idAsignacion: asignacion.id_asignacion, idIncidente: asignacion.id_incidente }) }}>
                <Plus className="h-3.5 w-3.5" />Registrar avance
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                onClick={() => setCompletarDialog({ open: true, idAsignacion: asignacion.id_asignacion })}>
                <CheckCircle2 className="h-3.5 w-3.5" />Completar
              </Button>
            </div>
          )}
          {puedeSubirConformidad && (
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
              onClick={() => { setFotoFile(null); setFotoPreview(null); setConformidadDialog({ open: true, idIncidente: asignacion.id_incidente }) }}>
              <Upload className="h-3.5 w-3.5" />Subir conformidad firmada
            </Button>
          )}
          {conformidadPendiente && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />Conformidad en revisión por la administración
            </div>
          )}
          {conformidadAprobada && (
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />Conformidad aprobada — incidente resuelto
            </div>
          )}
        </div>
      </Card>
    )
  }

  const renderCards = (lista: AsignacionTecnico[]) => lista.length === 0 ? (
    <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-slate-50 to-slate-100">
      <CardContent className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <ClipboardList className="h-10 w-10 text-slate-400 mb-3" />
        <p className="text-sm text-gray-500">No hay incidentes en este estado</p>
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-3">
      {lista.map((asignacion) => renderCard(asignacion))}
    </div>
  )

  return (
    <div className="space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Incidentes</h1>
        <p className="text-gray-600 text-sm mt-1">Incidentes asignados y su estado</p>
      </div>

      {asignaciones.length > 0 && (
        <div className="grid grid-cols-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {[
            { label: 'Total',      count: totalTrabajos, color: 'text-blue-600' },
            { label: 'Aceptados',  count: aceptados,     color: 'text-blue-500' },
            { label: 'En curso',   count: enCurso,       color: 'text-orange-500' },
            { label: 'Completos',  count: completados,   color: 'text-green-500' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center justify-center py-3 border-r border-gray-100 last:border-0">
              <span className={`text-xl font-bold ${s.color}`}>{s.count}</span>
              <span className="text-[9px] text-gray-400 font-medium leading-tight text-center mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {asignaciones.length > 0 && (
        <Tabs defaultValue="en_proceso">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="en_proceso" className="gap-2">
              En Proceso
              <Badge variant="secondary">{enProceso.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="resueltos" className="gap-2">
              Resueltos
              <Badge variant="secondary">{resueltas.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="en_proceso" className="mt-3">{renderCards(enProceso)}</TabsContent>
          <TabsContent value="resueltos" className="mt-3">{renderCards(resueltas)}</TabsContent>
        </Tabs>
      )}

      {asignaciones.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <ClipboardList className="h-12 w-12 text-slate-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes incidentes asignados</h3>
            <p className="text-sm text-gray-600">Cuando aceptes una asignación, aparecerá aquí.</p>
          </CardContent>
        </Card>
      )}

      {/* Modal detalle incidente */}
      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="tecnico"
        initialTab={modalTab}
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
