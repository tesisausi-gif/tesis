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
import { UserRole } from '@/types/enums'
import { Plus, Trash2 } from 'lucide-react'

interface Usuario {
  id: string
  nombre: string
  apellido: string
  rol: string
  esta_activo: boolean
  fecha_creacion: string
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [rol, setRol] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const cargarUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('fecha_creacion', { ascending: false })

      if (error) {
        console.error('Error al cargar usuarios:', error)
        toast.error('Error al cargar usuarios')
        return
      }

      setUsuarios(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password || !nombre || !apellido || !rol) {
      toast.error('Por favor completa todos los campos')
      return
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSubmitting(true)

    try {
      // Crear usuario usando el endpoint de la API
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
          rol,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error('Error al crear usuario', {
          description: result.error
        })
        return
      }

      toast.success('Usuario creado exitosamente')

      // Limpiar formulario
      setEmail('')
      setPassword('')
      setNombre('')
      setApellido('')
      setRol('')

      // Cerrar dialog y recargar
      setDialogOpen(false)
      cargarUsuarios()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado al crear usuario')
    } finally {
      setSubmitting(false)
    }
  }

  const eliminarUsuario = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return

    try {
      const response = await fetch(`/api/admin/delete-user/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error('Error al eliminar usuario')
        return
      }

      toast.success('Usuario eliminado')
      cargarUsuarios()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar usuario')
    }
  }

  const getRolColor = (rol: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      gestor: 'bg-blue-100 text-blue-800',
      tecnico: 'bg-green-100 text-green-800',
      cliente: 'bg-gray-100 text-gray-800',
    }
    return colors[rol] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Empleados</h2>
          <p className="text-muted-foreground">
            Administra empleados del sistema (administradores, gestores y técnicos)
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Empleado</DialogTitle>
              <DialogDescription>
                Crea empleados con roles de administrador, gestor o técnico
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={crearUsuario} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
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
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="rol">Rol</Label>
                <Select value={rol} onValueChange={setRol} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                    <SelectItem value={UserRole.GESTOR}>Gestor</SelectItem>
                    <SelectItem value={UserRole.TECNICO}>Técnico</SelectItem>
                    <SelectItem value={UserRole.CLIENTE}>Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creando...' : 'Crear Empleado'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empleados del Sistema</CardTitle>
          <CardDescription>
            Lista de empleados (admins, gestores y técnicos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Cargando empleados...</p>
          ) : usuarios.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay empleados registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">
                      {usuario.nombre} {usuario.apellido}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRolColor(usuario.rol)}>
                        {usuario.rol}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.esta_activo ? 'default' : 'secondary'}>
                        {usuario.esta_activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(usuario.fecha_creacion).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => eliminarUsuario(usuario.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
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
