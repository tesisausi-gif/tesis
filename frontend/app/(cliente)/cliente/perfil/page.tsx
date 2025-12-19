import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, Phone, Hash, MapPin } from 'lucide-react'

export default async function ClientePerfil() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Obtener datos completos del cliente
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*, clientes(*)')
    .eq('id', user.id)
    .single()

  const cliente = usuario?.clientes

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 mt-1">
          Información de tu cuenta
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>
            Tus datos de cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-500">Nombre Completo</p>
              <p className="text-base">
                {cliente?.nombre} {cliente?.apellido}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-500">Correo Electrónico</p>
              <p className="text-base">{cliente?.correo_electronico || user.email}</p>
            </div>
          </div>

          {cliente?.telefono && (
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Teléfono</p>
                <p className="text-base">{cliente.telefono}</p>
              </div>
            </div>
          )}

          {cliente?.dni && (
            <div className="flex items-center space-x-3">
              <Hash className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">DNI</p>
                <p className="text-base">{cliente.dni}</p>
              </div>
            </div>
          )}

          {cliente?.tipo_cliente && (
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Tipo de Cliente</p>
                <p className="text-base capitalize">{cliente.tipo_cliente}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de Cuenta</CardTitle>
          <CardDescription>
            Detalles de tu cuenta en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">ID de Usuario</p>
            <p className="text-base font-mono text-sm">{user.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tipo de Cuenta</p>
            <p className="text-base">Cliente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
