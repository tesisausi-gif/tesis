'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Building2, MapPin, Send, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { crearNotificacionAdmin } from '@/features/notificaciones/notificaciones-inapp.service'
import { CalendarioDisponibilidad, type FranjaInput } from '@/components/ui/calendario-disponibilidad'
import { guardarFranjasDisponibilidad } from '@/features/disponibilidad/disponibilidad.service'
import { subirFotoDiagnostico } from '@/features/documentos/documentos.service'

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
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const [idCliente, setIdCliente] = useState<number | null>(null)
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([])

  // Form state — descripcion puede venir pre-rellenada desde Walter
  const [inmuebleSeleccionado, setInmuebleSeleccionado] = useState('')
  const [descripcion, setDescripcion] = useState(searchParams.get('descripcion') ?? '')
  const [franjas, setFranjas] = useState<FranjaInput[]>([])
  const [diasSinFranja, setDiasSinFranja] = useState<string[]>([])
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

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

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen supera el límite de 10 MB')
      return
    }
    setFotoArchivo(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const quitarFoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFotoArchivo(null)
    setFotoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    if (!inmuebleSeleccionado) {
      toast.error('Selecciona un inmueble')
      isSubmittingRef.current = false
      return
    }

    // categoría será asignada por administración, no es requerida al reportar

    if (!descripcion.trim()) {
      toast.error('Describe el problema')
      isSubmittingRef.current = false
      return
    }

    if (descripcion.trim().length < 20) {
      toast.error('La descripción debe tener al menos 20 caracteres')
      isSubmittingRef.current = false
      return
    }

    if (franjas.length === 0) {
      toast.error('Indicá al menos una franja de disponibilidad horaria')
      isSubmittingRef.current = false
      return
    }
    // TODOS los días seleccionados deben tener franja horaria: no se descarta
    // ninguno en silencio (los días sin horario confunden a técnico y admin).
    if (diasSinFranja.length > 0) {
      const listado = diasSinFranja
        .map(d => new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }))
        .join(', ')
      toast.error(`Agregá un horario para cada día seleccionado (falta: ${listado}) o destildá esos días del calendario.`)
      isSubmittingRef.current = false
      return
    }
    const franjasConSlot = franjas.filter(f => f.hora_inicio && f.hora_fin)
    if (franjasConSlot.length === 0) {
      toast.error('Agregá horarios para los días seleccionados')
      isSubmittingRef.current = false
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
          disponibilidad: null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error al crear incidente:', error)
        toast.error('Error al reportar incidente', {
          description: error.message
        })
        isSubmittingRef.current = false
        return
      }

      // Guardar franjas de disponibilidad — si falla, avisar: el incidente
      // quedaría sin disponibilidad y ningún técnico podría coordinar visita.
      const resFranjas = await guardarFranjasDisponibilidad(data.id_incidente, franjasConSlot)
      if (!resFranjas.success) {
        toast.warning('Incidente creado, pero no se pudo guardar tu disponibilidad', {
          description: 'Abrí el incidente y volvé a cargar tus días y horarios disponibles.',
        })
      }

      // Subir foto de diagnóstico si el cliente adjuntó una
      if (fotoArchivo) {
        const formData = new FormData()
        formData.append('archivo', fotoArchivo)
        const uploadResult = await subirFotoDiagnostico(data.id_incidente, formData)
        if (!uploadResult.success) {
          toast.warning('Incidente creado, pero no se pudo subir la foto', {
            description: uploadResult.error,
          })
        }
      }

      toast.success('Incidente reportado exitosamente', {
        description: `Tu incidente #${data.id_incidente} ha sido registrado`
      })

      // Notificar al admin del nuevo incidente (fire-and-forget)
      crearNotificacionAdmin({
        tipo: 'nuevo_incidente',
        titulo: 'Nuevo incidente reportado',
        mensaje: `Se registró el incidente #${data.id_incidente}: "${descripcion.trim().slice(0, 80)}${descripcion.trim().length > 80 ? '...' : ''}"`,
        id_incidente: data.id_incidente,
      }).catch(() => {})

      router.push('/cliente/incidentes')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    } finally {
      isSubmittingRef.current = false
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (inmuebles.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-lg mx-auto px-4 py-6 space-y-4"
      >
        <Link href="/cliente/incidentes" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center border border-orange-100">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-orange-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Registrá un inmueble primero</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            Para reportar un incidente necesitás tener al menos un inmueble registrado.
          </p>
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
            <Link href="/cliente/propiedades">Ir a Mis Inmuebles</Link>
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="px-1 pt-2 pb-5 flex items-center gap-3">
        <Link
          href="/cliente/incidentes"
          className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="font-bold text-gray-900 text-lg leading-tight">Reportar incidente</h1>
          <p className="text-xs text-gray-400">Completá los 3 pasos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* ── Paso 01: Inmueble ── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-4xl font-black text-amber-100 leading-none select-none">01</span>
            <div className="pt-0.5">
              <p className="font-semibold text-gray-900 text-sm">Inmueble afectado</p>
              <p className="text-xs text-gray-400">¿Dónde ocurrió el problema?</p>
            </div>
          </div>

          <Select
            value={inmuebleSeleccionado}
            onValueChange={setInmuebleSeleccionado}
            disabled={submitting}
          >
            <SelectTrigger className="w-full h-auto py-3.5 px-4 rounded-xl border-gray-200 bg-gray-50 text-sm">
              <SelectValue placeholder="Seleccioná el inmueble con el problema" />
            </SelectTrigger>
            <SelectContent>
              {inmuebles.map((inmueble) => (
                <SelectItem
                  key={inmueble.id_inmueble}
                  value={inmueble.id_inmueble.toString()}
                  className="py-3"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{getTipoInmuebleNombre(inmueble)}</div>
                      <div className="text-xs text-gray-400">{formatDireccion(inmueble)}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Paso 02: Descripción + Foto ── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-4xl font-black text-amber-100 leading-none select-none">02</span>
            <div className="pt-0.5">
              <p className="font-semibold text-gray-900 text-sm">¿Qué está pasando?</p>
              <p className="text-xs text-gray-400">Describí el problema con detalle</p>
            </div>
          </div>

          <Textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describí qué está pasando, desde cuándo ocurre y cualquier detalle relevante..."
            rows={4}
            disabled={submitting}
            className="resize-none rounded-xl border-gray-200 bg-gray-50 text-sm focus:border-amber-300 focus:ring-amber-200"
          />
          <div className="flex justify-end">
            <span className={`text-xs font-medium transition-colors ${
              descripcion.length === 0 ? 'text-gray-300' :
              descripcion.length < 20 ? 'text-red-400' : 'text-green-500'
            }`}>
              {descripcion.length < 20 && descripcion.length > 0
                ? `Faltan ${20 - descripcion.length} caracteres`
                : `${descripcion.length} caracteres`}
            </span>
          </div>

          {/* Foto opcional */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
              <ImagePlus className="h-3.5 w-3.5" />
              Foto del problema
              <span className="text-gray-300 font-normal">· opcional · máx. 10 MB</span>
            </p>
            {fotoPreview ? (
              <div className="relative">
                <img
                  src={fotoPreview}
                  alt="Vista previa"
                  className="w-full max-h-56 object-cover rounded-xl border border-gray-100"
                />
                <button
                  type="button"
                  onClick={quitarFoto}
                  disabled={submitting}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-amber-300 hover:bg-amber-50/40 transition-colors ${submitting ? 'opacity-50 pointer-events-none' : ''}`}>
                <ImagePlus className="h-7 w-7 text-gray-200" />
                <span className="text-xs text-gray-400">Tocá para adjuntar una foto</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFotoChange}
                  disabled={submitting}
                />
              </label>
            )}
          </div>
        </div>

        {/* ── Paso 03: Disponibilidad ── */}
        <div className={`bg-white rounded-2xl p-5 border space-y-3 ${diasSinFranja.length > 0 ? 'border-red-200' : 'border-gray-100'}`}>
          <div className="flex items-start gap-3">
            <span className="text-4xl font-black text-amber-100 leading-none select-none">03</span>
            <div className="pt-0.5">
              <p className="font-semibold text-gray-900 text-sm">Tu disponibilidad</p>
              <p className="text-xs text-gray-400">¿Cuándo podés recibir al técnico?</p>
            </div>
          </div>

          <CalendarioDisponibilidad
            modo="editar"
            franjas={franjas}
            onChange={setFranjas}
            onDiasSinFranjaChange={setDiasSinFranja}
          />

          {diasSinFranja.length > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span className="text-red-400 text-sm leading-none mt-0.5">!</span>
              <p className="text-xs text-red-600 leading-snug">
                Agregá un horario para{' '}
                <strong>
                  {diasSinFranja
                    .map(d => new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }))
                    .join(', ')}
                </strong>
                {' '}o destildá esos días del calendario.
              </p>
            </div>
          )}
        </div>

        {/* ── Botón enviar ── */}
        <div className="pt-1 pb-6">
          <Button
            type="submit"
            disabled={submitting || diasSinFranja.length > 0}
            className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base gap-2 shadow-sm shadow-amber-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Reportar incidente
              </>
            )}
          </Button>
        </div>

      </form>
    </motion.div>
  )
}
