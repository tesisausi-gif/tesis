'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { MapPin, Calendar, Clock, AlertCircle, Search, CheckCircle, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { estadoIncidenteColors, prioridadColors, EstadoIncidente, NivelPrioridad } from '@/types/enums'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Incidente {
    id_incidente: number
    descripcion_problema: string
    categoria: string | null
    nivel_prioridad: string | null
    estado_actual: string
    fecha_registro: string
    disponibilidad_cliente: string | null
    inmuebles: {
        calle: string | null
        altura: string | null
        piso: string | null
        dpto: string | null
        barrio: string | null
        localidad: string | null
    } | null
    clientes: {
        nombre: string
        apellido: string
        telefono: string | null
    } | null
}

export default function IncidentesDisponiblesPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [incidentes, setIncidentes] = useState<Incidente[]>([])
    const [idTecnico, setIdTecnico] = useState<number | null>(null)
    const [procesando, setProcesando] = useState(false)
    const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<Incidente | null>(null)
    const [modalAceptarOpen, setModalAceptarOpen] = useState(false)
    const [modalRechazarOpen, setModalRechazarOpen] = useState(false)
    const [modalDetalleOpen, setModalDetalleOpen] = useState(false)
    const [incidenteDetalleId, setIncidenteDetalleId] = useState<number | null>(null)

    useEffect(() => {
        cargarIncidentesDisponibles()
    }, [])

    const cargarIncidentesDisponibles = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            // Obtener id_tecnico
            const { data: usuario } = await supabase
                .from('usuarios')
                .select('id_tecnico')
                .eq('id', user.id)
                .single()

            if (!usuario?.id_tecnico) {
                toast.error('No se pudo identificar el técnico')
                return
            }

            setIdTecnico(usuario.id_tecnico)

                            // Cargar asignaciones que fueron hechas al técnico y están pendientes
                                            // id_tecnico ya cargado arriba; usarlo
                            // Obtener asignaciones pendientes para este técnico y traer datos del incidente relacionado
                            const { data: asignacionesData, error: asignError } = await supabase
                                .from('asignaciones_tecnico')
                                .select(`
                                    id_asignacion,
                                    estado_asignacion,
                                    fecha_asignacion,
                                    observaciones,
                                    incidentes(id_incidente, descripcion_problema, categoria, nivel_prioridad, estado_actual, fecha_registro, disponibilidad, inmuebles(calle,altura,piso,dpto,barrio,localidad), clientes:id_cliente_reporta(nombre,apellido,telefono))
                                `)
                                .eq('id_tecnico', usuario.id_tecnico)
                                .eq('estado_asignacion', 'pendiente')
                                .order('fecha_asignacion', { ascending: false })

                            if (asignError) {
                                console.error('Error al cargar asignaciones:', asignError)
                                toast.error('Error al cargar asignaciones')
                                return
                            }

                            // Mapear asignaciones a estructura para la UI
                            const asignacionesMapped = (asignacionesData || []).map((a: any) => {
                                const inc = a.incidentes
                                return {
                                    id_asignacion: a.id_asignacion,
                                    id_incidente: inc?.id_incidente,
                                    descripcion_problema: inc?.descripcion_problema,
                                    categoria: inc?.categoria || null,
                                    nivel_prioridad: inc?.nivel_prioridad || null,
                                    estado_actual: inc?.estado_actual || '',
                                    fecha_registro: inc?.fecha_registro || '',
                                    disponibilidad_cliente: inc?.disponibilidad || null,
                                    inmuebles: inc?.inmuebles || null,
                                    clientes: inc?.clientes || null,
                                    observaciones_asignacion: a.observaciones || null,
                                }
                            })

                            setIncidentes(asignacionesMapped as unknown as Incidente[])
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    const handleAceptarClick = (incidente: Incidente) => {
        setIncidenteSeleccionado(incidente)
        setModalAceptarOpen(true)
    }

    const handleRechazarClick = (incidente: Incidente) => {
        setIncidenteSeleccionado(incidente)
        setModalRechazarOpen(true)
    }

    const handleVerDetalles = (idIncidente: number) => {
        setIncidenteDetalleId(idIncidente)
        setModalDetalleOpen(true)
    }

    const confirmarAceptacion = async () => {
        if (!incidenteSeleccionado || !idTecnico) return

        setProcesando(true)

        try {
            // Actualizar la asignación pendiente a 'aceptada'
            const { error: updateError } = await supabase
                .from('asignaciones_tecnico')
                .update({ estado_asignacion: 'aceptada', fecha_aceptacion: new Date().toISOString() })
                .eq('id_asignacion', (incidenteSeleccionado as any).id_asignacion)

            if (updateError) {
                console.error('Error al aceptar asignación:', updateError)
                toast.error('Error al aceptar la asignación')
                return
            }

            // Actualizar estado del incidente a 'Asignado'
            await supabase
                .from('incidentes')
                .update({ estado_actual: EstadoIncidente.ASIGNADO })
                .eq('id_incidente', incidenteSeleccionado.id_incidente)

            toast.success('Asignación aceptada')
            await cargarIncidentesDisponibles()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error inesperado')
        } finally {
            setProcesando(false)
            setModalAceptarOpen(false)
            setIncidenteSeleccionado(null)
        }
    }

    const confirmarRechazo = async () => {
        if (!incidenteSeleccionado) return

        setProcesando(true)
        try {
            const { error: updateError } = await supabase
                .from('asignaciones_tecnico')
                .update({ estado_asignacion: 'rechazada', fecha_rechazo: new Date().toISOString() })
                .eq('id_asignacion', (incidenteSeleccionado as any).id_asignacion)

            if (updateError) {
                console.error('Error al rechazar asignación:', updateError)
                toast.error('Error al rechazar la asignación')
                return
            }

            // Opcional: dejar el incidente en estado 'Reportado' o similar
            await supabase
                .from('incidentes')
                .update({ estado_actual: EstadoIncidente.REPORTADO })
                .eq('id_incidente', incidenteSeleccionado.id_incidente)

            toast.success('Asignación rechazada')
            await cargarIncidentesDisponibles()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error inesperado')
        } finally {
            setProcesando(false)
            setModalAceptarOpen(false)
            setIncidenteSeleccionado(null)
        }
    }

    const getDireccion = (inmueble: Incidente['inmuebles']) => {
        if (!inmueble) return 'Sin dirección'

        const direccionPartes = [
            inmueble.calle,
            inmueble.altura,
            inmueble.piso && `Piso ${inmueble.piso}`,
            inmueble.dpto && `Dpto ${inmueble.dpto}`
        ].filter(Boolean).join(' ')

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
                <h1 className="text-2xl font-bold text-gray-900">Asignación</h1>
                <p className="text-gray-600 text-sm mt-1">
                    Revisa las asignaciones que te hizo la administración y apróbalas o recházalas
                </p>
            </div>

            {/* Stats */}
            {incidentes.length > 0 && (
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Search className="h-5 w-5 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">
                                    {incidentes.length} {incidentes.length === 1 ? 'asignación pendiente' : 'asignaciones pendientes'}
                                </span>
                            </div>
                            <Badge className="bg-blue-600 text-white">
                                Nuevos trabajos
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Lista de Incidentes */}
            {incidentes.length > 0 ? (
                <div className="space-y-3">
                    {incidentes.map((incidente) => (
                        <Card key={incidente.id_incidente} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                            Incidente #{incidente.id_incidente}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{getDireccion(incidente.inmuebles)}</span>
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                        {incidente.categoria && (
                                            <Badge className={getCategoriaColor(incidente.categoria)}>
                                                {incidente.categoria}
                                            </Badge>
                                        )}
                                        {incidente.nivel_prioridad && (
                                            <Badge className={getPrioridadColor(incidente.nivel_prioridad)}>
                                                {incidente.nivel_prioridad}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                                {/* Descripción */}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Problema:</p>
                                    <p className="text-sm text-gray-700">
                                        {incidente.descripcion_problema}
                                    </p>
                                </div>

                                {/* Disponibilidad del Cliente */}
                                {incidente.disponibilidad_cliente && (
                                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                        <p className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Disponibilidad del cliente:
                                        </p>
                                        <p className="text-sm text-green-800 whitespace-pre-line">
                                            {incidente.disponibilidad_cliente}
                                        </p>
                                    </div>
                                )}

                                {/* Cliente */}
                                {incidente.clientes && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span>Cliente: {incidente.clientes.nombre} {incidente.clientes.apellido}</span>
                                        {incidente.clientes.telefono && (
                                            <span>• Tel: {incidente.clientes.telefono}</span>
                                        )}
                                    </div>
                                )}

                                {/* Fecha */}
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    Reportado: {format(new Date(incidente.fecha_registro), 'dd/MM/yyyy HH:mm', { locale: es })}
                                </div>

                                {/* Botones */}
                                <div className="flex gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => handleVerDetalles(incidente.id_incidente)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver Detalles
                                    </Button>
                                    <div className="flex-1 flex gap-2">
                                        <Button
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                            onClick={() => handleAceptarClick(incidente)}
                                            disabled={procesando}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Aprobar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => handleRechazarClick(incidente)}
                                            disabled={procesando}
                                        >
                                            Rechazar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                /* Empty State */
                <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-slate-50 to-slate-100">
                    <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="rounded-full bg-slate-200 p-4 mb-6">
                            <Search className="h-12 w-12 text-slate-500" />
                        </div>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay asignaciones pendientes
                        </h3>

                        <p className="text-sm text-gray-600 max-w-md">
                            No tienes asignaciones nuevas para aprobar o rechazar.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Modal de Confirmación */}
            <AlertDialog open={modalAceptarOpen} onOpenChange={setModalAceptarOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Aprobar asignación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {incidenteSeleccionado && (
                                <>
                                    Estás por aprobar la asignación para el incidente #{incidenteSeleccionado.id_incidente}.
                                    <br /><br />
                                    <strong>Ubicación:</strong> {getDireccion(incidenteSeleccionado.inmuebles)}
                                    <br />
                                    <strong>Categoría:</strong> {incidenteSeleccionado.categoria || 'No especificada'}
                                    <br /><br />
                                    El incidente quedará asignado a tu usuario.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarAceptacion}
                            disabled={procesando}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {procesando ? 'Procesando...' : 'Aprobar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={modalRechazarOpen} onOpenChange={setModalRechazarOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Rechazar asignación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {incidenteSeleccionado && (
                                <>
                                    Estás por rechazar la asignación para el incidente #{incidenteSeleccionado.id_incidente}.
                                    <br /><br />
                                    Si rechazas, la administración será notificada y podrá reasignar el incidente.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarRechazo}
                            disabled={procesando}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {procesando ? 'Procesando...' : 'Rechazar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Detalle */}
            <IncidenteDetailModal
                incidenteId={incidenteDetalleId}
                open={modalDetalleOpen}
                onOpenChange={setModalDetalleOpen}
                rol="tecnico"
            />
        </motion.div>
    )
}
