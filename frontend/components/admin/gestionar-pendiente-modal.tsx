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
  ImageIcon,
  ExternalLink,
} from 'lucide-react'
import { getTecnicosParaAsignacion, getEspecialidadesActivas, getFiabilidadTecnicos } from '@/features/usuarios/usuarios.service'
import type { FiabilidadTecnico } from '@/features/usuarios/usuarios.service'
import { crearAsignacion } from '@/features/asignaciones/asignaciones.service'
import { actualizarIncidente } from '@/features/incidentes/incidentes.service'
import { getFranjasDisponibilidad, getConflictosTecnicos } from '@/features/disponibilidad/disponibilidad.service'
import type { FranjaInput } from '@/components/ui/calendario-disponibilidad'
import type { IncidenteConCliente } from '@/features/incidentes/incidentes.types'
import type { Tecnico } from '@/features/usuarios/usuarios.types'
import { AgendaTecnicoModal } from '@/components/shared/agenda-tecnico-modal.client'

interface GestionarPendienteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incidente: IncidenteConCliente
  onGestionExito: () => void
}

function StepperHeader({ paso }: { paso: 1 | 2 | 3 }) {
  const pasos = ['Categoría', 'Asignación', 'Confirmación']
  return (
    <div className="mb-5 min-w-0">
      <div className="flex items-center w-full">
        {([1, 2, 3] as const).map((num) => {
          const done = paso > num
          const active = paso === num
          return (
            <div key={num} className="contents">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
                  ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-gray-200 text-gray-500'}`}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : num}
              </div>
              {num < 3 && (
                <div className={`flex-1 h-0.5 mx-2 ${paso > num ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
      <p className={`text-xs text-center mt-2 font-medium ${paso === 1 ? 'text-blue-700' : paso === 2 ? 'text-blue-700' : 'text-blue-700'}`}>
        Paso {paso}: {pasos[paso - 1]}
      </p>
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
        {incidente.url_foto_diagnostico && (
          <div className="mt-2 pt-2 border-t border-blue-100">
            <p className="text-xs text-blue-600 font-medium flex items-center gap-1 mb-1.5">
              <ImageIcon className="h-3 w-3" />
              Foto del problema adjunta por el cliente
            </p>
            <div
              className="relative inline-block cursor-pointer group"
              onClick={() => window.open(incidente.url_foto_diagnostico!, '_blank')}
            >
              <img
                src={incidente.url_foto_diagnostico}
                alt="Foto de diagnóstico"
                className="max-h-40 rounded-lg border border-blue-200 object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        )}
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
  const [fiabilidad, setFiabilidad] = useState<Record<number, FiabilidadTecnico>>({})
  const [cargandoTecnicos, setCargandoTecnicos] = useState(false)
  const [errorTecnicos, setErrorTecnicos] = useState(false)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<Tecnico | null>(null)
  const [asignando, setAsignando] = useState(false)
  const [franjas, setFranjas] = useState<FranjaInput[]>([])
  const [conflictos, setConflictos] = useState<Record<number, boolean>>({})
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>([])

  // Reset al abrir + cargar categorías activas desde DB
  useEffect(() => {
    if (open) {
      setPaso(1)
      setCategoria(incidente.categoria ?? '')
      setTecnicoSeleccionado(null)
      setTecnicos([])
      setErrorTecnicos(false)
      getEspecialidadesActivas().then((data) => {
        const nombres = data.map((e: { nombre: string }) => e.nombre)
        // Si el incidente ya tiene una categoría deshabilitada, incluirla para no perder el valor
        if (incidente.categoria && !nombres.includes(incidente.categoria)) {
          nombres.unshift(incidente.categoria)
        }
        setCategoriasDisponibles(nombres)
      }).catch(() => {})
    }
  }, [open, incidente.id_incidente])

  // Cargar técnicos y franjas al llegar al paso 2
  useEffect(() => {
    if (paso === 2) {
      cargarTecnicos()
      cargarFranjasYConflictos()
    }
  }, [paso])

  const cargarTecnicos = async () => {
    setCargandoTecnicos(true)
    setErrorTecnicos(false)
    try {
      const [data, fData] = await Promise.all([
        getTecnicosParaAsignacion(),
        getFiabilidadTecnicos(),
      ])
      setTecnicos(data)
      setFiabilidad(fData)
    } catch {
      setErrorTecnicos(true)
      toast.error('Error al cargar técnicos')
    } finally {
      setCargandoTecnicos(false)
    }
  }

  const cargarFranjasYConflictos = async () => {
    try {
      const [franjasData, conflictosData] = await Promise.all([
        getFranjasDisponibilidad(incidente.id_incidente),
        getConflictosTecnicos(incidente.id_incidente),
      ])
      setFranjas(franjasData as FranjaInput[])
      setConflictos(conflictosData)
    } catch { /* no bloquear */ }
  }

  const tecnicosFiltrados = tecnicos
    .filter((t) => {
      if (!categoria) return true
      const cat = categoria.toLowerCase()
      const todasEsps = [
        ...(t.especialidad ? [t.especialidad] : []),
        ...(Array.isArray(t.especialidades) ? t.especialidades : []),
      ]
      if (todasEsps.length === 0) return true
      return todasEsps.some(esp => esp.toLowerCase().includes(cat) || cat.includes(esp.toLowerCase()))
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
      <DialogContent className="w-full !max-w-[min(42rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
          <div className="space-y-4 min-w-0 overflow-hidden">
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
                  {categoriasDisponibles.map((cat) => (
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
          <div className="space-y-4 min-w-0 overflow-hidden">
            <IncidenteInfoCard incidente={{ ...incidente, categoria }} compact />

            {/* Disponibilidad del cliente — calendario */}
            <div className="space-y-1.5 min-w-0 overflow-hidden">
              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                Disponibilidad del cliente
              </p>
              {franjas.length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 space-y-1">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Franjas disponibles del cliente
                  </p>
                  {franjas.map((f, i) => (
                    <p key={i} className="text-xs text-amber-800">
                      <span className="font-medium capitalize">
                        {new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}:
                      </span>{' '}
                      {f.hora_inicio}–{f.hora_fin}
                    </p>
                  ))}
                </div>
              ) : incidente.disponibilidad ? (
                <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{incidente.disponibilidad}</span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Sin disponibilidad registrada</p>
              )}
            </div>

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
                <div className="border rounded-md overflow-hidden divide-y">
                  {tecnicosFiltrados.map((t) => {
                    const selected = tecnicoSeleccionado?.id_tecnico === t.id_tecnico
                    const tieneConflicto = conflictos[t.id_tecnico] === true
                    const especialidad = Array.isArray(t.especialidades) && t.especialidades.length > 0
                      ? t.especialidades.join(', ')
                      : (t.especialidad ?? null)
                    const fData = fiabilidad[t.id_tecnico]
                    const tasaCancel = fData?.tasaCancelacion ?? 0
                    const tasaRechaz = fData?.tasaRechazo ?? 0
                    const badgeCancel =
                      tasaCancel === 0  ? { label: 'Sin cancelaciones', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' } :
                      tasaCancel <= 10  ? { label: `${tasaCancel}% canceló`, cls: 'bg-amber-50 text-amber-700 border-amber-200' } :
                                          { label: `${tasaCancel}% canceló`, cls: 'bg-red-50 text-red-700 border-red-200' }
                    const badgeRechaz =
                      tasaRechaz === 0  ? null :
                      tasaRechaz <= 20  ? { label: `${tasaRechaz}% rechazó`, cls: 'bg-amber-50 text-amber-700 border-amber-200' } :
                                          { label: `${tasaRechaz}% rechazó`, cls: 'bg-red-50 text-red-700 border-red-200' }
                    return (
                      <div
                        key={t.id_tecnico}
                        className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : tieneConflicto ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                        onClick={() => setTecnicoSeleccionado(t)}
                      >
                        {/* Radio */}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                          ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>

                        {/* Info principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium">{t.nombre} {t.apellido}</p>
                            {tieneConflicto && (
                              <span className="flex items-center gap-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full shrink-0">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Compromiso
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {especialidad && (
                              <p className="text-xs text-gray-500 truncate">{especialidad}</p>
                            )}
                            <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full shrink-0 ${badgeCancel.cls}`}>
                              {badgeCancel.label}
                            </span>
                            {badgeRechaz && (
                              <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full shrink-0 ${badgeRechaz.cls}`}>
                                {badgeRechaz.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Rating + trabajos + agenda */}
                        <div className="shrink-0 text-right space-y-1">
                          <StarRating value={t.calificacion_promedio} />
                          <p className="text-xs text-gray-400">{t.cantidad_trabajos_realizados} trabajo{t.cantidad_trabajos_realizados !== 1 ? 's' : ''}</p>
                          <AgendaTecnicoModal
                            idTecnico={t.id_tecnico}
                            nombreTecnico={`${t.nombre} ${t.apellido}`}
                            triggerLabel="Agenda"
                            triggerClassName="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {Object.values(conflictos).some(Boolean) && (
                  <div className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Los técnicos marcados con <strong>Compromiso</strong> ya tienen una visita programada que coincide con la disponibilidad del cliente. Podés asignarlos igual, pero habrá superposición de horarios.</span>
                  </div>
                )}

                {tecnicoSeleccionado && (
                  <div className={`text-xs rounded-md px-3 py-2 flex items-center gap-2 border ${
                    conflictos[tecnicoSeleccionado.id_tecnico]
                      ? 'text-orange-700 bg-orange-50 border-orange-200'
                      : 'text-blue-700 bg-blue-50 border-blue-200'
                  }`}>
                    {conflictos[tecnicoSeleccionado.id_tecnico]
                      ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      : <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    }
                    Seleccionado: <strong>{tecnicoSeleccionado.nombre} {tecnicoSeleccionado.apellido}</strong>
                    {conflictos[tecnicoSeleccionado.id_tecnico] && <span className="ml-1">— tiene un compromiso en el horario del cliente</span>}
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
          <div className="space-y-4 min-w-0 overflow-hidden">
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
