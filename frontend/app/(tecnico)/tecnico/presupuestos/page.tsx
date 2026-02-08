'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, DollarSign, Calendar, CheckCircle, XCircle, Clock, ArrowLeft, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { EstadoPresupuesto } from '@/shared/types/enums'

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
    fecha_aprobacion: string | null
    fecha_creacion: string
    incidentes?: {
        id_incidente: number
        descripcion_problema: string
        categoria: string | null
    }
    inspecciones?: {
        id_inspeccion: number
        id_tecnico: number
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

export default function PresupuestosTecnicoPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
    const [idTecnico, setIdTecnico] = useState<number | null>(null)

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

            // Obtener id_tecnico del usuario
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

            // Obtener presupuestos relacionados con las inspecciones del técnico
            const { data, error } = await supabase
                .from('presupuestos')
                .select(`
          *,
          incidentes (
            id_incidente,
            descripcion_problema,
            categoria
          ),
          inspecciones!inner (
            id_inspeccion,
            id_tecnico
          )
        `)
                .eq('inspecciones.id_tecnico', usuario.id_tecnico)
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
            className="space-y-4 px-4 py-6"
        >
            <Link
                href="/tecnico"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Volver al Inicio
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis Presupuestos</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Presupuestos generados para tus inspecciones
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
                            Los presupuestos aparecerán aquí cuando se generen para tus inspecciones realizadas.
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
                                        <CardDescription className="flex items-center gap-2">
                                            <Wrench className="h-3 w-3" />
                                            Incidente #{presupuesto.id_incidente}
                                            {presupuesto.id_inspeccion && (
                                                <span>• Inspección #{presupuesto.id_inspeccion}</span>
                                            )}
                                            {presupuesto.incidentes?.categoria && (
                                                <span>• {presupuesto.incidentes.categoria}</span>
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
                                                <CheckCircle className="h-3 w-3 text-green-600" />
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
