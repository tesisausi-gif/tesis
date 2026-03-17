'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, AlertCircle, Loader2, MapPin, User, Tag, ChevronRight } from 'lucide-react'
import { getTecnicosParaAsignacion } from '@/features/usuarios/usuarios.service'
import { crearAsignacion } from '@/features/asignaciones/asignaciones.service'
import { actualizarIncidente } from '@/features/incidentes/incidentes.service'
import { CategoriaIncidente } from '@/shared/types/enums'
import type { Tecnico } from '@/features/usuarios/usuarios.types'

interface IncidenteInfo {
  id_incidente: number
  descripcion_problema: string
  categoria: string | null
  nivel_prioridad: string | null
  nombre_cliente?: string
  apellido_cliente?: string
  calle?: string
  altura?: string
  localidad?: string
}

interface ModalAsignarTecnicoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incidente: IncidenteInfo
  onAsignarExito: () => void
}

export function ModalAsignarTecnico({ open, onOpenChange, incidente, onAsignarExito }: ModalAsignarTecnicoProps) {
  const [paso, setPaso] = useState<1 | 2>(1)
  const [categoria, setCategoria] = useState<string>(incidente.categoria ?? '')
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [cargando, setCargando] = useState(false)
  const [asignando, setAsignando] = useState(false)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<Tecnico | null>(null)

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setPaso(1)
      setCategoria(incidente.categoria ?? '')
      setTecnicoSeleccionado(null)
    }
  }, [open, incidente])

  // Cargar técnicos al pasar a paso 2
  useEffect(() => {
    if (paso !== 2) return
    setCargando(true)
    getTecnicosParaAsignacion()
      .then(setTecnicos)
      .catch(() => toast.error('Error al cargar técnicos'))
      .finally(() => setCargando(false))
  }, [paso])

  // Filtrar técnicos por la categoría seleccionada
  const tecnicosFiltrados = tecnicos
    .filter(t => {
      const esp = (t.especialidad || '').toLowerCase()
      const cat = categoria.toLowerCase()
      return esp.includes(cat) || cat.includes(esp)
    })
    .sort((a, b) => (b.calificacion_promedio ?? 0) - (a.calificacion_promedio ?? 0))

  const renderStars = (rating: number) => Array.from({ length: 5 }).map((_, i) => (
    <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
  ))

  const handleContinuar = async () => {
    if (!categoria) { toast.error('Debés seleccionar una categoría'); return }
    // Si la categoría cambió, actualizar en DB
    if (categoria !== incidente.categoria) {
      const res = await actualizarIncidente(incidente.id_incidente, { categoria })
      if (!res.success) { toast.error('Error al actualizar categoría'); return }
    }
    setPaso(2)
  }

  const handleAsignar = async () => {
    if (!tecnicoSeleccionado) { toast.error('Seleccioná un técnico'); return }
    setAsignando(true)
    try {
      const result = await crearAsignacion({ id_incidente: incidente.id_incidente, id_tecnico: tecnicoSeleccionado.id_tecnico, observaciones: null })
      if (result.success) {
        toast.success(`Técnico ${tecnicoSeleccionado.nombre} asignado`)
        onAsignarExito()
        onOpenChange(false)
      } else { toast.error(result.error) }
    } catch { toast.error('Error al asignar técnico') }
    finally { setAsignando(false) }
  }

  const cats = Object.values(CategoriaIncidente)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {paso === 1 ? 'Incidente y Categoría' : 'Seleccionar Técnico'}
          </DialogTitle>
          <DialogDescription>
            {paso === 1
              ? `Revisá los datos del incidente #${incidente.id_incidente} y confirmá o asigná una categoría`
              : `Técnicos disponibles para la categoría "${categoria}"`}
          </DialogDescription>
        </DialogHeader>

        {paso === 1 && (
          <div className="space-y-4">
            {/* Info del incidente */}
            <Card className="p-4 bg-blue-50 border-blue-200 space-y-2">
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Incidente #{incidente.id_incidente}</p>
                  <p className="text-sm font-semibold text-blue-900">{incidente.descripcion_problema}</p>
                </div>
              </div>
              {(incidente.nombre_cliente || incidente.apellido_cliente) && (
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <User className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>{incidente.nombre_cliente} {incidente.apellido_cliente}</span>
                </div>
              )}
              {incidente.calle && (
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>{incidente.calle} {incidente.altura}{incidente.localidad ? `, ${incidente.localidad}` : ''}</span>
                </div>
              )}
              {incidente.nivel_prioridad && (
                <Badge variant="outline" className="w-fit text-xs">
                  Prioridad: {incidente.nivel_prioridad}
                </Badge>
              )}
            </Card>

            {/* Selección de categoría - OBLIGATORIA */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Categoría del incidente <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-gray-500">Se usa para filtrar los técnicos disponibles con esa especialidad.</p>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className={`h-9 ${!categoria ? 'border-red-300' : ''}`}>
                  <SelectValue placeholder="Seleccioná una categoría..." />
                </SelectTrigger>
                <SelectContent>
                  {cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {!categoria && <p className="text-xs text-red-500">La categoría es obligatoria para asignar un técnico</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleContinuar} disabled={!categoria} className="gap-1.5">
                Ver Técnicos <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4">
            {/* Info del incidente (compacta) */}
            <Card className="p-3 bg-gray-50 border-gray-200">
              <div className="flex items-center gap-3 text-sm">
                <Badge className="shrink-0">{categoria}</Badge>
                <span className="text-gray-600 truncate">#{incidente.id_incidente} — {incidente.descripcion_problema}</span>
              </div>
            </Card>

            {cargando ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Cargando técnicos...</span>
              </div>
            ) : tecnicosFiltrados.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Sin técnicos para "{categoria}"</p>
                <p className="text-xs text-gray-400 mt-1">No hay técnicos con esa especialidad activa.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setPaso(1)}>← Cambiar categoría</Button>
              </Card>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Especialidad</TableHead>
                      <TableHead>Calificación</TableHead>
                      <TableHead>Trabajos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tecnicosFiltrados.map(t => (
                      <TableRow key={t.id_tecnico}
                        className={`cursor-pointer ${tecnicoSeleccionado?.id_tecnico === t.id_tecnico ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                        onClick={() => setTecnicoSeleccionado(t)}
                      >
                        <TableCell>
                          <input type="radio" checked={tecnicoSeleccionado?.id_tecnico === t.id_tecnico} onChange={() => setTecnicoSeleccionado(t)} className="cursor-pointer" />
                        </TableCell>
                        <TableCell className="font-medium">{t.nombre} {t.apellido}</TableCell>
                        <TableCell className="text-sm text-gray-600">{t.especialidad || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {renderStars(t.calificacion_promedio ?? 0)}
                            <span className="text-xs ml-1 font-medium text-gray-700">
                              {t.calificacion_promedio != null ? t.calificacion_promedio.toFixed(1) : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t.cantidad_trabajos_realizados}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {tecnicoSeleccionado && (
              <Card className="p-3 bg-blue-50 border-blue-200 text-sm">
                <span className="font-semibold text-blue-900">Seleccionado:</span>{' '}
                {tecnicoSeleccionado.nombre} {tecnicoSeleccionado.apellido}
                {tecnicoSeleccionado.calificacion_promedio != null && (
                  <span className="text-blue-700 ml-2">★ {tecnicoSeleccionado.calificacion_promedio.toFixed(1)}</span>
                )}
              </Card>
            )}

            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setPaso(1)}>← Cambiar categoría</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={asignando}>Cancelar</Button>
                <Button onClick={handleAsignar} disabled={!tecnicoSeleccionado || asignando}>
                  {asignando ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Asignando...</> : 'Asignar Técnico'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
