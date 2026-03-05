'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { FileCheck, User, Wrench, ExternalLink, CheckCircle2, XCircle, Star } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { aprobarConformidad, rechazarConformidad } from '@/features/conformidades/conformidades.service'

interface ConformidadItem {
  id_conformidad: number
  id_incidente: number
  url_documento: string | null
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

export function ConformidadesContent({ conformidades }: ConformidadesContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Dialog: Aprobar (con calificación)
  const [aprobarDialog, setAprobarDialog] = useState<ConformidadItem | null>(null)
  const [puntuacion, setPuntuacion] = useState(5)
  const [comentarios, setComentarios] = useState('')
  const [resolvioPrblema, setResolvioPrblema] = useState(true)

  // Dialog: Rechazar
  const [rechazarDialog, setRechazarDialog] = useState<ConformidadItem | null>(null)

  // Foto ampliada
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)

  const handleAprobar = () => {
    if (!aprobarDialog) return
    startTransition(async () => {
      const res = await aprobarConformidad(
        aprobarDialog.id_conformidad,
        puntuacion,
        comentarios.trim() || null,
        resolvioPrblema,
      )
      if (res.success) {
        toast.success('Conformidad aprobada', {
          description: `Incidente #${aprobarDialog.id_incidente} marcado como resuelto.`,
        })
        setAprobarDialog(null)
        setComentarios('')
        setPuntuacion(5)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al aprobar')
      }
    })
  }

  const handleRechazar = () => {
    if (!rechazarDialog) return
    startTransition(async () => {
      const res = await rechazarConformidad(rechazarDialog.id_conformidad)
      if (res.success) {
        toast.success('Conformidad rechazada', {
          description: 'El técnico recibirá una notificación para subir una nueva foto.',
        })
        setRechazarDialog(null)
        router.refresh()
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
          Fotos de conformidades subidas por técnicos — revisá y aprobá o rechazá
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
        <div className="grid gap-4">
          {conformidades.map((conf) => {
            const inc = conf.incidentes
            const asig = Array.isArray(inc?.asignaciones_tecnico)
              ? inc.asignaciones_tecnico.find(a => a.estado_asignacion === 'completada') || inc.asignaciones_tecnico[0]
              : null
            const tec = asig?.tecnicos
            const cliente = inc?.clientes

            return (
              <Card key={conf.id_conformidad} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-purple-600" />
                        Conformidad #{conf.id_conformidad} — Incidente #{conf.id_incidente}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(conf.fecha_creacion), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Pendiente revisión
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inc?.descripcion_problema && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Problema:</p>
                      <p className="text-sm text-gray-700 line-clamp-2">{inc.descripcion_problema}</p>
                      {inc.categoria && <p className="text-xs text-gray-500 mt-1">{inc.categoria}</p>}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {cliente && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span>Cliente: {cliente.nombre} {cliente.apellido}</span>
                      </div>
                    )}
                    {tec && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Wrench className="h-4 w-4 flex-shrink-0" />
                        <span>Técnico: {tec.nombre} {tec.apellido}</span>
                      </div>
                    )}
                  </div>

                  {/* Foto de la conformidad */}
                  {conf.url_documento && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Foto de la conformidad firmada:</p>
                      <div
                        className="relative rounded-lg overflow-hidden border border-gray-200 cursor-pointer group"
                        onClick={() => setFotoAmpliada(conf.url_documento)}
                      >
                        <img
                          src={conf.url_documento}
                          alt="Conformidad firmada"
                          className="w-full max-h-64 object-contain bg-gray-50"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <button
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        onClick={() => window.open(conf.url_documento!, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver en tamaño completo
                      </button>
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      onClick={() => {
                        setAprobarDialog(conf)
                        setPuntuacion(5)
                        setComentarios('')
                        setResolvioPrblema(true)
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      disabled={isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprobar
                    </Button>
                    <Button
                      onClick={() => setRechazarDialog(conf)}
                      variant="destructive"
                      className="flex-1 gap-2"
                      disabled={isPending}
                    >
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog: Ver foto ampliada */}
      <Dialog open={fotoAmpliada !== null} onOpenChange={(o) => !o && setFotoAmpliada(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Conformidad firmada</DialogTitle>
          </DialogHeader>
          {fotoAmpliada && (
            <img src={fotoAmpliada} alt="Conformidad" className="w-full rounded-lg object-contain max-h-[70vh]" />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Aprobar + Calificación */}
      <Dialog open={aprobarDialog !== null} onOpenChange={(o) => !o && setAprobarDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Conformidad y Calificar Técnico</DialogTitle>
            <DialogDescription>
              Al aprobar, el incidente #{aprobarDialog?.id_incidente} quedará resuelto y se registrará la calificación del técnico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Puntuación del técnico *</Label>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprobarDialog(null)} disabled={isPending}>Cancelar</Button>
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

      {/* Dialog: Rechazar */}
      <Dialog open={rechazarDialog !== null} onOpenChange={(o) => !o && setRechazarDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Conformidad</DialogTitle>
            <DialogDescription>
              La foto será eliminada y el técnico recibirá una notificación para volver a subir una foto válida de la conformidad firmada.
              <br /><br />
              ¿Confirmás el rechazo de la conformidad del Incidente #{rechazarDialog?.id_incidente}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarDialog(null)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleRechazar} variant="destructive" disabled={isPending} className="gap-2">
              <XCircle className="h-4 w-4" />
              {isPending ? 'Rechazando...' : 'Sí, rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
