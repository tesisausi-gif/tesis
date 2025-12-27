'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, MapPin, Plus, Home } from 'lucide-react'
import { toast } from 'sonner'

interface Propiedad {
  id_propiedad: number
  tipo_propiedad: string
  direccion_completa: string
  descripcion: string | null
  esta_activo: boolean
}

export default function ClientePropiedades() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [idCliente, setIdCliente] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    cargarPropiedades()
  }, [])

  const cargarPropiedades = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Obtener id_cliente del usuario
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id_cliente')
        .eq('id', user.id)
        .single()

      if (usuario?.id_cliente) {
        setIdCliente(usuario.id_cliente)

        // Obtener propiedades del cliente
        const { data: propiedades, error } = await supabase
          .from('propiedades')
          .select('*')
          .or(`id_propietario.eq.${usuario.id_cliente},id_inquilino.eq.${usuario.id_cliente}`)

        if (error) {
          toast.error('Error al cargar propiedades')
          return
        }

        setPropiedades(propiedades || [])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar propiedades')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando propiedades...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 py-6 md:px-6 md:py-8">
      {/* Header - Mobile First */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Mis Propiedades
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Inmuebles asociados a tu cuenta
        </p>
      </div>

      {propiedades && propiedades.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {propiedades.map((propiedad) => (
            <Card key={propiedad.id_propiedad} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-1">
                      <Building2 className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base md:text-lg truncate">
                        {propiedad.tipo_propiedad || 'Propiedad'}
                      </CardTitle>
                      <CardDescription className="flex items-start gap-1 mt-1 text-xs md:text-sm">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{propiedad.direccion_completa}</span>
                      </CardDescription>
                    </div>
                  </div>
                  {propiedad.esta_activo && (
                    <Badge className="bg-green-100 text-green-800 flex-shrink-0 text-xs">
                      Activa
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {propiedad.descripcion && (
                <CardContent className="pt-0">
                  <p className="text-xs md:text-sm text-gray-700 line-clamp-3">
                    {propiedad.descripcion}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State - Mobile First & Aesthetic */
        <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 md:py-16 text-center">
            <div className="rounded-full bg-blue-100 p-4 md:p-6 mb-6">
              <Home className="h-12 w-12 md:h-16 md:w-16 text-blue-600" />
            </div>

            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              ¡Aún no tienes propiedades registradas!
            </h3>

            <p className="text-sm md:text-base text-gray-600 mb-6 max-w-md">
              Para poder reportar incidentes y solicitar servicios técnicos, primero debes registrar al menos una propiedad.
            </p>

            <Button
              size="lg"
              className="w-full md:w-auto gap-2 shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="h-5 w-5" />
              Registrar mi primera propiedad
            </Button>

            <p className="text-xs md:text-sm text-gray-500 mt-4">
              Podrás gestionar tus incidentes una vez que registres una propiedad
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
