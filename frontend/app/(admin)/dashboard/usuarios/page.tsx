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
import { Plus, Trash2, Eye, Power, Edit, CheckCircle2, XCircle, Filter } from 'lucide-react'

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
  const [actionsDialogOpen, setActionsDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos')

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
        .in('rol', ['admin', 'gestor'])
        .order('fecha_creacion', { ascending: false })

      if (error) {
        console.error('Error al cargar usuarios:', error)
        toast.error('Error al cargar empleados')
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

  const abrirModalAcciones = (usuario: Usuario) => {
    setUsuarioActual(usuario)
    setActionsDialogOpen(true)
  }

  const abrirEditar = (usuario: Usuario) => {
    setActionsDialogOpen(false)
    setUsuarioEditando(usuario)
    setNombre(usuario.nombre)
    setApellido(usuario.apellido)
    setRol(usuario.rol)
    setEditDialogOpen(true)
  }

  const actualizarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!usuarioEditando) return

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre,
          apellido,
          rol,
        })
        .eq('id', usuarioEditando.id)

      if (error) {
        toast.error('Error al actualizar empleado', {
          description: error.message
        })
        return
      }

      toast.success('Empleado actualizado exitosamente')

      // Limpiar formulario
      setNombre('')
      setApellido('')
      setRol('')

      // Cerrar dialog y recargar
      setEditDialogOpen(false)
      setUsuarioEditando(null)
      cargarUsuarios()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado al actualizar empleado')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActivoUsuario = async (usuario: Usuario) => {
    const nuevoEstado = !usuario.esta_activo

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ esta_activo: nuevoEstado })
        .eq('id', usuario.id)

      if (error) {
        toast.error('Error al actualizar estado del empleado')
        console.error(error)
        return
      }

      toast.success(nuevoEstado ? 'Empleado activado exitosamente' : 'Empleado desactivado exitosamente')
      cargarUsuarios()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar estado del empleado')
    }
  }

  const handleToggleActivo = async (usuario: Usuario) => {
    setActionsDialogOpen(false)
    await toggleActivoUsuario(usuario)
  }

  // Filtrar usuarios según el estado seleccionado
  const usuariosFiltrados = usuarios.filter((usuario) => {
    const estaActivo = Boolean(usuario.esta_activo)
    const cumpleEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activos' && estaActivo) ||
      (filtroEstado === 'inactivos' && !estaActivo)

    return cumpleEstado
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Empleados</h2>
          <p className="text-muted-foreground">
            Administra empleados internos (administradores y gestores)
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
                Crea empleados internos con rol de administrador o gestor
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

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Empleados</CardDescription>
            <CardTitle className="text-3xl">{usuarios.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Empleados Activos</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {usuarios.filter(u => u.esta_activo).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Empleados Inactivos</CardDescription>
            <CardTitle className="text-3xl text-gray-500">
              {usuarios.filter(u => !u.esta_activo).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Empleados del Sistema</CardTitle>
              <CardDescription>
                Lista de empleados internos (administradores y gestores)
              </CardDescription>
            </div>

            {/* Filtro de Estado */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500 hidden sm:block" />
              <Select value={filtroEstado} onValueChange={(value: any) => setFiltroEstado(value)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Cargando empleados...</p>
          ) : usuarios.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay empleados registrados
            </p>
          ) : usuariosFiltrados.length === 0 ? (
            <p className="text-center text-gray-600 py-4">
              No hay empleados {filtroEstado !== 'todos' && filtroEstado}
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
                {usuariosFiltrados.map((usuario) => (
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
                      <Badge
                        variant={usuario.esta_activo ? 'default' : 'secondary'}
                        className={usuario.esta_activo ? 'bg-green-500' : 'bg-gray-500'}
                      >
                        {usuario.esta_activo ? (
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
                      {new Date(usuario.fecha_creacion).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirModalAcciones(usuario)}
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
            <DialogTitle className="text-xl">Acciones de Empleado</DialogTitle>
            <DialogDescription>
              {usuarioActual && `${usuarioActual.nombre} ${usuarioActual.apellido}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Editar Empleado */}
            <button
              onClick={() => usuarioActual && abrirEditar(usuarioActual)}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Editar Empleado</h3>
                <p className="text-sm text-gray-600">
                  Modificar información del empleado
                </p>
              </div>
            </button>

            {/* Activar/Desactivar */}
            <button
              onClick={() => usuarioActual && handleToggleActivo(usuarioActual)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all group ${
                usuarioActual?.esta_activo
                  ? 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                  : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
              }`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                usuarioActual?.esta_activo
                  ? 'bg-orange-100 group-hover:bg-orange-200'
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <Power className={`h-5 w-5 ${
                  usuarioActual?.esta_activo ? 'text-orange-600' : 'text-green-600'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">
                  {usuarioActual?.esta_activo ? 'Desactivar' : 'Activar'} Empleado
                </h3>
                <p className="text-sm text-gray-600">
                  {usuarioActual?.esta_activo
                    ? 'No podrá acceder al sistema'
                    : 'Podrá acceder al sistema nuevamente'}
                </p>
              </div>
            </button>

            {/* Nota informativa */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                ℹ️ Los empleados inactivos se mantienen en el sistema para preservar el historial
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Empleado */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
            <DialogDescription>
              Actualiza la información del empleado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={actualizarUsuario} className="space-y-4">
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
              <Label htmlFor="edit-rol">Rol *</Label>
              <Select value={rol} onValueChange={setRol} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                  <SelectItem value={UserRole.GESTOR}>Gestor</SelectItem>
                </SelectContent>
              </Select>
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
