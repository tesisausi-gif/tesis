'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, CreditCard, Calendar, FileText, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { TipoPago, MetodoPago } from '@/shared/types/enums'

interface Pago {
    id_pago: number
    id_incidente: number
    id_presupuesto: number
    monto_pagado: number
    tipo_pago: string
    fecha_pago: string
    metodo_pago: string
    numero_comprobante: string | null
    observaciones: string | null
    fecha_creacion: string
    incidentes?: {
        id_incidente: number
        descripcion_problema: string
        categoria: string | null
    }
    presupuestos?: {
        id_presupuesto: number
        costo_total: number
    }
}

const getTipoPagoBadgeColor = (tipo: string) => {
    switch (tipo) {
        case TipoPago.TOTAL:
            return 'bg-green-100 text-green-800'
        case TipoPago.PARCIAL:
            return 'bg-blue-100 text-blue-800'
        case TipoPago.ADELANTO:
            return 'bg-yellow-100 text-yellow-800'
        case TipoPago.REEMBOLSO:
            return 'bg-purple-100 text-purple-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

const getMetodoPagoIcon = (metodo: string) => {
    switch (metodo) {
        case MetodoPago.TARJETA:
            return <CreditCard className="h-4 w-4" />
        case MetodoPago.EFECTIVO:
            return <DollarSign className="h-4 w-4" />
        case MetodoPago.TRANSFERENCIA:
            return <Receipt className="h-4 w-4" />
        default:
            return <FileText className="h-4 w-4" />
    }
}

export default function PagosPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [pagos, setPagos] = useState<Pago[]>([])

    useEffect(() => {
        cargarPagos()
    }, [])

    const cargarPagos = async () => {
        try {
            const { data, error } = await supabase
                .from('pagos')
                .select(`
          *,
          incidentes (
            id_incidente,
            descripcion_problema,
            categoria
          ),
          presupuestos (
            id_presupuesto,
            costo_total
          )
        `)
                .order('fecha_pago', { ascending: false })

            if (error) {
                console.error('Error al cargar pagos:', error)
                toast.error('Error al cargar pagos')
                return
            }

            setPagos(data as unknown as Pago[] || [])
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

    const calcularTotalPagos = () => {
        return pagos.reduce((sum, pago) => sum + pago.monto_pagado, 0)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando pagos...</p>
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
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Registro de pagos realizados
                    </p>
                </div>
                {pagos.length > 0 && (
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-xs text-gray-600 mb-1">Total Recaudado</p>
                                <p className="text-2xl font-bold text-green-700">
                                    {formatCurrency(calcularTotalPagos())}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {pagos.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="rounded-full bg-gray-100 p-4 mb-4">
                            <DollarSign className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay pagos registrados
                        </h3>
                        <p className="text-sm text-gray-600 max-w-md">
                            Los pagos aparecerán aquí cuando se registren para los presupuestos aprobados.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {pagos.map((pago) => (
                        <Card key={pago.id_pago} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <DollarSign className="h-5 w-5 text-green-600" />
                                            Pago #{pago.id_pago}
                                        </CardTitle>
                                        <CardDescription>
                                            Incidente #{pago.id_incidente} • Presupuesto #{pago.id_presupuesto}
                                            {pago.incidentes?.categoria && (
                                                <span className="ml-2">• {pago.incidentes.categoria}</span>
                                            )}
                                        </CardDescription>
                                    </div>
                                    <Badge className={getTipoPagoBadgeColor(pago.tipo_pago)}>
                                        {pago.tipo_pago}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Monto Pagado</p>
                                            <p className="text-xl font-bold text-green-600">
                                                {formatCurrency(pago.monto_pagado)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Método de Pago</p>
                                            <p className="text-sm font-medium flex items-center gap-1">
                                                {getMetodoPagoIcon(pago.metodo_pago)}
                                                {pago.metodo_pago}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Fecha de Pago</p>
                                            <p className="text-sm font-medium flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(pago.fecha_pago)}
                                            </p>
                                        </div>
                                        {pago.numero_comprobante && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-gray-500">Comprobante</p>
                                                <p className="text-sm font-medium font-mono">
                                                    {pago.numero_comprobante}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {pago.observaciones && (
                                        <div className="pt-2 border-t">
                                            <p className="text-xs text-gray-500 mb-1">Observaciones</p>
                                            <p className="text-sm text-gray-700">{pago.observaciones}</p>
                                        </div>
                                    )}

                                    {pago.presupuestos && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
                                            <FileText className="h-3 w-3" />
                                            Presupuesto total: {formatCurrency(pago.presupuestos.costo_total)}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </motion.div>
    )
}
