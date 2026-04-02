'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileCheck, User, Wrench, ExternalLink, CheckCircle2, XCircle, Star,
  FileText, Loader2, AlertTriangle, ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { aprobarConformidad, rechazarConformidad } from '@/features/conformidades/conformidades.service'
import { Paginacion } from '@/components/ui/paginacion'
import { getTimelineIncidente } from '@/features/incidentes/incidentes.service'
import type { EventoTimeline } from '@/features/incidentes/incidentes.service'

interface ConformidadItem {
  id_conformidad: number
  id_incidente: number
  url_documento: string | null
  url_comprobante_compras: string | null
  fecha_creacion: string
  incidentes: {
    id_incidente: number
    descripcion_problema: string
    categoria: string | null
    clientes: { nombre: string; apellido: string } | null
    asignaciones_tecnico: Array<{
      id_tecnico: number
      estado_asignacion: string
      tecnicos: { id_tecnico: number; nombre: string; apellido: string } | null
    }>
  } | null
}

interface ConformidadesContentProps {
  conformidades: ConformidadItem[]
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`h-7 w-7 transition-colors ${star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  )
}

function DocumentoPreview({ url, label }: { url: string; label: string }) {
  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf')
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      {isPdf ? (
        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 truncate">Documento PDF</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.open(url, '_blank')} className="gap-1 flex-shrink-0">
            <ExternalLink className="h-3 w-3" />
            Abrir
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <div
            className="relative rounded-lg overflow-hidden border border-gray-200 cursor-pointer group"
            onClick={() => window.open(url, '_blank')}
          >
            <img
              src={url}
              alt={label}
              className="w-full max-h-64 object-contain bg-gray-50"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <button
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
            Ver en tamaño completo
          </button>
        </div>
      )}
    </div>
  )
}

const COLORES_TIMELINE: Record<string, string> = {
  registro: 'bg-blue-500',
  asignacion: 'bg-purple-500',
  presupuesto: 'bg-amber-500',
  conformidad: 'bg-cyan-500',
  pago: 'bg-green-500',
  calificacion: 'bg-yellow-500',
}

export function ConformidadesContent({ conformidades }: ConformidadesContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pagina, setPagina] = useState(1)
  const conformidadesPaginadas = conformidades.slice((pagina - 1) * 10, pagina * 10)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('conformidades-admin-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conformidades' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Conformidad seleccionada para el panel de detalle
  const [selected, setSelected] = useState<ConformidadItem | null>(null)
  const [timeline, setTimeline] = useState<EventoTimeline[] | null>(null)
  const [loadingTimeline, setLoadingTimeline] = useState(false)

  // Formulario de calificación (dentro del panel)
  const [puntuacion, setPuntuacion] = useState(5)
  const [comentarios, setComentarios] = useState('')
  const [resolvioPrblema, setResolvioPrblema] = useState(true)

  // Confirmación de rechazo inline
  const [showConfirmRechazo, setShowConfirmRechazo] = useState(false)

  const abrirDetalle = async (conf: ConformidadItem) => {
    setSelected(conf)
    setPuntuacion(5)
    setComentarios('')
    setResolvioPrblema(true)
    setShowConfirmRechazo(false)
    setTimeline(null)
    setLoadingTimeline(true)
    try {
      const data = await getTimelineIncidente(conf.id_incidente)
      setTimeline(data)
    } catch {
      toast.error('Error al cargar el historial')
    } finally {
      setLoadingTimeline(false)
    }
  }

  const cerrarDetalle = () => {
    setSelected(null)
    setTimeline(null)
    setShowConfirmRechazo(false)
  }

  const handleAprobar = () => {
    if (!selected) return
    startTransition(async () => {
      const res = await aprobarConformidad(
        selected.id_conformidad,
        puntuacion,
        comentarios.trim() || null,
        resolvioPrblema,
      )
      if (res.success) {
        toast.success('Conformidad aprobada', {
          description: `Incidente #${selected.id_incidente} marcado como resuelto.`,
        })
        cerrarDetalle()
        router.refresh()
        window.dispatchEvent(new CustomEvent('admin-badges-refresh'))
      } else {
        toast.error(res.error ?? 'Error al aprobar')
      }
    })
  }

  const handleRechazar = () => {
    if (!selected) return
    startTransition(async () => {
      const res = await rechazarConformidad(selected.id_conformidad)
      if (res.success) {
        toast.success('Conformidad rechazada', {
          description: 'El técnico recibirá una notificación para subir una nueva foto.',
        })
        cerrarDetalle()
        router.refresh()
        window.dispatchEvent(new CustomEvent('admin-badges-refresh'))
      } else {
        toast.error(res.error ?? 'Error al rechazar')
      }
    })
  }

  return (
    <div className="space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conformidades Pendientes</h1>
        <p className="text-gray-600 text-sm mt-1">
          Hacé clic en una conformidad para ver el historial completo y aprobar o rechazar.
        </p>
      </div>

      {conformidades.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-green-100 p-4 mb-4">
              <FileCheck className="h-12 w-12 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay conformidades pendientes</h3>
            <p className="text-sm text-gray-600 max-w-md">
              Cuando un técnico suba una foto de conformidad firmada, aparecerá aquí para tu revisión.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
          {conformidadesPaginadas.map((conf) => {
            const inc = conf.incidentes
            const asig = Array.isArray(inc?.asignaciones_tecnico)
              ? inc.asignaciones_tecnico.find(a => a.estado_asignacion === 'completada') || inc.asignaciones_tecnico[0]
              : null
            const tec = asig?.tecnicos
            const cliente = inc?.clientes

            return (
              <button
                key={conf.id_conformidad}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-4 group"
                onClick={() => abrirDetalle(conf)}
              >
                <div className="rounded-full bg-amber-100 p-2 flex-shrink-0">
                  <FileCheck className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">
                      Incidente #{conf.id_incidente}
                    </span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                      Pendiente
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                    {cliente && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {cliente.nombre} {cliente.apellido}
                      </span>
                    )}
                    {tec && (
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {tec.nombre} {tec.apellido}
                      </span>
                    )}
                    <span>
                      {format(new Date(conf.fecha_creacion), "dd MMM yyyy, HH:mm", { locale: es })}
                    </span>
                    {inc?.categoria && <span className="text-gray-400">{inc.categoria}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" />
              </button>
            )
          })}
        </div>
        <Paginacion pagina={pagina} total={conformidades.length} onChange={setPagina} />
        </>
      )}

      {/* Panel de detalle */}
      <Dialog open={selected !== null} onOpenChange={(o) => !o && cerrarDetalle()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-purple-600" />
              Conformidad #{selected?.id_conformidad} — Incidente #{selected?.id_incidente}
            </DialogTitle>
            <DialogDescription>
              {selected && format(new Date(selected.fecha_creacion), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
              {(() => {
                const inc = selected?.incidentes
                const asig = Array.isArray(inc?.asignaciones_tecnico)
                  ? inc.asignaciones_tecnico.find(a => a.estado_asignacion === 'completada') || inc.asignaciones_tecnico[0]
                  : null
                const tec = asig?.tecnicos
                const cliente = inc?.clientes
                return (
                  <span className="ml-2 text-gray-500">
                    {cliente && `· Cliente: ${cliente.nombre} ${cliente.apellido}`}
                    {tec && ` · Técnico: ${tec.nombre} ${tec.apellido}`}
                  </span>
                )
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            {/* Descripción del problema */}
            {selected?.incidentes?.descripcion_problema && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Problema reportado:</p>
                <p className="text-sm text-gray-700">{selected.incidentes.descripcion_problema}</p>
                {selected.incidentes.categoria && (
                  <p className="text-xs text-gray-500 mt-1">{selected.incidentes.categoria}</p>
                )}
              </div>
            )}

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                Historial del incidente
              </h3>
              {loadingTimeline ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="relative pl-6 space-y-3">
                  {(timeline || []).map((ev, i) => (
                    <div key={i} className="relative">
                      <div className={`absolute -left-6 top-1.5 h-3 w-3 rounded-full ${COLORES_TIMELINE[ev.tipo] ?? 'bg-gray-400'}`} />
                      {i < (timeline?.length ?? 0) - 1 && (
                        <div className="absolute -left-[19px] top-4 h-full w-0.5 bg-gray-200" />
                      )}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">
                          {new Date(ev.fecha).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{ev.titulo}</p>
                        {ev.descripcion && <p className="text-xs text-gray-500 mt-0.5">{ev.descripcion}</p>}
                      </div>
                    </div>
                  ))}
                  {(!timeline || timeline.length === 0) && (
                    <p className="text-center text-sm text-gray-400 py-4">Sin eventos registrados</p>
                  )}
                </div>
              )}
            </div>

            {/* Documentos */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700">Documentos adjuntos</h3>
              {selected?.url_documento ? (
                <DocumentoPreview url={selected.url_documento} label="Foto / documento de conformidad firmada:" />
              ) : (
                <p className="text-sm text-gray-400 italic">Sin foto de conformidad</p>
              )}
              {selected?.url_comprobante_compras && (
                <DocumentoPreview url={selected.url_comprobante_compras} label="Comprobante de compras de materiales:" />
              )}
            </div>

            {/* Sección de aprobación */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Calificación del técnico</h3>
              <div className="space-y-2">
                <Label>Puntuación *</Label>
                <StarRating value={puntuacion} onChange={setPuntuacion} />
                <p className="text-xs text-gray-500">{puntuacion} de 5 estrellas</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conf-comentarios">Comentarios (opcional)</Label>
                <Textarea
                  id="conf-comentarios"
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Observaciones sobre el trabajo realizado..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="conf-resolvio"
                  type="checkbox"
                  checked={resolvioPrblema}
                  onChange={(e) => setResolvioPrblema(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="conf-resolvio" className="cursor-pointer">El técnico resolvió el problema</Label>
              </div>
            </div>

            {/* Confirmación de rechazo inline */}
            {showConfirmRechazo && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Confirmar rechazo</p>
                    <p className="text-xs text-red-600 mt-1">
                      La foto será eliminada y el técnico recibirá una notificación para subir una nueva foto válida de la conformidad firmada.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowConfirmRechazo(false)}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleRechazar}
                    disabled={isPending}
                    className="gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {isPending ? 'Rechazando...' : 'Sí, rechazar'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Botones fijos al fondo */}
          <DialogFooter className="mt-6 pt-4 border-t gap-2">
            <Button variant="outline" onClick={cerrarDetalle} disabled={isPending}>
              Cerrar
            </Button>
            {!showConfirmRechazo && (
              <Button
                onClick={() => setShowConfirmRechazo(true)}
                variant="destructive"
                disabled={isPending}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </Button>
            )}
            <Button
              onClick={handleAprobar}
              disabled={isPending || puntuacion === 0}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isPending ? 'Aprobando...' : 'Aprobar y calificar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
