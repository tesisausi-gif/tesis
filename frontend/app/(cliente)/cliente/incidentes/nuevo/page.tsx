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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, AlertCircle, Building2, MapPin, Send } from 'lucide-react'
import { toast } from 'sonner'

interface TipoInmueble {
  nombre: string
}

interface Inmueble {
  id_inmueble: number
  calle: string | null
  altura: string | null
  piso: string | null
  dpto: string | null
  barrio: string | null
  localidad: string | null
  provincia: string | null
  tipos_inmuebles: TipoInmueble | TipoInmueble[] | null
}

// categoria será asignada por administración

export default function NuevoIncidentePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [idCliente, setIdCliente] = useState<number | null>(null)
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([])

  // Form state
  const [inmuebleSeleccionado, setInmuebleSeleccionado] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [disponibilidad, setDisponibilidad] = useState('')

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

      // Obtener id_cliente del usuario
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id_cliente')
        .eq('id', user.id)
        .single()

      if (!usuario?.id_cliente) {
        toast.error('No se pudo identificar el cliente')
        return
      }

      setIdCliente(usuario.id_cliente)

      // Obtener inmuebles activos del cliente
      const { data: inmueblesData, error } = await supabase
        .from('inmuebles')
        .select('id_inmueble, calle, altura, piso, dpto, barrio, localidad, provincia, tipos_inmuebles(nombre)')
        .eq('id_cliente', usuario.id_cliente)
        .eq('esta_activo', 1)
        .order('calle')

      if (error) {
        console.error('Error al cargar inmuebles:', error)
        toast.error('Error al cargar inmuebles')
        return
      }

      setInmuebles(inmueblesData as unknown as Inmueble[] || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const getTipoInmuebleNombre = (inmueble: Inmueble): string => {
    if (!inmueble.tipos_inmuebles) return 'Inmueble'
    if (Array.isArray(inmueble.tipos_inmuebles)) {
      return inmueble.tipos_inmuebles[0]?.nombre || 'Inmueble'
    }
    return inmueble.tipos_inmuebles.nombre || 'Inmueble'
  }

  const formatDireccion = (inmueble: Inmueble) => {
    const partes = [
      inmueble.calle,
      inmueble.altura,
      inmueble.piso && `Piso ${inmueble.piso}`,
      inmueble.dpto && `Dpto ${inmueble.dpto}`,
    ].filter(Boolean).join(' ')

    const ubicacion = [inmueble.barrio, inmueble.localidad].filter(Boolean).join(', ')

    return ubicacion ? `${partes}, ${ubicacion}` : partes
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inmuebleSeleccionado) {
      toast.error('Selecciona un inmueble')
      return
    }

    // categoría será asignada por administración, no es requerida al reportar

    if (!descripcion.trim()) {
      toast.error('Describe el problema')
      return
    }

    if (descripcion.trim().length < 20) {
      toast.error('La descripción debe tener al menos 20 caracteres')
      return
    }

    if (!disponibilidad.trim()) {
      toast.error('Indica tu disponibilidad horaria')
      return
    }

    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('incidentes')
          .insert({
          id_propiedad: parseInt(inmuebleSeleccionado),
          id_cliente_reporta: idCliente,
          descripcion_problema: descripcion.trim(),
          categoria: null,
          estado_actual: 'pendiente',
          disponibilidad: disponibilidad.trim(),
        })
        .select()
        .single()

      if (error) {
        console.error('Error al crear incidente:', error)
        toast.error('Error al reportar incidente', {
          description: error.message
        })
        return
      }

      toast.success('Incidente reportado exitosamente', {
        description: `Tu incidente #${data.id_incidente} ha sido registrado`
      })

      router.push('/cliente/incidentes')
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

  // Si no tiene inmuebles, mostrar mensaje
  if (inmuebles.length === 0) {
    return (
      <div className="space-y-4 px-4 py-6">
        <Link
          href="/cliente/incidentes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Incidentes
        </Link>

        <Card className="border-dashed border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-orange-100 p-4 mb-6">
              <Building2 className="h-12 w-12 text-orange-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Primero registra un inmueble
            </h3>

            <p className="text-sm text-gray-600 mb-6 max-w-md">
              Para reportar un incidente, necesitas tener al menos un inmueble registrado.
            </p>

            <Button asChild>
              <Link href="/cliente/propiedades">
                Ir a Mis Inmuebles
              </Link>
            </Button>
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
        href="/cliente/incidentes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Incidentes
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportar Incidente</h1>
        <p className="text-sm text-gray-600 mt-1">
          Completa el formulario para reportar un problema en tu inmueble
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Nuevo Reporte
          </CardTitle>
          <CardDescription>
            Todos los campos marcados con * son obligatorios
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de Inmueble */}
            <div className="space-y-2">
              <Label htmlFor="inmueble" className="text-sm font-medium">
                Inmueble *
              </Label>
              <Select
                value={inmuebleSeleccionado}
                onValueChange={setInmuebleSeleccionado}
                disabled={submitting}
              >
                <SelectTrigger id="inmueble" className="h-auto py-3">
                  <SelectValue placeholder="Selecciona el inmueble con el problema" />
                </SelectTrigger>
                <SelectContent>
                  {inmuebles.map((inmueble) => (
                    <SelectItem
                      key={inmueble.id_inmueble}
                      value={inmueble.id_inmueble.toString()}
                      className="py-3"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {getTipoInmuebleNombre(inmueble)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDireccion(inmueble)}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoría: asignada por administración */}

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion" className="text-sm font-medium">
                Descripción del Problema *
              </Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe el problema con el mayor detalle posible. Incluye: qué está pasando, desde cuándo, y cualquier información relevante..."
                rows={5}
                disabled={submitting}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Mínimo 20 caracteres. Actual: {descripcion.length}
              </p>
            </div>

            {/* Disponibilidad */}
            <div className="space-y-2">
              <Label htmlFor="disponibilidad" className="text-sm font-medium">
                Disponibilidad para Contacto/Visita *
              </Label>
              <Textarea
                id="disponibilidad"
                value={disponibilidad}
                onChange={(e) => setDisponibilidad(e.target.value)}
                placeholder="Indica días y horarios en los que puedes recibir llamadas o al técnico (ej: Lunes a Viernes de 09:00 a 13:00)..."
                rows={2}
                disabled={submitting}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Ej: Lunes a Viernes de 9 a 17hs.
              </p>
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
                className="w-full sm:flex-1 gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Reportar Incidente
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
