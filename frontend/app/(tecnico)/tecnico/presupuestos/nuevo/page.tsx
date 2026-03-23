'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, FileText, DollarSign, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { crearPresupuesto } from '@/features/presupuestos/presupuestos.service'

interface IncidenteConInspecciones {
  id_incidente: number
  descripcion_problema: string
  categoria: string | null
  inspeccionesCount: number
  ultimaInspeccion: string
}

export default function NuevoPresupuestoTecnicoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [incidentes, setIncidentes] = useState<IncidenteConInspecciones[]>([])

  // Form state
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [costoMateriales, setCostoMateriales] = useState('')
  const [costoManoObra, setCostoManoObra] = useState('')
  const [alternativas, setAlternativas] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id_tecnico')
        .eq('id', user.id)
        .single()

      if (!usuario?.id_tecnico) { toast.error('No se pudo identificar el técnico'); return }

      // Obtener incidentes asignados al técnico (aceptada o en_curso)
      const { data: asignaciones } = await supabase
        .from('asignaciones_tecnico')
        .select('id_incidente')
        .eq('id_tecnico', usuario.id_tecnico)
        .in('estado_asignacion', ['aceptada', 'en_curso'])

      if (!asignaciones?.length) { setIncidentes([]); return }

      const idsIncidentes = asignaciones.map((a: any) => a.id_incidente).filter(Boolean) as number[]

      // Obtener inspecciones para esos incidentes (agrupadas por incidente)
      const { data: inspecciones } = await supabase
        .from('inspecciones')
        .select('id_inspeccion, id_incidente, fecha_inspeccion')
        .in('id_incidente', idsIncidentes)
        .eq('esta_anulada', false)
        .order('fecha_inspeccion', { ascending: false })

      if (!inspecciones?.length) { setIncidentes([]); return }

      // Obtener presupuestos activos (no rechazados) para esos incidentes
      const { data: presupuestosActivos } = await supabase
        .from('presupuestos')
        .select('id_incidente')
        .in('id_incidente', idsIncidentes)
        .neq('estado_presupuesto', 'rechazado')

      const idsConPresupuesto = new Set((presupuestosActivos || []).map((p: any) => p.id_incidente))

      // Filtrar incidentes que tienen inspecciones pero no tienen presupuesto activo
      const incidentesConInspecciones = new Map<number, { count: number; ultima: string }>()
      for (const insp of inspecciones) {
        if (idsConPresupuesto.has(insp.id_incidente)) continue
        const current = incidentesConInspecciones.get(insp.id_incidente)
        if (!current) {
          incidentesConInspecciones.set(insp.id_incidente, { count: 1, ultima: insp.fecha_inspeccion })
        } else {
          incidentesConInspecciones.set(insp.id_incidente, { count: current.count + 1, ultima: current.ultima })
        }
      }

      if (incidentesConInspecciones.size === 0) { setIncidentes([]); return }

      // Obtener detalle de los incidentes
      const idsConInspecciones = Array.from(incidentesConInspecciones.keys())
      const { data: incidentesData } = await supabase
        .from('incidentes')
        .select('id_incidente, descripcion_problema, categoria')
        .in('id_incidente', idsConInspecciones)

      const resultado: IncidenteConInspecciones[] = (incidentesData || []).map((inc: any) => {
        const info = incidentesConInspecciones.get(inc.id_incidente)!
        return {
          id_incidente: inc.id_incidente,
          descripcion_problema: inc.descripcion_problema,
          categoria: inc.categoria,
          inspeccionesCount: info.count,
          ultimaInspeccion: info.ultima,
        }
      })

      setIncidentes(resultado)
    } catch {
      toast.error('Error inesperado al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const calcularTotal = () => {
    const materiales = parseFloat(costoMateriales) || 0
    const manoObra = parseFloat(costoManoObra) || 0
    return materiales + manoObra
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!incidenteSeleccionado) { toast.error('Seleccioná un incidente'); return }
    if (!descripcion.trim()) { toast.error('Ingresá una descripción del presupuesto'); return }
    if (!costoMateriales || parseFloat(costoMateriales) < 0) { toast.error('Ingresá un costo de materiales válido'); return }
    if (!costoManoObra || parseFloat(costoManoObra) < 0) { toast.error('Ingresá un costo de mano de obra válido'); return }

    setSubmitting(true)
    try {
      const result = await crearPresupuesto({
        id_incidente: parseInt(incidenteSeleccionado),
        id_inspeccion: null,
        descripcion_detallada: descripcion.trim(),
        costo_materiales: parseFloat(costoMateriales),
        costo_mano_obra: parseFloat(costoManoObra),
        gastos_administrativos: 0,
        costo_total: calcularTotal(),
        alternativas_reparacion: alternativas.trim() || null,
      })

      if (!result.success) {
        toast.error('Error al crear presupuesto', { description: result.error })
        return
      }

      toast.success('Presupuesto enviado exitosamente')
      router.push('/tecnico/presupuestos')
    } catch {
      toast.error('Error inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (incidentes.length === 0) {
    return (
      <div className="space-y-4 px-4 py-6">
        <Link href="/tecnico/presupuestos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver a Presupuestos
        </Link>
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin incidentes disponibles</h3>
            <p className="text-sm text-gray-600 max-w-md">
              No tenés incidentes con inspecciones realizadas sin presupuesto. Realizá una inspección primero, o todos tus incidentes ya tienen presupuesto activo.
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
      <Link href="/tecnico/presupuestos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Volver a Presupuestos
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Presupuesto</h1>
        <p className="text-sm text-gray-600 mt-1">El presupuesto cubre todas las inspecciones realizadas para el incidente.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Información del Presupuesto
          </CardTitle>
          <CardDescription>
            Completá los detalles del presupuesto. Los campos marcados con * son obligatorios.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de Incidente */}
            <div className="space-y-2">
              <Label htmlFor="incidente">Incidente *</Label>
              <Select value={incidenteSeleccionado} onValueChange={setIncidenteSeleccionado} disabled={submitting}>
                <SelectTrigger id="incidente">
                  <SelectValue placeholder="Seleccioná el incidente" />
                </SelectTrigger>
                <SelectContent>
                  {incidentes.map((inc) => (
                    <SelectItem key={inc.id_incidente} value={inc.id_incidente.toString()}>
                      <div>
                        <div className="font-medium">
                          Incidente #{inc.id_incidente}{inc.categoria ? ` — ${inc.categoria}` : ''}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-1">{inc.descripcion_problema}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <ClipboardList className="h-3 w-3" />
                          {inc.inspeccionesCount} inspección{inc.inspeccionesCount !== 1 ? 'es' : ''} realizada{inc.inspeccionesCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">El presupuesto aplica a todas las inspecciones del incidente seleccionado.</p>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción Detallada *</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describí el trabajo a realizar, materiales necesarios, tiempo estimado..."
                rows={5}
                disabled={submitting}
              />
            </div>

            {/* Costos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Total */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Subtotal (sin gastos administrativos)</span>
                <span className="text-2xl font-bold text-blue-600 flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(calcularTotal())}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Los gastos administrativos los agrega el administrador al revisar el presupuesto.</p>
            </div>

            {/* Alternativas */}
            <div className="space-y-2">
              <Label htmlFor="alternativas">Alternativas de Reparación (opcional)</Label>
              <Textarea
                id="alternativas"
                value={alternativas}
                onChange={(e) => setAlternativas(e.target.value)}
                placeholder="Describí alternativas de reparación si las hay..."
                rows={3}
                disabled={submitting}
              />
            </div>

            {/* Botones */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.back()} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:flex-1" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar Presupuesto'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
