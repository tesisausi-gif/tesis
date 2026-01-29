'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FileText, DollarSign, Calendar, CheckCircle, XCircle, Clock, ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'
import { EstadoPresupuesto, EstadoIncidente } from '@/types/enums'

interface Presupuesto {
    id_presupuesto: number
    id_incidente: number
    descripcion_detallada: string
    costo_materiales: number
    costo_mano_obra: number
    gastos_administrativos: number
    costo_total: number
    estado_presupuesto: string
    fecha_aprobacion: string | null
    fecha_creacion: string
    incidentes?: {
        id_incidente: number
        descripcion_problema: string
        categoria: string | null
    }
}

const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
        case 'aprobado':
            return 'bg-green-100 text-green-800'
        case 'rechazado':
            return 'bg-red-100 text-red-800'
        case 'enviado':
            return 'bg-blue-100 text-blue-800'
        case 'aprobado_admin':
            return 'bg-cyan-100 text-cyan-800'
        case 'borrador':
            return 'bg-gray-100 text-gray-800'
        case 'vencido':
            return 'bg-orange-100 text-orange-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

const getEstadoIcon = (estado: string) => {
    switch (estado) {
        case 'aprobado':
            return <CheckCircle className="h-4 w-4" />
        case 'rechazado':
            return <XCircle className="h-4 w-4" />
        case 'enviado':
        case 'borrador':
            return <Clock className="h-4 w-4" />
        default:
            return <FileText className="h-4 w-4" />
    }
}

const getEstadoLabel = (estado: string): string => {
    const labels: Record<string, string> = {
        'borrador': 'Borrador',
        'enviado': 'Enviado',
        'aprobado_admin': 'Aprobado Admin',
        'aprobado': 'Aprobado',
        'rechazado': 'Rechazado',
        'vencido': 'Vencido',
    }
    return labels[estado] || estado
}

export default function PresupuestosClientePage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
    const [idCliente, setIdCliente] = useState<number | null>(null)
    const [procesando, setProcesando] = useState(false)
    const [presupuestoSeleccionado, setPresupuestoSeleccionado] = useState<Presupuesto | null>(null)
    const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null)

    useEffect(() => {
        cargarPresupuestos()
    }, [])

    const cargarPresupuestos = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            // Obtener id_cliente del usuario
            const { data: usuario } = await supabase
                .from('usuarios')
                .select('id_cliente')
                .eq('id', user.id)
                .single()

            if (!usuario?.id_cliente) {
                toast.error('No se pudo identificar el cliente')
                return
            }

            setIdCliente(usuario.id_cliente)

            // Obtener presupuestos de los incidentes del cliente
            const { data, error } = await supabase
                .from('presupuestos')
                .select(`
          *,
          incidentes!inner (
            id_incidente,
            descripcion_problema,
            categoria,
            id_cliente_reporta
          )
        `)
                .eq('incidentes.id_cliente_reporta', usuario.id_cliente)
                .order('fecha_creacion', { ascending: false })

            if (error) {
                console.error('Error al cargar presupuestos:', error)
                toast.error('Error al cargar presupuestos')
                return
            }

            setPresupuestos(data as unknown as Presupuesto[] || [])
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const handleAprobar = (presupuesto: Presupuesto) => {
        setPresupuestoSeleccionado(presupuesto)
        setAccion('aprobar')
    }

    const handleRechazar = (presupuesto: Presupuesto) => {
        setPresupuestoSeleccionado(presupuesto)
        setAccion('rechazar')
    }

    const confirmarAccion = async () => {
        if (!presupuestoSeleccionado || !accion) return

        setProcesando(true)

        try {
            const nuevoEstado = accion === 'aprobar'
                ? 'aprobado'
                : 'rechazado'

            // Actualizar presupuesto
            const { error: errorPresupuesto } = await supabase
                .from('presupuestos')
                .update({
                    estado_presupuesto: nuevoEstado,
                    fecha_aprobacion: accion === 'aprobar' ? new Date().toISOString() : null,
                    id_aprobado_por: accion === 'aprobar' ? idCliente : null,
                })
                .eq('id_presupuesto', presupuestoSeleccionado.id_presupuesto)

            if (errorPresupuesto) {
                console.error('Error al actualizar presupuesto:', errorPresupuesto)
                toast.error('Error al actualizar presupuesto')
                return
            }

            // Si se aprueba, actualizar estado del incidente a 'en_proceso'
            if (accion === 'aprobar') {
                const { error: errorIncidente } = await supabase
                    .from('incidentes')
                    .update({
                        estado_actual: 'en_proceso'
                    })
                    .eq('id_incidente', presupuestoSeleccionado.id_incidente)

                if (errorIncidente) {
                    console.error('Error al actualizar incidente:', errorIncidente)
                }
            }

            toast.success(
                accion === 'aprobar'
                    ? 'Presupuesto aprobado exitosamente'
                    : 'Presupuesto rechazado',
                {
                    description: accion === 'aprobar'
                        ? 'El trabajo puede comenzar'
                        : 'Se notificará al técnico'
                }
            )

            // Recargar presupuestos
            await cargarPresupuestos()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error inesperado')
        } finally {
            setProcesando(false)
            setPresupuestoSeleccionado(null)
            setAccion(null)
        }
    }

    const cancelarAccion = () => {
        setPresupuestoSeleccionado(null)
        setAccion(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando presupuestos...</p>
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
            <Link
                href="/cliente"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Volver al Inicio
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis Presupuestos</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Presupuestos de tus incidentes reportados
                </p>
            </div>

            {presupuestos.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="rounded-full bg-gray-100 p-4 mb-4">
                            <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No tienes presupuestos aún
                        </h3>
                        <p className="text-sm text-gray-600 max-w-md">
                            Los presupuestos aparecerán aquí cuando se generen para tus incidentes reportados.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {presupuestos.map((presupuesto) => (
                        <Card key={presupuesto.id_presupuesto} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                            Presupuesto #{presupuesto.id_presupuesto}
                                        </CardTitle>
                                        <CardDescription>
                                            Incidente #{presupuesto.id_incidente}
                                            {presupuesto.incidentes?.categoria && (
                                                <span className="ml-2">• {presupuesto.incidentes.categoria}</span>
                                            )}
                                        </CardDescription>
                                    </div>
                                    <Badge className={getEstadoBadgeColor(presupuesto.estado_presupuesto)}>
                                        <span className="flex items-center gap-1">
                                            {getEstadoIcon(presupuesto.estado_presupuesto)}
                                            {presupuesto.estado_presupuesto}
                                        </span>
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {presupuesto.incidentes?.descripcion_problema && (
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-500 mb-1">Problema reportado:</p>
                                            <p className="text-sm text-gray-700 line-clamp-2">
                                                {presupuesto.incidentes.descripcion_problema}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Detalle del presupuesto:</p>
                                        <p className="text-sm text-gray-700">
                                            {presupuesto.descripcion_detallada}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Materiales</p>
                                            <p className="text-sm font-medium">{formatCurrency(presupuesto.costo_materiales)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Mano de Obra</p>
                                            <p className="text-sm font-medium">{formatCurrency(presupuesto.costo_mano_obra)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Gastos Admin.</p>
                                            <p className="text-sm font-medium">{formatCurrency(presupuesto.gastos_administrativos)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500 font-semibold">Total</p>
                                            <p className="text-lg font-bold text-blue-600 flex items-center gap-1">
                                                <DollarSign className="h-4 w-4" />
                                                {formatCurrency(presupuesto.costo_total)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Creado: {formatDate(presupuesto.fecha_creacion)}
                                        </div>
                                        {presupuesto.fecha_aprobacion && (
                                            <div className="flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Aprobado: {formatDate(presupuesto.fecha_aprobacion)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Botones de Aprobación/Rechazo */}
                                    {presupuesto.estado_presupuesto === 'aprobado_admin' && (
                                        <div className="flex gap-2 pt-4 border-t">
                                            <Button
                                                onClick={() => handleAprobar(presupuesto)}
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                disabled={procesando}
                                            >
                                                <ThumbsUp className="h-4 w-4 mr-2" />
                                                Aprobar
                                            </Button>
                                            <Button
                                                onClick={() => handleRechazar(presupuesto)}
                                                variant="destructive"
                                                className="flex-1"
                                                disabled={procesando}
                                            >
                                                <ThumbsDown className="h-4 w-4 mr-2" />
                                                Rechazar
                                            </Button>
                                        </div>
                                    )}

                                    {presupuesto.estado_presupuesto === 'enviado' && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                                            <p className="text-sm text-blue-800 font-medium">
                                                ⏳ Presupuesto en revisión por administración.
                                            </p>
                                        </div>
                                    )}

                                    {presupuesto.estado_presupuesto === 'aprobado' && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                                            <p className="text-sm text-green-800 font-medium">
                                                ✓ Presupuesto aprobado. El trabajo puede comenzar.
                                            </p>
                                        </div>
                                    )}

                                    {presupuesto.estado_presupuesto === 'rechazado' && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                                            <p className="text-sm text-red-800 font-medium">
                                                ✗ Presupuesto rechazado.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            {/* Dialog de Confirmación */}
            <AlertDialog open={accion !== null} onOpenChange={(open) => !open && cancelarAccion()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {accion === 'aprobar' ? '¿Aprobar presupuesto?' : '¿Rechazar presupuesto?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {accion === 'aprobar' ? (
                                <>
                                    Estás por aprobar el presupuesto #{presupuestoSeleccionado?.id_presupuesto} por un total de{' '}
                                    <strong className="text-green-600">
                                        {presupuestoSeleccionado && formatCurrency(presupuestoSeleccionado.costo_total)}
                                    </strong>.
                                    <br /><br />
                                    Al aprobar, el técnico podrá comenzar con el trabajo.
                                </>
                            ) : (
                                <>
                                    Estás por rechazar el presupuesto #{presupuestoSeleccionado?.id_presupuesto}.
                                    <br /><br />
                                    Se notificará al técnico para que revise y ajuste el presupuesto.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarAccion}
                            disabled={procesando}
                            className={accion === 'aprobar' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                            {procesando ? 'Procesando...' : (accion === 'aprobar' ? 'Aprobar' : 'Rechazar')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    )
}
