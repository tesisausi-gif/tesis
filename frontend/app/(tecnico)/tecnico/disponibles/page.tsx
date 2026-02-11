'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { MapPin, Calendar, Clock, AlertCircle, Search, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { prioridadColors, NivelPrioridad } from '@/shared/types/enums'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getAsignacionesPendientes, aceptarAsignacion, rechazarAsignacion } from '@/features/asignaciones/asignaciones.service'
import type { Asignacion } from '@/features/asignaciones/asignaciones.types'

type AsignacionDisplay = Asignacion

export default function IncidentesDisponiblesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [asignaciones, setAsignaciones] = useState<AsignacionDisplay[]>([])
  const [procesando, setProcesando] = useState(false)
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<AsignacionDisplay | null>(null)
  const [accion, setAccion] = useState<'aceptar' | 'rechazar' | null>(null)
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false)
  const [incidenteDetalleId, setIncidenteDetalleId] = useState<number | null>(null)

  useEffect(() => {
    cargarAsignacionesPendientes()
  }, [])

  const cargarAsignacionesPendientes = async () => {
    try {
      const data = await getAsignacionesPendientes()
      setAsignaciones(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar asignaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleAceptarClick = (asignacion: AsignacionDisplay) => {
    setAsignacionSeleccionada(asignacion)
    setAccion('aceptar')
  }

  const handleRechazarClick = (asignacion: AsignacionDisplay) => {
    setAsignacionSeleccionada(asignacion)
    setAccion('rechazar')
  }

  const handleVerDetalles = (idIncidente: number) => {
    setIncidenteDetalleId(idIncidente)
    setModalDetalleOpen(true)
  }

  const confirmarAccion = async () => {
    if (!asignacionSeleccionada || !accion) return

    setProcesando(true)

    try {
      if (accion === 'aceptar') {
        const result = await aceptarAsignacion(
          asignacionSeleccionada.id_asignacion,
          asignacionSeleccionada.id_incidente
        )

        if (!result.success) {
          toast.error('Error', { description: result.error })
          return
        }

        toast.success('Asignación aceptada')
      } else {
        const result = await rechazarAsignacion(
          asignacionSeleccionada.id_asignacion,
          asignacionSeleccionada.id_incidente
        )

        if (!result.success) {
          toast.error('Error', { description: result.error })
          return
        }

        toast.success('Asignación rechazada')
      }

      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    } finally {
      setProcesando(false)
      setAsignacionSeleccionada(null)
      setAccion(null)
    }
  }

  const cancelarAccion = () => {
    setAsignacionSeleccionada(null)
    setAccion(null)
  }

  const getDireccion = (incidente: AsignacionDisplay['incidentes']) => {
    if (!incidente?.inmuebles) return 'Sin dirección'

    const inmueble = incidente.inmuebles
    const direccionPartes = [
      inmueble.calle,
      inmueble.altura,
      inmueble.piso && `Piso ${inmueble.piso}`,
      inmueble.dpto && `Dpto ${inmueble.dpto}`,
    ]
      .filter(Boolean)
      .join(' ')

    const ubicacion = [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ')

    return ubicacion ? `${direccionPartes}, ${ubicacion}` : direccionPartes || 'Sin dirección'
  }

  const getPrioridadColor = (prioridad: string) => {
    return prioridadColors[prioridad as NivelPrioridad] || 'bg-gray-100 text-gray-800'
  }

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      'Plomería': 'bg-blue-100 text-blue-800',
      'Electricidad': 'bg-yellow-100 text-yellow-800',
      'Albañilería': 'bg-gray-100 text-gray-800',
      'Pintura': 'bg-purple-100 text-purple-800',
      'Carpintería': 'bg-amber-100 text-amber-800',
      'Herrería': 'bg-slate-100 text-slate-800',
      'Otros': 'bg-gray-100 text-gray-800',
    }
    return colors[categoria] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando asignaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 px-4 py-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asignaciones Pendientes</h1>
        <p className="text-gray-600 text-sm mt-1">
          Revisa las asignaciones que te hizo la administración y apróbalas o recházalas
        </p>
      </div>

      {/* Stats */}
      {asignaciones.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {asignaciones.length} {asignaciones.length === 1 ? 'asignación pendiente' : 'asignaciones pendientes'}
                </span>
              </div>
              <Badge className="bg-blue-600 text-white">Nuevos trabajos</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Asignaciones */}
      {asignaciones.length > 0 ? (
        <div className="space-y-3">
          {asignaciones.map((asignacion) => (
            asignacion.incidentes && (
            <Card key={asignacion.id_asignacion} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      Incidente #{asignacion.incidentes.id_incidente}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{getDireccion(asignacion.incidentes)}</span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    {asignacion.incidentes.categoria && (
                      <Badge className={getCategoriaColor(asignacion.incidentes.categoria)}>
                        {asignacion.incidentes.categoria}
                      </Badge>
                    )}
                    {asignacion.incidentes.nivel_prioridad && (
                      <Badge className={getPrioridadColor(asignacion.incidentes.nivel_prioridad)}>
                        {asignacion.incidentes.nivel_prioridad}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Descripción */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Problema:</p>
                  <p className="text-sm text-gray-700">{asignacion.incidentes.descripcion_problema}</p>
                </div>

                {/* Disponibilidad del Cliente */}
                {asignacion.incidentes.disponibilidad && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Disponibilidad del cliente:
                    </p>
                    <p className="text-sm text-green-800 whitespace-pre-line">
                      {asignacion.incidentes.disponibilidad}
                    </p>
                  </div>
                )}

                {/* Cliente */}
                {asignacion.incidentes.clientes && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>
                      Cliente: {asignacion.incidentes.clientes.nombre} {asignacion.incidentes.clientes.apellido}
                    </span>
                    {asignacion.incidentes.clientes.telefono && <span>• Tel: {asignacion.incidentes.clientes.telefono}</span>}
                  </div>
                )}

                {/* Fecha */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  Asignado: {format(new Date(asignacion.fecha_asignacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                </div>

                {/* Botones */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleVerDetalles(asignacion.incidentes!.id_incidente)}
                  >
                    Ver Detalles
                  </Button>
                  <div className="flex-1 flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleAceptarClick(asignacion)}
                      disabled={procesando}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRechazarClick(asignacion)}
                      disabled={procesando}
                    >
                      Rechazar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-slate-200 p-4 mb-6">
              <Search className="h-12 w-12 text-slate-500" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay asignaciones pendientes</h3>

            <p className="text-sm text-gray-600 max-w-md">
              No tienes asignaciones nuevas para aprobar o rechazar. Vuelve más tarde.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Confirmación - Aceptar */}
      <AlertDialog open={accion === 'aceptar'} onOpenChange={(open) => !open && cancelarAccion()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar asignación?</AlertDialogTitle>
            <AlertDialogDescription>
              {asignacionSeleccionada?.incidentes && (
                <>
                  Estás por aprobar la asignación para el incidente #{asignacionSeleccionada.incidentes.id_incidente}.
                  <br />
                  <br />
                  <strong>Ubicación:</strong> {getDireccion(asignacionSeleccionada.incidentes)}
                  <br />
                  <strong>Categoría:</strong> {asignacionSeleccionada.incidentes.categoria || 'No especificada'}
                  <br />
                  <br />
                  El incidente quedará asignado a tu usuario.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarAccion}
              disabled={procesando}
              className="bg-green-600 hover:bg-green-700"
            >
              {procesando ? 'Procesando...' : 'Aprobar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmación - Rechazar */}
      <AlertDialog open={accion === 'rechazar'} onOpenChange={(open) => !open && cancelarAccion()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rechazar asignación?</AlertDialogTitle>
            <AlertDialogDescription>
              {asignacionSeleccionada?.incidentes && (
                <>
                  Estás por rechazar la asignación para el incidente #{asignacionSeleccionada.incidentes.id_incidente}.
                  <br />
                  <br />
                  Si rechazas, la administración será notificada y podrá reasignar el incidente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarAccion}
              disabled={procesando}
              className="bg-red-600 hover:bg-red-700"
            >
              {procesando ? 'Procesando...' : 'Rechazar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Detalle */}
      <IncidenteDetailModal incidenteId={incidenteDetalleId} open={modalDetalleOpen} onOpenChange={setModalDetalleOpen} rol="tecnico" />
    </motion.div>
  )
}
