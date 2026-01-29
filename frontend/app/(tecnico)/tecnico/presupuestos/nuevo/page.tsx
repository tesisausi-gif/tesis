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
import { ArrowLeft, FileText, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { EstadoPresupuesto } from '@/types/enums'

interface Inspeccion {
    id_inspeccion: number
    id_incidente: number
    fecha_inspeccion: string
    descripcion_inspeccion: string
    incidentes: {
        id_incidente: number
        descripcion_problema: string
        categoria: string | null
    }
}

export default function NuevoPresupuestoTecnicoPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [idTecnico, setIdTecnico] = useState<number | null>(null)
    const [inspecciones, setInspecciones] = useState<Inspeccion[]>([])

    // Form state
    const [inspeccionSeleccionada, setInspeccionSeleccionada] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [costoMateriales, setCostoMateriales] = useState('')
    const [costoManoObra, setCostoManoObra] = useState('')
    const [gastosAdministrativos, setGastosAdministrativos] = useState('')
    const [alternativas, setAlternativas] = useState('')

    useEffect(() => {
        cargarDatos()
    }, [])

    const cargarDatos = async () => {
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

            // Cargar inspecciones del técnico que no tengan presupuesto
            const { data: inspeccionesData, error } = await supabase
                .from('inspecciones')
                .select(`
          id_inspeccion,
          id_incidente,
          fecha_inspeccion,
          descripcion_inspeccion,
          incidentes (
            id_incidente,
            descripcion_problema,
            categoria
          )
        `)
                .eq('id_tecnico', usuario.id_tecnico)
                .order('fecha_inspeccion', { ascending: false })

            if (error) {
                console.error('Error al cargar inspecciones:', error)
                toast.error('Error al cargar inspecciones')
                return
            }

            // Filtrar inspecciones que ya tienen presupuesto
            const inspeccionesConPresupuesto = await supabase
                .from('presupuestos')
                .select('id_inspeccion')
                .not('id_inspeccion', 'is', null)

            const idsConPresupuesto = new Set(
                inspeccionesConPresupuesto.data?.map(p => p.id_inspeccion) || []
            )

            const inspeccionesSinPresupuesto = (inspeccionesData || []).filter(
                insp => !idsConPresupuesto.has(insp.id_inspeccion)
            )

            setInspecciones(inspeccionesSinPresupuesto as unknown as Inspeccion[])
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    const calcularTotal = () => {
        const materiales = parseFloat(costoMateriales) || 0
        const manoObra = parseFloat(costoManoObra) || 0
        const gastos = parseFloat(gastosAdministrativos) || 0
        return materiales + manoObra + gastos
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!inspeccionSeleccionada) {
            toast.error('Selecciona una inspección')
            return
        }

        if (!descripcion.trim()) {
            toast.error('Ingresa una descripción del presupuesto')
            return
        }

        if (!costoMateriales || parseFloat(costoMateriales) < 0) {
            toast.error('Ingresa un costo de materiales válido')
            return
        }

        if (!costoManoObra || parseFloat(costoManoObra) < 0) {
            toast.error('Ingresa un costo de mano de obra válido')
            return
        }

        setSubmitting(true)

        try {
            const inspeccion = inspecciones.find(
                i => i.id_inspeccion === parseInt(inspeccionSeleccionada)
            )

            if (!inspeccion) {
                toast.error('Inspección no encontrada')
                return
            }

            const total = calcularTotal()

            const { data, error } = await supabase
                .from('presupuestos')
                .insert({
                    id_incidente: inspeccion.id_incidente,
                    id_inspeccion: parseInt(inspeccionSeleccionada),
                    descripcion_detallada: descripcion.trim(),
                    costo_materiales: parseFloat(costoMateriales),
                    costo_mano_obra: parseFloat(costoManoObra),
                    gastos_administrativos: parseFloat(gastosAdministrativos) || 0,
                    costo_total: total,
                    estado_presupuesto: 'enviado',
                    alternativas_reparacion: alternativas.trim() || null,
                })
                .select()
                .single()

            if (error) {
                console.error('Error al crear presupuesto:', error)
                toast.error('Error al crear presupuesto', {
                    description: error.message
                })
                return
            }

            toast.success('Presupuesto creado exitosamente', {
                description: `Presupuesto #${data.id_presupuesto} enviado para aprobación`
            })

            router.push('/tecnico/presupuestos')
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

    if (inspecciones.length === 0) {
        return (
            <div className="space-y-4 px-4 py-6">
                <Link
                    href="/tecnico/presupuestos"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a Presupuestos
                </Link>

                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="rounded-full bg-gray-100 p-4 mb-4">
                            <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay inspecciones disponibles
                        </h3>
                        <p className="text-sm text-gray-600 max-w-md">
                            No tienes inspecciones sin presupuesto. Realiza una inspección primero o todas tus inspecciones ya tienen presupuesto asignado.
                        </p>
                    </CardContent>
                </Card>
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
                href="/tecnico/presupuestos"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Volver a Presupuestos
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Nuevo Presupuesto</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Crear presupuesto basado en tu inspección
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Información del Presupuesto
                    </CardTitle>
                    <CardDescription>
                        Completa los detalles del presupuesto. Los campos marcados con * son obligatorios.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Selección de Inspección */}
                        <div className="space-y-2">
                            <Label htmlFor="inspeccion">Inspección *</Label>
                            <Select
                                value={inspeccionSeleccionada}
                                onValueChange={setInspeccionSeleccionada}
                                disabled={submitting}
                            >
                                <SelectTrigger id="inspeccion">
                                    <SelectValue placeholder="Selecciona la inspección" />
                                </SelectTrigger>
                                <SelectContent>
                                    {inspecciones.map((inspeccion) => (
                                        <SelectItem
                                            key={inspeccion.id_inspeccion}
                                            value={inspeccion.id_inspeccion.toString()}
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    Inspección #{inspeccion.id_inspeccion} - Incidente #{inspeccion.id_incidente}
                                                    {inspeccion.incidentes.categoria && ` - ${inspeccion.incidentes.categoria}`}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(inspeccion.fecha_inspeccion).toLocaleDateString('es-AR')}
                                                </div>
                                                <div className="text-xs text-gray-500 line-clamp-1">
                                                    {inspeccion.incidentes.descripcion_problema}
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción Detallada *</Label>
                            <Textarea
                                id="descripcion"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                placeholder="Describe el trabajo a realizar, materiales necesarios, tiempo estimado..."
                                rows={5}
                                disabled={submitting}
                            />
                        </div>

                        {/* Costos */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="materiales">Costo Materiales *</Label>
                                <Input
                                    id="materiales"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={costoMateriales}
                                    onChange={(e) => setCostoMateriales(e.target.value)}
                                    placeholder="0.00"
                                    disabled={submitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="manoObra">Costo Mano de Obra *</Label>
                                <Input
                                    id="manoObra"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={costoManoObra}
                                    onChange={(e) => setCostoManoObra(e.target.value)}
                                    placeholder="0.00"
                                    disabled={submitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gastos">Gastos Administrativos</Label>
                                <Input
                                    id="gastos"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value="0"
                                    placeholder="0.00"
                                    disabled={true}
                                    readOnly
                                    className="bg-gray-50"
                                />
                                <p className="text-xs text-gray-500">Los gastos administrativos serán agregados por el administrador</p>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Costo Total</span>
                                <span className="text-2xl font-bold text-blue-600 flex items-center gap-1">
                                    <DollarSign className="h-5 w-5" />
                                    {new Intl.NumberFormat('es-AR', {
                                        style: 'currency',
                                        currency: 'ARS',
                                    }).format(calcularTotal())}
                                </span>
                            </div>
                        </div>

                        {/* Alternativas */}
                        <div className="space-y-2">
                            <Label htmlFor="alternativas">Alternativas de Reparación (opcional)</Label>
                            <Textarea
                                id="alternativas"
                                value={alternativas}
                                onChange={(e) => setAlternativas(e.target.value)}
                                placeholder="Describe alternativas de reparación si las hay..."
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
                                className="w-full sm:flex-1"
                                disabled={submitting}
                            >
                                {submitting ? 'Enviando...' : 'Enviar Presupuesto'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    )
}
