'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, DollarSign, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { EstadoPresupuesto } from '@/types/enums'

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
        case EstadoPresupuesto.APROBADO:
            return 'bg-green-100 text-green-800'
        case EstadoPresupuesto.RECHAZADO:
            return 'bg-red-100 text-red-800'
        case EstadoPresupuesto.ENVIADO:
            return 'bg-blue-100 text-blue-800'
        case EstadoPresupuesto.APROBADO_ADMIN:
            return 'bg-cyan-100 text-cyan-800'
        case EstadoPresupuesto.BORRADOR:
            return 'bg-gray-100 text-gray-800'
        case EstadoPresupuesto.VENCIDO:
            return 'bg-orange-100 text-orange-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

const getEstadoIcon = (estado: string) => {
    switch (estado) {
        case EstadoPresupuesto.APROBADO:
            return <CheckCircle className="h-4 w-4" />
        case EstadoPresupuesto.RECHAZADO:
            return <XCircle className="h-4 w-4" />
        case EstadoPresupuesto.ENVIADO:
        case EstadoPresupuesto.BORRADOR:
            return <Clock className="h-4 w-4" />
        default:
            return <FileText className="h-4 w-4" />
    }
}

export default function PresupuestosPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])

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
          )
        `)
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
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Presupuestos</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Gestión de presupuestos de incidentes
                </p>
            </div>

            {presupuestos.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="rounded-full bg-gray-100 p-4 mb-4">
                            <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay presupuestos registrados
                        </h3>
                        <p className="text-sm text-gray-600 max-w-md">
                            Los presupuestos aparecerán aquí cuando se generen para los incidentes.
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
                                    <p className="text-sm text-gray-700 line-clamp-2">
                                        {presupuesto.descripcion_detallada}
                                    </p>

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
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </motion.div>
    )
}
