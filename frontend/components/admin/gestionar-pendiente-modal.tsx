'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Star,
  Loader2,
  MapPin,
  User,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  Wrench,
  Clock,
} from 'lucide-react'
import { getTecnicosParaAsignacion } from '@/features/usuarios/usuarios.service'
import { crearAsignacion } from '@/features/asignaciones/asignaciones.service'
import { actualizarIncidente } from '@/features/incidentes/incidentes.service'
import { CategoriaIncidente } from '@/shared/types/enums'
import type { IncidenteConCliente } from '@/features/incidentes/incidentes.types'
import type { Tecnico } from '@/features/usuarios/usuarios.types'

interface GestionarPendienteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incidente: IncidenteConCliente
  onGestionExito: () => void
}

const CATEGORIAS = Object.values(CategoriaIncidente)

function StepperHeader({ paso }: { paso: 1 | 2 | 3 }) {
  const pasos = ['Categorización', 'Solicitud de asignación', 'Confirmación']
  return (
    <div className="flex items-center mb-6 px-1">
      {pasos.map((label, i) => {
        const num = (i + 1) as 1 | 2 | 3
        const done = paso > num
        const active = paso === num
        return (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
                  ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-gray-200 text-gray-500'}`}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : num}
              </div>
              <span className={`text-xs whitespace-nowrap ${active ? 'text-blue-700 font-medium' : done ? 'text-blue-500' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < pasos.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mb-4 ${paso > num ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function IncidenteInfoCard({ incidente, compact = false }: { incidente: IncidenteConCliente; compact?: boolean }) {
  const direccion = incidente.inmuebles
    ? `${incidente.inmuebles.calle} ${incidente.inmuebles.altura}${incidente.inmuebles.localidad ? `, ${incidente.inmuebles.localidad}` : ''}`
    : null

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Badge variant="outline" className="font-mono">#{incidente.id_incidente}</Badge>
        {incidente.categoria && (
          <Badge className="bg-blue-100 text-blue-800">{incidente.categoria}</Badge>
        )}
        {incidente.clientes && (
          <span className="text-sm text-gray-600">
            {incidente.clientes.nombre} {incidente.clientes.apellido}
          </span>
        )}
      </div>
    )
  }

  return (
    <Card className="bg-blue-50 border-blue-200 mb-4">
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-blue-900 font-medium leading-snug flex-1">
            {incidente.descripcion_problema}
          </p>
          <Badge variant="outline" className="font-mono shrink-0">#{incidente.id_incidente}</Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-blue-700">
          {incidente.clientes && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {incidente.clientes.nombre} {incidente.clientes.apellido}
            </span>
          )}
          {direccion && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {direccion}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StarRating({ value }: { value: number | null }) {
  const n = Math.round(value ?? 0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= n ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
      {value != null && (
        <span className="text-xs text-gray-500 ml-1">{value.toFixed(1)}</span>
      )}
    </div>
  )
}

export function GestionarPendienteModal({
  open,
  onOpenChange,
  incidente,
  onGestionExito,
}: GestionarPendienteModalProps) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [categoria, setCategoria] = useState('')
  const [guardandoCategoria, setGuardandoCategoria] = useState(false)
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [cargandoTecnicos, setCargandoTecnicos] = useState(false)
  const [errorTecnicos, setErrorTecnicos] = useState(false)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<Tecnico | null>(null)
  const [asignando, setAsignando] = useState(false)

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setPaso(1)
      setCategoria(incidente.categoria ?? '')
      setTecnicoSeleccionado(null)
      setTecnicos([])
      setErrorTecnicos(false)
    }
  }, [open, incidente.id_incidente])

  // Cargar técnicos al llegar al paso 2
  useEffect(() => {
    if (paso === 2) cargarTecnicos()
  }, [paso])

  const cargarTecnicos = async () => {
    setCargandoTecnicos(true)
    setErrorTecnicos(false)
    try {
      const data = await getTecnicosParaAsignacion()
      setTecnicos(data)
    } catch {
      setErrorTecnicos(true)
      toast.error('Error al cargar técnicos')
    } finally {
      setCargandoTecnicos(false)
    }
  }

  const tecnicosFiltrados = tecnicos
    .filter((t) => {
      if (!t.especialidad || !categoria) return true
      return (
        t.especialidad.toLowerCase().includes(categoria.toLowerCase()) ||
        categoria.toLowerCase().includes(t.especialidad.toLowerCase())
      )
    })
    .sort((a, b) => (b.calificacion_promedio ?? 0) - (a.calificacion_promedio ?? 0))

  const handleContinuar = async () => {
    if (!categoria) {
      toast.error('Seleccioná una categoría antes de continuar')
      return
    }
    // Solo guardar si cambió
    if (categoria !== incidente.categoria) {
      setGuardandoCategoria(true)
      const res = await actualizarIncidente(incidente.id_incidente, { categoria })
      setGuardandoCategoria(false)
      if (!res.success) {
        toast.error('Error al guardar la categoría', { description: res.error })
        return
      }
    }
    setPaso(2)
  }

  const handleAsignar = async () => {
    if (!tecnicoSeleccionado) {
      toast.error('Seleccioná un técnico')
      return
    }
    setAsignando(true)
    try {
      const result = await crearAsignacion({
        id_incidente: incidente.id_incidente,
        id_tecnico: tecnicoSeleccionado.id_tecnico,
        observaciones: null,
      })
      if (result.success) {
        setPaso(3)
      } else {
        toast.error('Error al asignar técnico', { description: result.error })
      }
    } catch {
      toast.error('Error inesperado al asignar técnico')
    } finally {
      setAsignando(false)
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && paso === 3) {
      onGestionExito()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            Gestionar Incidente #{incidente.id_incidente}
          </DialogTitle>
          <DialogDescription>
            Completá los pasos requeridos para poner el incidente en proceso
          </DialogDescription>
        </DialogHeader>

        <StepperHeader paso={paso} />

        {/* ────── PASO 1: CATEGORIZACIÓN ────── */}
        {paso === 1 && (
          <div className="space-y-4">
            <IncidenteInfoCard incidente={incidente} />

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1">
                Categoría del incidente
                <span className="text-red-500">*</span>
              </Label>

              {incidente.categoria && incidente.categoria !== categoria && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Categoría actual: <strong>{incidente.categoria}</strong>
                </div>
              )}
              {incidente.categoria && incidente.categoria === categoria && (
                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  Categoría actual: <strong>{incidente.categoria}</strong> — podés cambiarla si querés
                </div>
              )}

              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleContinuar} disabled={!categoria || guardandoCategoria}>
                {guardandoCategoria ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>
                ) : (
                  'Continuar →'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ────── PASO 2: ASIGNACIÓN DE TÉCNICO ────── */}
        {paso === 2 && (
          <div className="space-y-4">
            <IncidenteInfoCard incidente={{ ...incidente, categoria }} compact />

            {incidente.disponibilidad && (
              <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span><strong>Disponibilidad del cliente:</strong> {incidente.disponibilidad}</span>
              </div>
            )}

            {cargandoTecnicos ? (
              <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando técnicos disponibles...
              </div>
            ) : errorTecnicos ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-8 gap-3 text-center">
                  <AlertTriangle className="h-10 w-10 text-red-400" />
                  <p className="text-sm text-gray-600">No se pudieron cargar los técnicos</p>
                  <Button variant="outline" size="sm" onClick={cargarTecnicos} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reintentar
                  </Button>
                </CardContent>
              </Card>
            ) : tecnicosFiltrados.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-8 gap-3 text-center">
                  <Wrench className="h-10 w-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-700">
                    No hay técnicos con especialidad en <strong>{categoria}</strong>
                  </p>
                  <p className="text-xs text-gray-500">
                    Podés cambiar la categoría o asignar un técnico de otra especialidad
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCategoria('')
                      setPaso(1)
                    }}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Cambiar categoría
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="text-xs text-gray-500 mb-1">
                  {tecnicosFiltrados.length} técnico{tecnicosFiltrados.length !== 1 ? 's' : ''} disponible{tecnicosFiltrados.length !== 1 ? 's' : ''} · ordenados por calificación
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]"></TableHead>
                        <TableHead>Técnico</TableHead>
                        <TableHead>Especialidad</TableHead>
                        <TableHead>Calificación</TableHead>
                        <TableHead className="w-[80px]">Trabajos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tecnicosFiltrados.map((t) => {
                        const selected = tecnicoSeleccionado?.id_tecnico === t.id_tecnico
                        return (
                          <TableRow
                            key={t.id_tecnico}
                            className={`cursor-pointer transition-colors ${selected ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                            onClick={() => setTecnicoSeleccionado(t)}
                          >
                            <TableCell>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                                ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {t.nombre} {t.apellido}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {t.especialidad ?? '—'}
                            </TableCell>
                            <TableCell>
                              <StarRating value={t.calificacion_promedio} />
                            </TableCell>
                            <TableCell className="text-sm text-center text-gray-600">
                              {t.cantidad_trabajos_realizados}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {tecnicoSeleccionado && (
                  <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    Seleccionado: <strong>{tecnicoSeleccionado.nombre} {tecnicoSeleccionado.apellido}</strong>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setPaso(1)}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button
                onClick={handleAsignar}
                disabled={!tecnicoSeleccionado || asignando || cargandoTecnicos}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {asignando ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Asignando...</>
                ) : (
                  <><Wrench className="h-4 w-4" />Confirmar asignación</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ────── PASO 3: CONFIRMACIÓN ────── */}
        {paso === 3 && (
          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6 pb-5 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 text-base">
                    Solicitud de asignación enviada
                  </h3>
                  {tecnicoSeleccionado && (
                    <p className="text-sm text-green-700 mt-1">
                      {tecnicoSeleccionado.nombre} {tecnicoSeleccionado.apellido} recibirá la notificación
                    </p>
                  )}
                </div>
                <div className="text-sm text-green-800 bg-green-100 rounded-md px-4 py-3 w-full text-left space-y-1">
                  <p>✓ Incidente <strong>#{incidente.id_incidente}</strong> movido a <strong>Asignación Solicitada</strong></p>
                  <p>✓ El técnico debe aceptar para que pase a <strong>En Proceso</strong></p>
                  <p>✓ Si el técnico rechaza, podrás re-asignar desde la bandeja</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  onGestionExito()
                  onOpenChange(false)
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
