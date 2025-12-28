'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Edit, Eye, Power, CheckCircle2, XCircle } from 'lucide-react'

interface Cliente {
  id_cliente: number
  nombre: string
  apellido: string
  dni: string | null
  correo_electronico: string | null
  telefono: string | null
  esta_activo: boolean
  fecha_creacion: string
  fecha_modificacion: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [actionsDialogOpen, setActionsDialogOpen] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [clienteActual, setClienteActual] = useState<Cliente | null>(null)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    cargarClientes()
  }, [])

  const cargarClientes = async () => {
    try {
      console.log('🔍 Cargando clientes...')

      // Usar el endpoint de API que tiene acceso service role
      const response = await fetch('/api/admin/get-clientes', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const result = await response.json()

      console.log('📊 Resultado API clientes:', result)

      if (!response.ok) {
        console.error('❌ Error al cargar clientes:', result.error)
        toast.error(`Error al cargar clientes: ${result.error}`)
        return
      }

      console.log(`✅ Clientes cargados: ${result.data?.length || 0}`)
      setClientes(result.data || [])
    } catch (error) {
      console.error('❌ Error catch:', error)
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  const crearCliente = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password || !nombre || !apellido) {
      toast.error('Por favor completa todos los campos obligatorios')
      return
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSubmitting(true)

    try {
      // Crear usuario con rol cliente usando el endpoint de la API
      // El trigger automáticamente creará el registro en la tabla clientes
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          nombre,
          apellido,
          rol: 'cliente',
          dni,
          telefono,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error('Error al crear cliente', {
          description: result.error
        })
        return
      }

      toast.success('Cliente creado exitosamente')

      // Limpiar formulario
      setEmail('')
      setPassword('')
      setNombre('')
      setApellido('')
      setDni('')
      setTelefono('')

      // Cerrar dialog y recargar
      setDialogOpen(false)
      cargarClientes()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado al crear cliente')
    } finally {
      setSubmitting(false)
    }
  }

  const abrirEditar = (cliente: Cliente) => {
    setClienteEditando(cliente)
    setNombre(cliente.nombre)
    setApellido(cliente.apellido)
    setDni(cliente.dni || '')
    setTelefono(cliente.telefono || '')
    setEmail(cliente.correo_electronico || '')
    setEditDialogOpen(true)
  }

  const actualizarCliente = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clienteEditando) return

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre,
          apellido,
          dni: dni || null,
          telefono: telefono || null,
          correo_electronico: email || null,
        })
        .eq('id_cliente', clienteEditando.id_cliente)

      if (error) {
        toast.error('Error al actualizar cliente', {
          description: error.message
        })
        return
      }

      toast.success('Cliente actualizado exitosamente')

      // Limpiar formulario
      setNombre('')
      setApellido('')
      setDni('')
      setTelefono('')
      setEmail('')

      // Cerrar dialog y recargar
      setEditDialogOpen(false)
      setClienteEditando(null)
      cargarClientes()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado al actualizar cliente')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActivoCliente = async (cliente: Cliente) => {
    const nuevoEstado = !cliente.esta_activo

    try {
      const { error } = await supabase
        .from('clientes')
        .update({ esta_activo: nuevoEstado })
        .eq('id_cliente', cliente.id_cliente)

      if (error) {
        toast.error('Error al actualizar estado del cliente', {
          description: error.message
        })
        return
      }

      toast.success(nuevoEstado ? 'Cliente activado exitosamente' : 'Cliente desactivado exitosamente')
      cargarClientes()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar estado del cliente')
    }
  }

  const abrirModalAcciones = (cliente: Cliente) => {
    setClienteActual(cliente)
    setActionsDialogOpen(true)
  }

  const abrirEdicionDesdeModal = (cliente: Cliente) => {
    setActionsDialogOpen(false)
    abrirEditar(cliente)
  }

  const handleToggleActivo = async (cliente: Cliente) => {
    setActionsDialogOpen(false)
    await toggleActivoCliente(cliente)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h2>
          <p className="text-muted-foreground">
            Administra los clientes del sistema
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
              <DialogDescription>
                Crea un nuevo cliente en el sistema. Se creará automáticamente su usuario de acceso.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={crearCliente} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creando...' : 'Crear Cliente'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes Registrados</CardTitle>
          <CardDescription>
            Lista de todos los clientes del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Cargando clientes...</p>
          ) : clientes.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay clientes registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id_cliente}>
                    <TableCell className="font-medium">
                      {cliente.nombre} {cliente.apellido}
                    </TableCell>
                    <TableCell>{cliente.correo_electronico || '-'}</TableCell>
                    <TableCell>{cliente.dni || '-'}</TableCell>
                    <TableCell>{cliente.telefono || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={cliente.esta_activo ? 'default' : 'secondary'}
                        className={cliente.esta_activo ? 'bg-green-500' : 'bg-gray-500'}
                      >
                        {cliente.esta_activo ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactivo
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(cliente.fecha_creacion).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirModalAcciones(cliente)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Acciones */}
      <Dialog open={actionsDialogOpen} onOpenChange={setActionsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Acciones de Cliente</DialogTitle>
            <DialogDescription>
              {clienteActual && `${clienteActual.nombre} ${clienteActual.apellido}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Editar Cliente */}
            <button
              onClick={() => clienteActual && abrirEdicionDesdeModal(clienteActual)}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Editar Cliente</h3>
                <p className="text-sm text-gray-600">
                  Modificar información del cliente
                </p>
              </div>
            </button>

            {/* Activar/Desactivar */}
            <button
              onClick={() => clienteActual && handleToggleActivo(clienteActual)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all group ${
                clienteActual?.esta_activo
                  ? 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                  : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
              }`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                clienteActual?.esta_activo
                  ? 'bg-orange-100 group-hover:bg-orange-200'
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <Power className={`h-5 w-5 ${
                  clienteActual?.esta_activo ? 'text-orange-600' : 'text-green-600'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">
                  {clienteActual?.esta_activo ? 'Desactivar' : 'Activar'} Cliente
                </h3>
                <p className="text-sm text-gray-600">
                  {clienteActual?.esta_activo
                    ? 'El cliente no podrá acceder al sistema ni reportar incidentes'
                    : 'El cliente podrá acceder al sistema y reportar incidentes'}
                </p>
              </div>
            </button>

            {/* Nota informativa */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                ℹ️ Los clientes inactivos se mantienen en el sistema para preservar el historial de incidentes y propiedades
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Cliente */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Actualiza la información del cliente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={actualizarCliente} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre *</Label>
                <Input
                  id="edit-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-apellido">Apellido *</Label>
                <Input
                  id="edit-apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dni">DNI</Label>
                <Input
                  id="edit-dni"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  disabled={submitting}
                  placeholder="12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefono">Teléfono</Label>
                <Input
                  id="edit-telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={submitting}
                  placeholder="+54 9 11 1234-5678"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
