'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FileText, DollarSign, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { EstadoPresupuesto } from '@/types/enums'

interface Presupuesto {
    id_presupuesto: number
    id_incidente: number
    id_inspeccion: number | null
    descripcion_detallada: string
    costo_materiales: number
    costo_mano_obra: number
    gastos_administrativos: number
    costo_total: number
    estado_presupuesto: string
    fecha_creacion: string
    incidentes?: {
        id_incidente: number
        descripcion_problema: string
        categoria: string | null
    }
    inspecciones?: {
        id_tecnico: number
        tecnicos?: {
            nombre: string
            apellido: string
        }
    }
}

export default function AprobarPresupuestosPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
    const [procesando, setProcesando] = useState(false)
    const [presupuestoSeleccionado, setPresupuestoSeleccionado] = useState<Presupuesto | null>(null)
    const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null)
    const [comision, setComision] = useState<Record<number, string>>({})

    useEffect(() => {
        cargarPresupuestos()
    }, [])

    const cargarPresupuestos = async () => {
        try {
            const { data, error } = await supabase
                .from('presupuestos')
                .select(`
          *,
          incidentes (
            id_incidente,
            descripcion_problema,
            categoria
          ),
          inspecciones (
            id_tecnico,
            tecnicos (
              nombre,
              apellido
            )
          )
        `)
                .eq('estado_presupuesto', EstadoPresupuesto.ENVIADO)
                .order('fecha_creacion', { ascending: false })

            if (error) {
                console.error('Error al cargar presupuestos:', error)
                toast.error('Error al cargar presupuestos')
                return
            }

            setPresupuestos(data as unknown as Presupuesto[] || [])

            // Inicializar comisiones en 0
            const comisionesIniciales: Record<number, string> = {}
            data?.forEach(p => {
                comisionesIniciales[p.id_presupuesto] = p.gastos_administrativos.toString()
            })
            setComision(comisionesIniciales)
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    const calcularTotal = (presupuesto: Presupuesto) => {
        const comisionValue = parseFloat(comision[presupuesto.id_presupuesto] || '0')
        return presupuesto.costo_materiales + presupuesto.costo_mano_obra + comisionValue
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
            if (accion === 'aprobar') {
                const comisionValue = parseFloat(comision[presupuestoSeleccionado.id_presupuesto] || '0')
                const nuevoTotal = calcularTotal(presupuestoSeleccionado)

                const { error } = await supabase
                    .from('presupuestos')
                    .update({
                        estado_presupuesto: EstadoPresupuesto.APROBADO_ADMIN,
                        gastos_administrativos: comisionValue,
                        costo_total: nuevoTotal,
                    })
                    .eq('id_presupuesto', presupuestoSeleccionado.id_presupuesto)

                if (error) {
                    console.error('Error al aprobar presupuesto:', error)
                    toast.error('Error al aprobar presupuesto')
                    return
                }

                toast.success('Presupuesto aprobado', {
                    description: 'Enviado al cliente para aprobación final'
                })
            } else {
                const { error } = await supabase
                    .from('presupuestos')
                    .update({
                        estado_presupuesto: EstadoPresupuesto.RECHAZADO,
                    })
                    .eq('id_presupuesto', presupuestoSeleccionado.id_presupuesto)

                if (error) {
                    console.error('Error al rechazar presupuesto:', error)
                    toast.error('Error al rechazar presupuesto')
                    return
                }

                toast.success('Presupuesto rechazado', {
                    description: 'Se notificará al técnico'
                })
            }

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

    const getTecnicoNombre = (presupuesto: Presupuesto) => {
        if (!presupuesto.inspecciones) return 'Desconocido'
        const insp = Array.isArray(presupuesto.inspecciones)
            ? presupuesto.inspecciones[0]
            : presupuesto.inspecciones
        if (!insp?.tecnicos) return 'Desconocido'
        const tec = Array.isArray(insp.tecnicos) ? insp.tecnicos[0] : insp.tecnicos
        return `${tec.nombre} ${tec.apellido}`
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
            className="space-y-6"
        >
            <Link
                href="/dashboard/presupuestos"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Volver a Presupuestos
            </Link>

            <div>
                <h1 className="text-3xl font-bold text-gray-900">Aprobar Presupuestos</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Revisa y aprueba presupuestos enviados por técnicos
                </p>
            </div>

            {presupuestos.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="rounded-full bg-gray-100 p-4 mb-4">
                            <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay presupuestos pendientes
                        </h3>
                        <p className="text-sm text-gray-600 max-w-md">
                            No hay presupuestos enviados por técnicos esperando aprobación.
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
                                            <br />
                                            Técnico: {getTecnicoNombre(presupuesto)}
                                        </CardDescription>
                                    </div>
                                    <Badge className="bg-blue-100 text-blue-800">
                                        Pendiente Aprobación
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {presupuesto.incidentes?.descripcion_problema && (
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-500 mb-1">Problema:</p>
                                            <p className="text-sm text-gray-700 line-clamp-2">
                                                {presupuesto.incidentes.descripcion_problema}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Presupuesto del técnico:</p>
                                        <p className="text-sm text-gray-700">
                                            {presupuesto.descripcion_detallada}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Materiales</p>
                                            <p className="text-sm font-medium">{formatCurrency(presupuesto.costo_materiales)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Mano de Obra</p>
                                            <p className="text-sm font-medium">{formatCurrency(presupuesto.costo_mano_obra)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Subtotal</p>
                                            <p className="text-sm font-medium">
                                                {formatCurrency(presupuesto.costo_materiales + presupuesto.costo_mano_obra)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Campo de Comisión */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                                        <Label htmlFor={`comision-${presupuesto.id_presupuesto}`} className="text-sm font-medium">
                                            Gastos Administrativos / Comisión
                                        </Label>
                                        <Input
                                            id={`comision-${presupuesto.id_presupuesto}`}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={comision[presupuesto.id_presupuesto] || '0'}
                                            onChange={(e) => setComision({
                                                ...comision,
                                                [presupuesto.id_presupuesto]: e.target.value
                                            })}
                                            placeholder="0.00"
                                            className="max-w-xs"
                                        />
                                    </div>

                                    {/* Total Final */}
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">Total al Cliente</span>
                                            <span className="text-2xl font-bold text-green-600 flex items-center gap-1">
                                                <DollarSign className="h-5 w-5" />
                                                {formatCurrency(calcularTotal(presupuesto))}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-500">
                                        Creado: {formatDate(presupuesto.fecha_creacion)}
                                    </div>

                                    {/* Botones */}
                                    <div className="flex gap-2 pt-4 border-t">
                                        <Button
                                            onClick={() => handleAprobar(presupuesto)}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                            disabled={procesando}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Aprobar y Enviar al Cliente
                                        </Button>
                                        <Button
                                            onClick={() => handleRechazar(presupuesto)}
                                            variant="destructive"
                                            className="flex-1"
                                            disabled={procesando}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Rechazar
                                        </Button>
                                    </div>
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
                                        {presupuestoSeleccionado && formatCurrency(calcularTotal(presupuestoSeleccionado))}
                                    </strong>.
                                    <br /><br />
                                    Este presupuesto será enviado al cliente para su aprobación final.
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
