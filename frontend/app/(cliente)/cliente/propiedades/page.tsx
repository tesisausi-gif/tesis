import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin } from 'lucide-react'

export default async function ClientePropiedades() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Obtener id_cliente del usuario
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id_cliente')
    .eq('id', user.id)
    .single()

  // Obtener propiedades del cliente (como propietario o inquilino)
  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('*')
    .or(`id_propietario.eq.${usuario?.id_cliente},id_inquilino.eq.${usuario?.id_cliente}`)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mis Propiedades</h1>
        <p className="text-gray-600 mt-1">
          Inmuebles asociados a tu cuenta
        </p>
      </div>

      {propiedades && propiedades.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {propiedades.map((propiedad) => (
            <Card key={propiedad.id_propiedad}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">
                        {propiedad.tipo_propiedad || 'Propiedad'}
                      </CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {propiedad.direccion_completa}
                      </CardDescription>
                    </div>
                  </div>
                  {propiedad.esta_activo && (
                    <Badge className="bg-green-100 text-green-800">
                      Activa
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {propiedad.descripcion && (
                <CardContent>
                  <p className="text-sm text-gray-700">
                    {propiedad.descripcion}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No tienes propiedades registradas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
