import { createClient } from '@/shared/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, Phone, Hash, MapPin, Wrench, Star, Briefcase } from 'lucide-react'

export default async function TecnicoPerfil() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Obtener datos completos del técnico
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*, tecnicos(*)')
    .eq('id', user.id)
    .single()

  const tecnico = usuario?.tecnicos

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 text-sm mt-1">
          Información de tu cuenta
        </p>
      </div>

      {/* Info Personal */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>
            Tus datos como técnico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-500">Nombre Completo</p>
              <p className="text-sm font-medium">
                {tecnico?.nombre} {tecnico?.apellido}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-500">Correo Electrónico</p>
              <p className="text-sm">{tecnico?.correo_electronico || user.email}</p>
            </div>
          </div>

          {tecnico?.telefono && (
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-500">Teléfono</p>
                <p className="text-sm">{tecnico.telefono}</p>
              </div>
            </div>
          )}

          {tecnico?.dni && (
            <div className="flex items-center space-x-3">
              <Hash className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-500">DNI</p>
                <p className="text-sm">{tecnico.dni}</p>
              </div>
            </div>
          )}

          {tecnico?.direccion && (
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-500">Dirección</p>
                <p className="text-sm">{tecnico.direccion}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Profesional */}
      <Card>
        <CardHeader>
          <CardTitle>Información Profesional</CardTitle>
          <CardDescription>
            Tu desempeño y especialidad
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tecnico?.especialidad && (
            <div className="flex items-center space-x-3">
              <Wrench className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-500">Especialidad</p>
                <p className="text-sm font-medium capitalize">{tecnico.especialidad}</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Briefcase className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-500">Trabajos Realizados</p>
              <p className="text-sm font-medium">
                {tecnico?.cantidad_trabajos_realizados || 0} trabajos
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Star className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-xs font-medium text-gray-500">Calificación Promedio</p>
              <p className="text-sm font-medium">
                {tecnico?.calificacion_promedio
                  ? `${tecnico.calificacion_promedio.toFixed(1)} / 5.0`
                  : 'Sin calificaciones'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado de Cuenta */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Cuenta</CardTitle>
          <CardDescription>
            Estado actual de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Estado</span>
            <span className={`text-sm font-medium ${tecnico?.esta_activo ? 'text-green-600' : 'text-red-600'}`}>
              {tecnico?.esta_activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
