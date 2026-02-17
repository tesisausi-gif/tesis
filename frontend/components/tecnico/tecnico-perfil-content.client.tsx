'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Mail, Phone, Hash, MapPin, Wrench, Star, Briefcase, Settings, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { actualizarPerfilTecnico } from '@/features/usuarios/usuarios.service'
import { useRouter } from 'next/navigation'

interface TecnicoData {
  id_tecnico: number
  nombre: string
  apellido: string
  correo_electronico: string | null
  telefono: string | null
  dni: string | null
  direccion: string | null
  especialidad: string | null
  calificacion_promedio: number | null
  cantidad_trabajos_realizados: number | null
  esta_activo: boolean
}

interface Props {
  tecnico: TecnicoData
  email: string
}

export function TecnicoPerfilContent({ tecnico, email }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state (only editable fields)
  const [telefono, setTelefono] = useState(tecnico.telefono || '')
  const [direccion, setDireccion] = useState(tecnico.direccion || '')

  const handleEditar = () => {
    setEditing(true)
  }

  const handleCancelar = () => {
    setEditing(false)
    setTelefono(tecnico.telefono || '')
    setDireccion(tecnico.direccion || '')
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const result = await actualizarPerfilTecnico(tecnico.id_tecnico, {
        telefono: telefono || null,
        direccion: direccion || null,
      })

      if (!result.success) {
        toast.error('Error al actualizar perfil', { description: result.error })
        return
      }

      toast.success('Perfil actualizado exitosamente')
      setEditing(false)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado al actualizar perfil')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600 text-sm mt-1">
            Información de tu cuenta
          </p>
        </div>
        {!editing && (
          <Button onClick={handleEditar} variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
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
                {tecnico.nombre} {tecnico.apellido}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-500">Correo Electrónico</p>
              <p className="text-sm">{tecnico.correo_electronico || email}</p>
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleGuardar} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={submitting}
                  placeholder="+54 9 11 1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  disabled={submitting}
                  placeholder="Calle 123, Ciudad"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" size="sm" disabled={submitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelar}
                  disabled={submitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <>
              {tecnico.telefono && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Teléfono</p>
                    <p className="text-sm">{tecnico.telefono}</p>
                  </div>
                </div>
              )}

              {tecnico.dni && (
                <div className="flex items-center space-x-3">
                  <Hash className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">DNI</p>
                    <p className="text-sm">{tecnico.dni}</p>
                  </div>
                </div>
              )}

              {tecnico.direccion && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Dirección</p>
                    <p className="text-sm">{tecnico.direccion}</p>
                  </div>
                </div>
              )}
            </>
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
          {tecnico.especialidad && (
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
                {tecnico.cantidad_trabajos_realizados || 0} trabajos
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Star className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-xs font-medium text-gray-500">Calificación Promedio</p>
              <p className="text-sm font-medium">
                {tecnico.calificacion_promedio
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
            <span className={`text-sm font-medium ${tecnico.esta_activo ? 'text-green-600' : 'text-red-600'}`}>
              {tecnico.esta_activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
