'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FileText, DollarSign, Calendar, CheckCircle, XCircle, Clock, ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'
import { aprobarPresupuestoCliente, rechazarPresupuestoCliente } from '@/features/presupuestos/presupuestos.service'

interface Presupuesto {
    id_presupuesto: number
    id_incidente: number
    descripcion_detallada: string
    costo_total: number
    estado_presupuesto: string
    fecha_creacion: string
    incidentes?: {
        id_incidente: number
        descripcion_problema: string
        categoria: string | null
    }
}

const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
        case 'aprobado': return 'bg-green-100 text-green-800'
        case 'rechazado': return 'bg-red-100 text-red-800'
        case 'aprobado_admin': return 'bg-amber-100 text-amber-800'
        case 'enviado': return 'bg-blue-100 text-blue-800'
        default: return 'bg-gray-100 text-gray-800'
    }
}

const getEstadoLabel = (estado: string): string => ({
    'enviado': 'En revisión',
    'aprobado_admin': 'Pendiente tu aprobación',
    'aprobado': 'Aprobado',
    'rechazado': 'Rechazado',
    'vencido': 'Vencido',
} as Record<string, string>)[estado] || estado

const getEstadoIcon = (estado: string) => {
    if (estado === 'aprobado') return <CheckCircle className="h-4 w-4" />
    if (estado === 'rechazado') return <XCircle className="h-4 w-4" />
    return <Clock className="h-4 w-4" />
}

export default function PresupuestosClientePage() {
    const router = useRouter()
    const supabase = createClient()
    const [isPending, startTransition] = useTransition()
    const [loading, setLoading] = useState(true)
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
    const [presupuestoSeleccionado, setPresupuestoSeleccionado] = useState<Presupuesto | null>(null)
    const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null)

    useEffect(() => { cargarPresupuestos() }, [])

    const cargarPresupuestos = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }

            const { data: usuario } = await supabase
                .from('usuarios').select('id_cliente').eq('id', user.id).single()
            if (!usuario?.id_cliente) { toast.error('No se pudo identificar el cliente'); return }

            const { data, error } = await supabase
                .from('presupuestos')
                .select(`
                    id_presupuesto, id_incidente, descripcion_detallada,
                    costo_total, estado_presupuesto, fecha_creacion,
                    incidentes!inner (id_incidente, descripcion_problema, categoria, id_cliente_reporta)
                `)
                .eq('incidentes.id_cliente_reporta', usuario.id_cliente)
                .order('fecha_creacion', { ascending: false })

            if (error) { toast.error('Error al cargar presupuestos'); return }
            setPresupuestos(data as unknown as Presupuesto[] || [])
        } catch { toast.error('Error inesperado') }
        finally { setLoading(false) }
    }

    const fmt = (amount: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

    const confirmarAccion = () => {
        if (!presupuestoSeleccionado || !accion) return
        startTransition(async () => {
            const fn = accion === 'aprobar' ? aprobarPresupuestoCliente : rechazarPresupuestoCliente
            const result = await fn(presupuestoSeleccionado.id_presupuesto)
            if (!result.success) {
                toast.error(result.error ?? 'Error al procesar')
            } else {
                toast.success(
                    accion === 'aprobar' ? 'Presupuesto aprobado' : 'Presupuesto rechazado',
                    { description: accion === 'aprobar' ? 'El técnico fue notificado para comenzar el trabajo' : 'El incidente quedó finalizado' }
                )
                await cargarPresupuestos()
            }
            setPresupuestoSeleccionado(null)
            setAccion(null)
        })
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Cargando presupuestos...</p>
            </div>
        </div>
    )

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="space-y-4 px-4 py-6">
            <Link href="/cliente" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Volver al Inicio
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis Presupuestos</h1>
                <p className="text-sm text-gray-600 mt-1">Presupuestos de tus incidentes reportados</p>
            </div>

            {presupuestos.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="rounded-full bg-gray-100 p-4 mb-4">
                            <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes presupuestos aún</h3>
                        <p className="text-sm text-gray-600 max-w-md">Los presupuestos aparecerán aquí cuando se generen para tus incidentes.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {presupuestos.map((p) => (
                        <Card key={p.id_presupuesto} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                            Presupuesto #{p.id_presupuesto}
                                        </CardTitle>
                                        <CardDescription>
                                            Incidente #{p.id_incidente}
                                            {p.incidentes?.categoria && <span className="ml-2">• {p.incidentes.categoria}</span>}
                                        </CardDescription>
                                    </div>
                                    <Badge className={getEstadoBadgeColor(p.estado_presupuesto)}>
                                        <span className="flex items-center gap-1">
                                            {getEstadoIcon(p.estado_presupuesto)}
                                            {getEstadoLabel(p.estado_presupuesto)}
                                        </span>
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {p.incidentes?.descripcion_problema && (
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Problema reportado:</p>
                                        <p className="text-sm text-gray-700 line-clamp-2">{p.incidentes.descripcion_problema}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Detalle del trabajo:</p>
                                    <p className="text-sm text-gray-700">{p.descripcion_detallada}</p>
                                </div>

                                {/* Solo muestra el total, sin desglose interno */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Total a abonar</span>
                                        <span className="text-2xl font-bold text-blue-600 flex items-center gap-1">
                                            <DollarSign className="h-5 w-5" />
                                            {fmt(p.costo_total)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    Creado: {new Date(p.fecha_creacion).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>

                                {/* Botones solo cuando está pendiente de aprobación del cliente */}
                                {p.estado_presupuesto === 'aprobado_admin' && (
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button onClick={() => { setPresupuestoSeleccionado(p); setAccion('aprobar') }}
                                            className="flex-1 bg-green-600 hover:bg-green-700" disabled={isPending}>
                                            <ThumbsUp className="h-4 w-4 mr-2" />
                                            Aprobar
                                        </Button>
                                        <Button onClick={() => { setPresupuestoSeleccionado(p); setAccion('rechazar') }}
                                            variant="destructive" className="flex-1" disabled={isPending}>
                                            <ThumbsDown className="h-4 w-4 mr-2" />
                                            Rechazar
                                        </Button>
                                    </div>
                                )}

                                {p.estado_presupuesto === 'enviado' && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-sm text-blue-800 font-medium">⏳ En revisión por la administración.</p>
                                    </div>
                                )}
                                {p.estado_presupuesto === 'aprobado' && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <p className="text-sm text-green-800 font-medium">✓ Aprobado. El técnico fue notificado para comenzar.</p>
                                    </div>
                                )}
                                {p.estado_presupuesto === 'rechazado' && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-sm text-red-800 font-medium">✗ Presupuesto rechazado. El incidente fue cerrado.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AlertDialog open={accion !== null} onOpenChange={(open) => !open && (setAccion(null), setPresupuestoSeleccionado(null))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {accion === 'aprobar' ? '¿Aprobar presupuesto?' : '¿Rechazar presupuesto?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {accion === 'aprobar' ? (
                                <>
                                    Estás por aprobar el presupuesto #{presupuestoSeleccionado?.id_presupuesto} por un total de{' '}
                                    <strong className="text-green-600">{presupuestoSeleccionado && fmt(presupuestoSeleccionado.costo_total)}</strong>.
                                    <br /><br />
                                    El técnico será notificado para comenzar el trabajo.
                                </>
                            ) : (
                                <>
                                    Estás por rechazar el presupuesto #{presupuestoSeleccionado?.id_presupuesto}.
                                    <br /><br />
                                    <strong>El incidente quedará finalizado</strong> y no se podrá continuar con este servicio.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmarAccion} disabled={isPending}
                            className={accion === 'aprobar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
                            {isPending ? 'Procesando...' : accion === 'aprobar' ? 'Aprobar' : 'Rechazar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    )
}
