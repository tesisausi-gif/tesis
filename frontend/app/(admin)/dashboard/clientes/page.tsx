'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getClientesAdmin,
  crearEmpleado,
  actualizarCliente as actualizarClienteService,
  toggleActivoCliente,
  getInmueblesDeCliente,
} from '@/features/usuarios/usuarios.service'
import { normalizeSearch } from '@/shared/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Paginacion } from '@/components/ui/paginacion'
import { toast } from 'sonner'
import { Plus, Edit, Eye, Power, CheckCircle2, XCircle, Filter, Building2, Search, Phone, Mail } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

interface Cliente {
  id_cliente: number
  nombre: string
  apellido: string
  dni: string | null
  correo_electronico: string | null
  telefono: string | null
  esta_activo: boolean
  fecha_creacion: string
}

export default function ClientesPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [actionsDialogOpen, setActionsDialogOpen] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [clienteActual, setClienteActual] = useState<Cliente | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [inmueblesDialogOpen, setInmueblesDialogOpen] = useState(false)
  const [clienteInmuebles, setClienteInmuebles] = useState<any[]>([])
  const [loadingInmuebles, setLoadingInmuebles] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    cargarClientes()
  }, [])

  const cargarClientes = async () => {
    try {
      const data = await getClientesAdmin()
      setClientes(data as Cliente[])
    } catch (error) {
      console.error('Error al cargar clientes:', error)
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
      const result = await crearEmpleado({
        email,
        password,
        nombre,
        apellido,
        rol: 'cliente',
        dni,
        telefono,
      })

      if (!result.success) {
        toast.error('Error al crear cliente', { description: result.error })
        return
      }

      toast.success('Cliente creado exitosamente')
      setEmail('')
      setPassword('')
      setNombre('')
      setApellido('')
      setDni('')
      setTelefono('')
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
      const result = await actualizarClienteService(clienteEditando.id_cliente, {
        nombre,
        apellido,
        dni: dni || null,
        telefono: telefono || null,
        correo_electronico: email || null,
      })

      if (!result.success) {
        toast.error('Error al actualizar cliente', { description: result.error })
        return
      }

      toast.success('Cliente actualizado exitosamente')
      setNombre('')
      setApellido('')
      setDni('')
      setTelefono('')
      setEmail('')
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

  const handleToggleActivoCliente = async (cliente: Cliente) => {
    const nuevoEstado = !cliente.esta_activo
    try {
      const result = await toggleActivoCliente(cliente.id_cliente, nuevoEstado)
      if (!result.success) {
        toast.error('Error al actualizar estado del cliente', { description: result.error })
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
    await handleToggleActivoCliente(cliente)
  }

  const cargarInmueblesCliente = async (idCliente: number) => {
    setLoadingInmuebles(true)
    setInmueblesDialogOpen(true)
    try {
      const data = await getInmueblesDeCliente(idCliente)
      setClienteInmuebles(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar inmuebles')
    } finally {
      setLoadingInmuebles(false)
    }
  }

  // Filtrado: estado + búsqueda por texto
  const clientesFiltrados = clientes.filter((cliente) => {
    const estaActivo = Boolean(cliente.esta_activo)
    const cumpleEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activos' && estaActivo) ||
      (filtroEstado === 'inactivos' && !estaActivo)

    const q = normalizeSearch(busqueda)
    const cumpleBusqueda =
      !q ||
      normalizeSearch(cliente.nombre).includes(q) ||
      normalizeSearch(cliente.apellido).includes(q) ||
      normalizeSearch(cliente.correo_electronico).includes(q) ||
      normalizeSearch(cliente.dni).includes(q) ||
      normalizeSearch(cliente.telefono).includes(q)

    return cumpleEstado && cumpleBusqueda
  })

  const clientesPaginados = clientesFiltrados.slice((pagina - 1) * 10, pagina * 10)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gestión de Clientes"
        subtitle="Administrá los clientes del sistema"
        right={
          <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-white/10 hover:bg-white/20 text-white border border-white/20">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo Cliente
          </Button>
        }
      />

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Clientes</CardDescription>
            <CardTitle className="text-3xl">{clientes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Clientes Activos</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {clientes.filter(c => c.esta_activo).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Clientes Inactivos</CardDescription>
            <CardTitle className="text-3xl text-gray-500">
              {clientes.filter(c => !c.esta_activo).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Clientes Registrados</CardTitle>
              <CardDescription>Lista de todos los clientes del sistema</CardDescription>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500 hidden sm:block" />

              {/* Búsqueda por texto */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email, DNI..."
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
                  className="pl-9 pr-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-[220px]"
                />
              </div>

              {/* Filtro de Estado */}
              <Select value={filtroEstado} onValueChange={(value: any) => { setFiltroEstado(value); setPagina(1) }}>
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
            <p className="text-center text-gray-600 py-4">Cargando clientes...</p>
          ) : clientes.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No hay clientes registrados</p>
          ) : clientesFiltrados.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No se encontraron clientes
              {busqueda && ` para "${busqueda}"`}
              {filtroEstado !== 'todos' && ` ${filtroEstado}`}
            </p>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {clientesPaginados.map((cliente) => (
                  <div
                    key={cliente.id_cliente}
                    className="flex items-center gap-3 py-3 hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
                  >
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-slate-500">
                        {cliente.nombre?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>

                    {/* Nombre + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {cliente.nombre} {cliente.apellido}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{cliente.correo_electronico || '—'}</p>
                    </div>

                    {/* DNI */}
                    <div className="hidden md:flex flex-col shrink-0 w-28">
                      <p className="text-xs text-gray-500">DNI</p>
                      <p className="text-sm text-gray-700">{cliente.dni || '—'}</p>
                    </div>

                    {/* Teléfono */}
                    <div className="hidden lg:flex flex-col shrink-0 w-32">
                      <p className="text-xs text-gray-500">Teléfono</p>
                      <p className="text-sm text-gray-700">{cliente.telefono || '—'}</p>
                    </div>

                    {/* Inmuebles */}
                    <div className="hidden sm:flex shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cargarInmueblesCliente(cliente.id_cliente)}
                        className="h-7 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Building2 className="h-3.5 w-3.5 mr-1.5" />
                        Inmuebles
                      </Button>
                    </div>

                    {/* Estado */}
                    <Badge
                      variant={cliente.esta_activo ? 'default' : 'secondary'}
                      className={`shrink-0 ${cliente.esta_activo ? 'bg-green-500' : 'bg-gray-400'}`}
                    >
                      {cliente.esta_activo ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" />Activo</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" />Inactivo</>
                      )}
                    </Badge>

                    {/* Acciones */}
                    <div className="ml-auto shrink-0">
                      <Button variant="outline" size="sm" onClick={() => abrirModalAcciones(cliente)}>
                        <Eye className="h-4 w-4 mr-1.5" />
                        Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Paginacion pagina={pagina} total={clientesFiltrados.length} onChange={setPagina} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Crear Cliente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required disabled={submitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido *</Label>
                <Input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} required disabled={submitting} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={submitting} minLength={6} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input id="dni" value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} disabled={submitting} placeholder="12345678" inputMode="numeric" maxLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/[^0-9+]/g, ''))} disabled={submitting} placeholder="+54911..." inputMode="tel" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear Cliente'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
            <button
              onClick={() => clienteActual && abrirEdicionDesdeModal(clienteActual)}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Editar Cliente</h3>
                <p className="text-sm text-gray-600">Modificar información del cliente</p>
              </div>
            </button>

            <button
              onClick={() => clienteActual && handleToggleActivo(clienteActual)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all group ${
                clienteActual?.esta_activo
                  ? 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                  : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
              }`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                clienteActual?.esta_activo ? 'bg-orange-100 group-hover:bg-orange-200' : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <Power className={`h-5 w-5 ${clienteActual?.esta_activo ? 'text-orange-600' : 'text-green-600'}`} />
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

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                ℹ️ Los clientes inactivos se mantienen en el sistema para preservar el historial de incidentes y propiedades
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Cliente */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Actualiza la información del cliente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={actualizarCliente} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre *</Label>
                <Input id="edit-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required disabled={submitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-apellido">Apellido *</Label>
                <Input id="edit-apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} required disabled={submitting} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dni">DNI</Label>
                <Input id="edit-dni" value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} disabled={submitting} placeholder="12345678" inputMode="numeric" maxLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefono">Teléfono</Label>
                <Input id="edit-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/[^0-9+]/g, ''))} disabled={submitting} placeholder="+54911..." inputMode="tel" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Inmuebles del Cliente */}
      <Dialog open={inmueblesDialogOpen} onOpenChange={setInmueblesDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Inmuebles del Cliente</DialogTitle>
            <DialogDescription>Selecciona un inmueble para ver su detalle completo</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingInmuebles ? (
              <p className="text-center text-gray-600 py-8">Cargando inmuebles...</p>
            ) : clienteInmuebles.length === 0 ? (
              <p className="text-center text-gray-600 py-8">Este cliente no tiene inmuebles registrados</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {clienteInmuebles.map((inmueble: any) => (
                  <button
                    key={inmueble.id_inmueble}
                    onClick={() => {
                      setInmueblesDialogOpen(false)
                      router.push(`/inmueble/${inmueble.id_inmueble}`)
                    }}
                    className="w-full flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors flex-shrink-0">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {inmueble.tipos_inmuebles?.nombre || 'Inmueble'}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {[
                          inmueble.calle,
                          inmueble.altura,
                          inmueble.piso ? `Piso ${inmueble.piso}` : null,
                          inmueble.dpto ? `Dpto ${inmueble.dpto}` : null,
                        ]
                          .filter(Boolean)
                          .join(' ') || 'Sin dirección especificada'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {inmueble.localidad || 'Sin localidad'}, {inmueble.provincia || 'Sin provincia'}
                      </p>
                      <Badge
                        variant={inmueble.esta_activo ? 'default' : 'secondary'}
                        className={`mt-2 ${inmueble.esta_activo ? 'bg-green-500' : 'bg-gray-500'}`}
                      >
                        {inmueble.esta_activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
