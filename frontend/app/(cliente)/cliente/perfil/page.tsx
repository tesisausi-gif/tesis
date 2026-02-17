'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Mail, Phone, Hash, Settings, X, Save } from 'lucide-react'
import { toast } from 'sonner'

interface Cliente {
  id_cliente: number
  nombre: string
  apellido: string
  dni: string | null
  correo_electronico: string | null
  telefono: string | null
}

interface UsuarioResponse {
  id_cliente: number
  clientes: Cliente | Cliente[] | null
}

export default function ClientePerfil() {
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [idCliente, setIdCliente] = useState<number | null>(null)

  // Form state
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')

  const supabase = createClient()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setLoading(false)
        return
      }

      setUser(authUser)

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id_cliente, clientes(*)')
        .eq('id', authUser.id)
        .single() as { data: UsuarioResponse | null }

      if (usuario) {
        const datosCliente = Array.isArray(usuario.clientes)
          ? usuario.clientes[0]
          : usuario.clientes

        if (datosCliente) {
          setCliente(datosCliente)
          setIdCliente(usuario.id_cliente)
          setNombre(datosCliente.nombre || '')
          setApellido(datosCliente.apellido || '')
          setDni(datosCliente.dni || '')
          setTelefono(datosCliente.telefono || '')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar datos del perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleEditar = () => {
    setEditing(true)
  }

  const handleCancelar = () => {
    setEditing(false)
    if (cliente) {
      setNombre(cliente.nombre || '')
      setApellido(cliente.apellido || '')
      setDni(cliente.dni || '')
      setTelefono(cliente.telefono || '')
    }
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre || !apellido) {
      toast.error('El nombre y apellido son obligatorios')
      return
    }

    if (!idCliente) {
      toast.error('No se pudo identificar el cliente')
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre,
          apellido,
          dni: dni || null,
          telefono: telefono || null,
        })
        .eq('id_cliente', idCliente)

      if (error) {
        toast.error('Error al actualizar perfil', {
          description: error.message
        })
        return
      }

      toast.success('Perfil actualizado exitosamente')
      setEditing(false)
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado al actualizar perfil')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!user || !cliente) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600 mt-1">
            Información de tu cuenta
          </p>
        </div>

        {!editing && (
          <Button onClick={handleEditar} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Editar Perfil
          </Button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleGuardar}>
          <Card>
            <CardHeader>
              <CardTitle>Editar Información Personal</CardTitle>
              <CardDescription>
                Actualiza tus datos personales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido *</Label>
                  <Input
                    id="apellido"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input
                    id="dni"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    disabled={submitting}
                    placeholder="12345678"
                  />
                </div>
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
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={submitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelar}
                  disabled={submitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      ) : (
        <>
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
                    {cliente.nombre} {cliente.apellido}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Correo Electrónico</p>
                  <p className="text-base">{cliente.correo_electronico || user.email}</p>
                </div>
              </div>

              {cliente.telefono && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Teléfono</p>
                    <p className="text-base">{cliente.telefono}</p>
                  </div>
                </div>
              )}

              {cliente.dni && (
                <div className="flex items-center space-x-3">
                  <Hash className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">DNI</p>
                    <p className="text-base">{cliente.dni}</p>
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
        </>
      )}
    </div>
  )
}
