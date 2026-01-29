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

interface Incidente {
    id_incidente: number
    descripcion_problema: string
    categoria: string | null
    estado_actual: string
}

interface Inspeccion {
    id_inspeccion: number
    id_incidente: number
    fecha_inspeccion: string
    descripcion_inspeccion: string
    incidentes: {
        id_incidente: number
        descripcion_problema: string
    }
}

export default function NuevoPresupuestoAdminPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [incidentes, setIncidentes] = useState<Incidente[]>([])
    const [inspecciones, setInspecciones] = useState<Inspeccion[]>([])

    // Form state
    const [incidenteSeleccionado, setIncidenteSeleccionado] = useState('')
    const [inspeccionSeleccionada, setInspeccionSeleccionada] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [costoMateriales, setCostoMateriales] = useState('')
    const [costoManoObra, setCostoManoObra] = useState('')
    const [gastosAdministrativos, setGastosAdministrativos] = useState('')
    const [alternativas, setAlternativas] = useState('')
    const [estadoPresupuesto, setEstadoPresupuesto] = useState('borrador')

    useEffect(() => {
        cargarDatos()
    }, [])

    useEffect(() => {
        if (incidenteSeleccionado) {
            cargarInspecciones(parseInt(incidenteSeleccionado))
        } else {
            setInspecciones([])
            setInspeccionSeleccionada('')
        }
    }, [incidenteSeleccionado])

    const cargarDatos = async () => {
        try {
            // Cargar incidentes que no estén cerrados o cancelados
            const { data: incidentesData, error } = await supabase
                .from('incidentes')
                .select('id_incidente, descripcion_problema, categoria, estado_actual')
                .not('estado_actual', 'in', '(Cerrado,Cancelado)')
                .order('id_incidente', { ascending: false })

            if (error) {
                console.error('Error al cargar incidentes:', error)
                toast.error('Error al cargar incidentes')
                return
            }

            setIncidentes(incidentesData || [])
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    const cargarInspecciones = async (idIncidente: number) => {
        try {
            const { data, error } = await supabase
                .from('inspecciones')
                .select(`
          id_inspeccion,
          id_incidente,
          fecha_inspeccion,
          descripcion_inspeccion,
          incidentes (
            id_incidente,
            descripcion_problema
          )
        `)
                .eq('id_incidente', idIncidente)
                .order('fecha_inspeccion', { ascending: false })

            if (error) {
                console.error('Error al cargar inspecciones:', error)
                return
            }

            setInspecciones(data as unknown as Inspeccion[] || [])
        } catch (error) {
            console.error('Error:', error)
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

        if (!incidenteSeleccionado) {
            toast.error('Selecciona un incidente')
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
            const total = calcularTotal()

            const { data, error } = await supabase
                .from('presupuestos')
                .insert({
                    id_incidente: parseInt(incidenteSeleccionado),
                    id_inspeccion: inspeccionSeleccionada ? parseInt(inspeccionSeleccionada) : null,
                    descripcion_detallada: descripcion.trim(),
                    costo_materiales: parseFloat(costoMateriales),
                    costo_mano_obra: parseFloat(costoManoObra),
                    gastos_administrativos: parseFloat(gastosAdministrativos) || 0,
                    costo_total: total,
                    estado_presupuesto: estadoPresupuesto,
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
                description: `Presupuesto #${data.id_presupuesto} registrado`
            })

            router.push('/dashboard/presupuestos')
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
                <h1 className="text-3xl font-bold text-gray-900">Nuevo Presupuesto</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Crear presupuesto para un incidente
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
                        {/* Selección de Incidente */}
                        <div className="space-y-2">
                            <Label htmlFor="incidente">Incidente *</Label>
                            <Select
                                value={incidenteSeleccionado}
                                onValueChange={setIncidenteSeleccionado}
                                disabled={submitting}
                            >
                                <SelectTrigger id="incidente">
                                    <SelectValue placeholder="Selecciona el incidente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {incidentes.map((incidente) => (
                                        <SelectItem
                                            key={incidente.id_incidente}
                                            value={incidente.id_incidente.toString()}
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    Incidente #{incidente.id_incidente}
                                                    {incidente.categoria && ` - ${incidente.categoria}`}
                                                </div>
                                                <div className="text-xs text-gray-500 line-clamp-1">
                                                    {incidente.descripcion_problema}
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Selección de Inspección (opcional) */}
                        {inspecciones.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="inspeccion">Inspección (opcional)</Label>
                                <Select
                                    value={inspeccionSeleccionada}
                                    onValueChange={setInspeccionSeleccionada}
                                    disabled={submitting}
                                >
                                    <SelectTrigger id="inspeccion">
                                        <SelectValue placeholder="Selecciona una inspección" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {inspecciones.map((inspeccion) => (
                                            <SelectItem
                                                key={inspeccion.id_inspeccion}
                                                value={inspeccion.id_inspeccion.toString()}
                                            >
                                                <div>
                                                    <div className="font-medium">
                                                        Inspección #{inspeccion.id_inspeccion}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(inspeccion.fecha_inspeccion).toLocaleDateString('es-AR')}
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

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
                                    value={gastosAdministrativos}
                                    onChange={(e) => setGastosAdministrativos(e.target.value)}
                                    placeholder="0.00"
                                    disabled={submitting}
                                />
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

                        {/* Estado */}
                        <div className="space-y-2">
                            <Label htmlFor="estado">Estado del Presupuesto</Label>
                            <Select
                                value={estadoPresupuesto}
                                onValueChange={setEstadoPresupuesto}
                                disabled={submitting}
                            >
                                <SelectTrigger id="estado">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="borrador">Borrador</SelectItem>
                                    <SelectItem value="enviado">Enviado</SelectItem>
                                </SelectContent>
                            </Select>
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
                                {submitting ? 'Creando...' : 'Crear Presupuesto'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    )
}
