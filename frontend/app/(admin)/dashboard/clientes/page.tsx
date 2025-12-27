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
import { Plus, Trash2, Edit } from 'lucide-react'

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

      // Debug: verificar sesión actual
      const { data: session } = await supabase.auth.getSession()
      console.log('📋 Sesión actual:', session?.session?.user?.id || 'No autenticado')

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('fecha_creacion', { ascending: false })

      console.log('📊 Resultado query clientes:', { data, error })

      if (error) {
        console.error('❌ Error al cargar clientes:', error)
        toast.error(`Error al cargar clientes: ${error.message}`)
        return
      }

      console.log(`✅ Clientes cargados: ${data?.length || 0}`)
      setClientes(data || [])
    } catch (error) {
      console.error('❌ Error catch:', error)
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
      setTipoCliente('particular')

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
                      <Badge variant={cliente.esta_activo ? 'default' : 'secondary'}>
                        {cliente.esta_activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(cliente.fecha_creacion).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
