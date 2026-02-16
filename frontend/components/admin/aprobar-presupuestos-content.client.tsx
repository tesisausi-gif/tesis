'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FileText, DollarSign, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { aprobarPresupuesto, rechazarPresupuesto } from '@/features/presupuestos/presupuestos.service'
import type { PresupuestoConDetalle } from '@/features/presupuestos/presupuestos.types'

interface Presupuesto extends PresupuestoConDetalle {}

interface AprobarPresupuestosContentProps {
  presupuestosIniciales: PresupuestoConDetalle[]
}

export function AprobarPresupuestosContent({ presupuestosIniciales }: AprobarPresupuestosContentProps) {
    const router = useRouter()

    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>(presupuestosIniciales as Presupuesto[])
    const [procesando, setProcesando] = useState(false)
    const [presupuestoSeleccionado, setPresupuestoSeleccionado] = useState<Presupuesto | null>(null)
    const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null)
    const [comision, setComision] = useState<Record<number, string>>(() => {
        const inicial: Record<number, string> = {}
        presupuestosIniciales.forEach((p: any) => {
            inicial[p.id_presupuesto] = p.gastos_administrativos?.toString() || '0'
        })
        return inicial
    })

    const calcularTotal = (presupuesto: Presupuesto) => {
        const comisionValue = parseFloat(comision[presupuesto.id_presupuesto] || '0')
        return (presupuesto as any).costo_materiales + (presupuesto as any).costo_mano_obra + comisionValue
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
                const result = await aprobarPresupuesto(presupuestoSeleccionado.id_presupuesto)

                if (!result.success) {
                    toast.error('Error', { description: result.error })
                    return
                }

                toast.success('Presupuesto aprobado', {
                    description: 'Enviado al cliente para aprobación final'
                })
            } else {
                const result = await rechazarPresupuesto(presupuestoSeleccionado.id_presupuesto)

                if (!result.success) {
                    toast.error('Error', { description: result.error })
                    return
                }

                toast.success('Presupuesto rechazado', {
                    description: 'Se notificará al técnico'
                })
            }

            // Eliminar de la lista local
            setPresupuestos(prev => prev.filter(p => p.id_presupuesto !== presupuestoSeleccionado.id_presupuesto))
            router.refresh()
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
        if (!(presupuesto as any).inspecciones) return 'Desconocido'
        const insp = Array.isArray((presupuesto as any).inspecciones)
            ? (presupuesto as any).inspecciones[0]
            : (presupuesto as any).inspecciones
        if (!insp?.tecnicos) return 'Desconocido'
        const tec = Array.isArray(insp.tecnicos) ? insp.tecnicos[0] : insp.tecnicos
        return `${tec.nombre} ${tec.apellido}`
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
                                            {(presupuesto as any).descripcion_detallada}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Materiales</p>
                                            <p className="text-sm font-medium">{formatCurrency((presupuesto as any).costo_materiales)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Mano de Obra</p>
                                            <p className="text-sm font-medium">{formatCurrency((presupuesto as any).costo_mano_obra)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Subtotal</p>
                                            <p className="text-sm font-medium">
                                                {formatCurrency((presupuesto as any).costo_materiales + (presupuesto as any).costo_mano_obra)}
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
                                        Creado: {presupuesto.fecha_creacion ? formatDate(presupuesto.fecha_creacion) : 'Sin fecha'}
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
