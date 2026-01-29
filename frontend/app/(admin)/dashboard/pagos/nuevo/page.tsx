'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, DollarSign, Receipt, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TipoPago, MetodoPago, EstadoPresupuesto } from '@/types/enums'

interface Presupuesto {
    id_presupuesto: number
    id_incidente: number
    costo_total: number
    estado_presupuesto: string
    descripcion_detallada: string
    incidentes: {
        id_incidente: number
        descripcion_problema: string
        categoria: string | null
    }
}

interface PagoExistente {
    monto_pagado: number
}

export default function NuevoPagoPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
    const [pagosExistentes, setPagosExistentes] = useState<Record<number, number>>({})

    // Form state
    const [presupuestoSeleccionado, setPresupuestoSeleccionado] = useState('')
    const [montoPagado, setMontoPagado] = useState('')
    const [tipoPago, setTipoPago] = useState('total')
    const [metodoPago, setMetodoPago] = useState('transferencia')
    const [numeroComprobante, setNumeroComprobante] = useState('')
    const [observaciones, setObservaciones] = useState('')

    useEffect(() => {
        cargarDatos()
    }, [])

    useEffect(() => {
        if (presupuestoSeleccionado) {
            const presupuesto = presupuestos.find(
                p => p.id_presupuesto === parseInt(presupuestoSeleccionado)
            )
            if (presupuesto && tipoPago === 'total') {
                const montoPendiente = calcularMontoPendiente(presupuesto.id_presupuesto, presupuesto.costo_total)
                setMontoPagado(montoPendiente.toString())
            }
        }
    }, [presupuestoSeleccionado, tipoPago])

    const cargarDatos = async () => {
        try {
            // Cargar presupuestos aprobados
            const { data: presupuestosData, error } = await supabase
                .from('presupuestos')
                .select(`
          id_presupuesto,
          id_incidente,
          costo_total,
          estado_presupuesto,
          descripcion_detallada,
          incidentes (
            id_incidente,
            descripcion_problema,
            categoria
          )
        `)
                .eq('estado_presupuesto', EstadoPresupuesto.APROBADO)
                .order('id_presupuesto', { ascending: false })

            if (error) {
                console.error('Error al cargar presupuestos:', error)
                toast.error('Error al cargar presupuestos')
                return
            }

            setPresupuestos(presupuestosData as unknown as Presupuesto[] || [])

            // Cargar pagos existentes para calcular montos pendientes
            const { data: pagosData } = await supabase
                .from('pagos')
                .select('id_presupuesto, monto_pagado')

            if (pagosData) {
                const pagosMap: Record<number, number> = {}
                pagosData.forEach((pago: any) => {
                    pagosMap[pago.id_presupuesto] = (pagosMap[pago.id_presupuesto] || 0) + pago.monto_pagado
                })
                setPagosExistentes(pagosMap)
            }
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    const calcularMontoPendiente = (idPresupuesto: number, costoTotal: number) => {
        const pagado = pagosExistentes[idPresupuesto] || 0
        return Math.max(0, costoTotal - pagado)
    }

    const getPresupuestoSeleccionado = () => {
        return presupuestos.find(p => p.id_presupuesto === parseInt(presupuestoSeleccionado))
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
        }).format(amount)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!presupuestoSeleccionado) {
            toast.error('Selecciona un presupuesto')
            return
        }

        if (!montoPagado || parseFloat(montoPagado) <= 0) {
            toast.error('Ingresa un monto válido')
            return
        }

        const presupuesto = getPresupuestoSeleccionado()
        if (!presupuesto) return

        const monto = parseFloat(montoPagado)
        const montoPendiente = calcularMontoPendiente(presupuesto.id_presupuesto, presupuesto.costo_total)

        if (monto > montoPendiente) {
            toast.error('El monto excede el monto pendiente', {
                description: `Monto pendiente: ${formatCurrency(montoPendiente)}`
            })
            return
        }

        setSubmitting(true)

        try {
            const { data, error } = await supabase
                .from('pagos')
                .insert({
                    id_incidente: presupuesto.id_incidente,
                    id_presupuesto: parseInt(presupuestoSeleccionado),
                    monto_pagado: monto,
                    tipo_pago: tipoPago,
                    metodo_pago: metodoPago,
                    numero_comprobante: numeroComprobante.trim() || null,
                    observaciones: observaciones.trim() || null,
                    fecha_pago: new Date().toISOString(),
                })
                .select()
                .single()

            if (error) {
                console.error('Error al registrar pago:', error)
                toast.error('Error al registrar pago', {
                    description: error.message
                })
                return
            }

            toast.success('Pago registrado exitosamente', {
                description: `Pago #${data.id_pago} por ${formatCurrency(monto)}`
            })

            router.push('/dashboard/pagos')
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error inesperado')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando...</p>
                </div>
            </div>
        )
    }

    if (presupuestos.length === 0) {
        return (
            <div className="space-y-6">
                <Link
                    href="/dashboard/pagos"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a Pagos
                </Link>

                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="rounded-full bg-gray-100 p-4 mb-4">
                            <DollarSign className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay presupuestos aprobados
                        </h3>
                        <p className="text-sm text-gray-600 max-w-md">
                            No hay presupuestos aprobados disponibles para registrar pagos.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const presupuesto = getPresupuestoSeleccionado()
    const montoPendiente = presupuesto ? calcularMontoPendiente(presupuesto.id_presupuesto, presupuesto.costo_total) : 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <Link
                href="/dashboard/pagos"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Volver a Pagos
            </Link>

            <div>
                <h1 className="text-3xl font-bold text-gray-900">Registrar Pago</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Registrar un nuevo pago para un presupuesto aprobado
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-green-600" />
                        Información del Pago
                    </CardTitle>
                    <CardDescription>
                        Completa los detalles del pago. Los campos marcados con * son obligatorios.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Selección de Presupuesto */}
                        <div className="space-y-2">
                            <Label htmlFor="presupuesto">Presupuesto Aprobado *</Label>
                            <Select
                                value={presupuestoSeleccionado}
                                onValueChange={setPresupuestoSeleccionado}
                                disabled={submitting}
                            >
                                <SelectTrigger id="presupuesto">
                                    <SelectValue placeholder="Selecciona el presupuesto" />
                                </SelectTrigger>
                                <SelectContent>
                                    {presupuestos.map((pres) => {
                                        const pendiente = calcularMontoPendiente(pres.id_presupuesto, pres.costo_total)
                                        return (
                                            <SelectItem
                                                key={pres.id_presupuesto}
                                                value={pres.id_presupuesto.toString()}
                                            >
                                                <div>
                                                    <div className="font-medium">
                                                        Presupuesto #{pres.id_presupuesto} - Incidente #{pres.id_incidente}
                                                        {pres.incidentes.categoria && ` - ${pres.incidentes.categoria}`}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Total: {formatCurrency(pres.costo_total)} | Pendiente: {formatCurrency(pendiente)}
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Información del Presupuesto Seleccionado */}
                        {presupuesto && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium text-blue-900">
                                            Presupuesto #{presupuesto.id_presupuesto}
                                        </p>
                                        <p className="text-xs text-blue-700">
                                            {presupuesto.descripcion_detallada}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                            <div>
                                                <p className="text-xs text-blue-600">Total</p>
                                                <p className="text-sm font-semibold text-blue-900">
                                                    {formatCurrency(presupuesto.costo_total)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600">Pendiente</p>
                                                <p className="text-sm font-semibold text-blue-900">
                                                    {formatCurrency(montoPendiente)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tipo y Método de Pago */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tipoPago">Tipo de Pago *</Label>
                                <Select
                                    value={tipoPago}
                                    onValueChange={setTipoPago}
                                    disabled={submitting}
                                >
                                    <SelectTrigger id="tipoPago">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="total">Total</SelectItem>
                                        <SelectItem value="parcial">Parcial</SelectItem>
                                        <SelectItem value="adelanto">Adelanto</SelectItem>
                                        <SelectItem value="reembolso">Reembolso</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="metodoPago">Método de Pago *</Label>
                                <Select
                                    value={metodoPago}
                                    onValueChange={setMetodoPago}
                                    disabled={submitting}
                                >
                                    <SelectTrigger id="metodoPago">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="efectivo">Efectivo</SelectItem>
                                        <SelectItem value="transferencia">Transferencia</SelectItem>
                                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                        <SelectItem value="cheque">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Monto */}
                        <div className="space-y-2">
                            <Label htmlFor="monto">Monto Pagado *</Label>
                            <Input
                                id="monto"
                                type="number"
                                step="0.01"
                                min="0"
                                max={montoPendiente}
                                value={montoPagado}
                                onChange={(e) => setMontoPagado(e.target.value)}
                                placeholder="0.00"
                                disabled={submitting}
                            />
                            {presupuesto && (
                                <p className="text-xs text-gray-500">
                                    Máximo: {formatCurrency(montoPendiente)}
                                </p>
                            )}
                        </div>

                        {/* Número de Comprobante */}
                        <div className="space-y-2">
                            <Label htmlFor="comprobante">Número de Comprobante</Label>
                            <Input
                                id="comprobante"
                                value={numeroComprobante}
                                onChange={(e) => setNumeroComprobante(e.target.value)}
                                placeholder="Ej: 001-00001234"
                                disabled={submitting}
                            />
                        </div>

                        {/* Observaciones */}
                        <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones</Label>
                            <Textarea
                                id="observaciones"
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                placeholder="Notas adicionales sobre el pago..."
                                rows={3}
                                disabled={submitting}
                            />
                        </div>

                        {/* Botones */}
                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => router.back()}
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="w-full sm:flex-1 bg-green-600 hover:bg-green-700"
                                disabled={submitting}
                            >
                                {submitting ? 'Registrando...' : 'Registrar Pago'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    )
}
