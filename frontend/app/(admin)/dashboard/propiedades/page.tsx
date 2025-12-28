'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Building2, MapPin, Eye, Power, Edit, CheckCircle2, XCircle, Filter } from 'lucide-react'

interface TipoInmueble {
  id_tipo_inmueble: number
  nombre: string
}

interface Cliente {
  id_cliente: number
  nombre: string
  apellido: string
}

interface Inmueble {
  id_inmueble: number
  id_tipo_inmueble: number
  provincia: string | null
  localidad: string | null
  barrio: string | null
  calle: string | null
  altura: string | null
  piso: string | null
  dpto: string | null
  informacion_adicional: string | null
  esta_activo: boolean
  fecha_creacion: string
  tipos_inmuebles?: TipoInmueble
  clientes?: Cliente
}

export default function InmueblesPage() {
  const router = useRouter()
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([])
  const [loading, setLoading] = useState(true)
  const [actionsDialogOpen, setActionsDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [inmuebleActual, setInmuebleActual] = useState<Inmueble | null>(null)
  const [inmuebleEditando, setInmuebleEditando] = useState<Inmueble | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos')
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [barrio, setBarrio] = useState('')
  const [calle, setCalle] = useState('')
  const [altura, setAltura] = useState('')
  const [piso, setPiso] = useState('')
  const [dpto, setDpto] = useState('')
  const [infoAdicional, setInfoAdicional] = useState('')

  const supabase = createClient()

  useEffect(() => {
    cargarInmuebles()
  }, [])

  const cargarInmuebles = async () => {
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select(`
          *,
          tipos_inmuebles (
            id_tipo_inmueble,
            nombre
          ),
          clientes (
            id_cliente,
            nombre,
            apellido
          )
        `)
        .order('fecha_creacion', { ascending: false })

      if (error) {
        console.error('Error al cargar inmuebles:', error)
        toast.error('Error al cargar inmuebles')
        return
      }

      setInmuebles(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar inmuebles')
    } finally {
      setLoading(false)
    }
  }

  const construirDireccion = (inmueble: Inmueble): string => {
    const partes = [
      inmueble.calle,
      inmueble.altura,
      inmueble.piso && `Piso ${inmueble.piso}`,
      inmueble.dpto && `Dpto ${inmueble.dpto}`,
    ].filter(Boolean)

    let direccion = partes.join(' ')

    if (inmueble.barrio) {
      direccion += `, ${inmueble.barrio}`
    }

    if (inmueble.localidad) {
      direccion += `, ${inmueble.localidad}`
    }

    if (inmueble.provincia) {
      direccion += `, ${inmueble.provincia}`
    }

    return direccion || 'Sin dirección'
  }

  const abrirModalAcciones = (inmueble: Inmueble) => {
    setInmuebleActual(inmueble)
    setActionsDialogOpen(true)
  }

  const verDetalleInmueble = (inmueble: Inmueble) => {
    setActionsDialogOpen(false)
    router.push(`/inmueble/${inmueble.id_inmueble}`)
  }

  const toggleActivoInmueble = async (inmueble: Inmueble) => {
    const nuevoEstado = !inmueble.esta_activo

    try {
      const { error } = await supabase
        .from('inmuebles')
        .update({ esta_activo: nuevoEstado })
        .eq('id_inmueble', inmueble.id_inmueble)

      if (error) {
        toast.error('Error al actualizar estado del inmueble')
        console.error(error)
        return
      }

      toast.success(nuevoEstado ? 'Inmueble activado exitosamente' : 'Inmueble desactivado exitosamente')
      cargarInmuebles()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar estado del inmueble')
    }
  }

  const handleToggleActivo = async (inmueble: Inmueble) => {
    setActionsDialogOpen(false)
    await toggleActivoInmueble(inmueble)
  }

  const abrirEditar = (inmueble: Inmueble) => {
    setActionsDialogOpen(false)
    setInmuebleEditando(inmueble)
    setProvincia(inmueble.provincia || '')
    setLocalidad(inmueble.localidad || '')
    setBarrio(inmueble.barrio || '')
    setCalle(inmueble.calle || '')
    setAltura(inmueble.altura || '')
    setPiso(inmueble.piso || '')
    setDpto(inmueble.dpto || '')
    setInfoAdicional(inmueble.informacion_adicional || '')
    setEditDialogOpen(true)
  }

  const actualizarInmueble = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inmuebleEditando) return

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('inmuebles')
        .update({
          provincia: provincia || null,
          localidad: localidad || null,
          barrio: barrio || null,
          calle: calle || null,
          altura: altura || null,
          piso: piso || null,
          dpto: dpto || null,
          informacion_adicional: infoAdicional || null,
        })
        .eq('id_inmueble', inmuebleEditando.id_inmueble)

      if (error) {
        toast.error('Error al actualizar inmueble', {
          description: error.message
        })
        return
      }

      toast.success('Inmueble actualizado exitosamente')

      // Limpiar formulario
      setProvincia('')
      setLocalidad('')
      setBarrio('')
      setCalle('')
      setAltura('')
      setPiso('')
      setDpto('')
      setInfoAdicional('')

      // Cerrar dialog y recargar
      setEditDialogOpen(false)
      setInmuebleEditando(null)
      cargarInmuebles()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado al actualizar inmueble')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtrar inmuebles según el estado seleccionado
  const inmueblesFiltrados = inmuebles.filter((inmueble) => {
    const estaActivo = Boolean(inmueble.esta_activo)
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
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Inmuebles</h2>
          <p className="text-muted-foreground">
            Administra todos los inmuebles registrados en el sistema
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Inmuebles</CardDescription>
            <CardTitle className="text-3xl">{inmuebles.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Inmuebles Activos</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {inmuebles.filter(i => i.esta_activo).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Inmuebles Inactivos</CardDescription>
            <CardTitle className="text-3xl text-gray-500">
              {inmuebles.filter(i => !i.esta_activo).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Inmuebles Registrados
              </CardTitle>
              <CardDescription>
                Lista completa de todos los inmuebles del sistema
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
            <p className="text-center text-muted-foreground py-4">Cargando inmuebles...</p>
          ) : inmuebles.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay inmuebles registrados
            </p>
          ) : inmueblesFiltrados.length === 0 ? (
            <p className="text-center text-gray-600 py-4">
              No hay inmuebles {filtroEstado !== 'todos' && filtroEstado}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inmueblesFiltrados.map((inmueble) => (
                  <TableRow key={inmueble.id_inmueble}>
                    <TableCell className="font-medium">
                      #{inmueble.id_inmueble}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        {inmueble.tipos_inmuebles?.nombre || 'Sin tipo'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2 max-w-md">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{construirDireccion(inmueble)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {inmueble.clientes
                        ? `${inmueble.clientes.nombre} ${inmueble.clientes.apellido}`
                        : 'Sin cliente'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={inmueble.esta_activo ? 'default' : 'secondary'}
                        className={inmueble.esta_activo ? 'bg-green-500' : 'bg-gray-500'}
                      >
                        {inmueble.esta_activo ? (
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
                      {new Date(inmueble.fecha_creacion).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirModalAcciones(inmueble)}
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
            <DialogTitle className="text-xl">Acciones de Inmueble</DialogTitle>
            <DialogDescription>
              {inmuebleActual && (
                <>
                  {inmuebleActual.tipos_inmuebles?.nombre || 'Inmueble'} - {construirDireccion(inmuebleActual)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Ver Detalle */}
            <button
              onClick={() => inmuebleActual && verDetalleInmueble(inmuebleActual)}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Ver Detalle Completo</h3>
                <p className="text-sm text-gray-600">
                  Ver información completa e incidentes del inmueble
                </p>
              </div>
            </button>

            {/* Editar Inmueble */}
            <button
              onClick={() => inmuebleActual && abrirEditar(inmuebleActual)}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Editar Inmueble</h3>
                <p className="text-sm text-gray-600">
                  Modificar información del inmueble
                </p>
              </div>
            </button>

            {/* Activar/Desactivar */}
            <button
              onClick={() => inmuebleActual && handleToggleActivo(inmuebleActual)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all group ${
                inmuebleActual?.esta_activo
                  ? 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                  : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
              }`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                inmuebleActual?.esta_activo
                  ? 'bg-orange-100 group-hover:bg-orange-200'
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <Power className={`h-5 w-5 ${
                  inmuebleActual?.esta_activo ? 'text-orange-600' : 'text-green-600'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">
                  {inmuebleActual?.esta_activo ? 'Desactivar' : 'Activar'} Inmueble
                </h3>
                <p className="text-sm text-gray-600">
                  {inmuebleActual?.esta_activo
                    ? 'El inmueble quedará inactivo pero se preservará su historial'
                    : 'El inmueble volverá a estar activo en el sistema'}
                </p>
              </div>
            </button>

            {/* Nota informativa */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                ℹ️ Los inmuebles inactivos se mantienen en el sistema para preservar el historial de incidentes
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Inmueble */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Inmueble</DialogTitle>
            <DialogDescription>
              Actualiza la información del inmueble.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={actualizarInmueble} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-provincia">Provincia</Label>
                <Input
                  id="edit-provincia"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  disabled={submitting}
                  placeholder="Buenos Aires"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-localidad">Localidad</Label>
                <Input
                  id="edit-localidad"
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  disabled={submitting}
                  placeholder="CABA"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-barrio">Barrio</Label>
              <Input
                id="edit-barrio"
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
                disabled={submitting}
                placeholder="Palermo"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-calle">Calle</Label>
                <Input
                  id="edit-calle"
                  value={calle}
                  onChange={(e) => setCalle(e.target.value)}
                  disabled={submitting}
                  placeholder="Av. Santa Fe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-altura">Altura</Label>
                <Input
                  id="edit-altura"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  disabled={submitting}
                  placeholder="1234"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-piso">Piso</Label>
                <Input
                  id="edit-piso"
                  value={piso}
                  onChange={(e) => setPiso(e.target.value)}
                  disabled={submitting}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dpto">Departamento</Label>
                <Input
                  id="edit-dpto"
                  value={dpto}
                  onChange={(e) => setDpto(e.target.value)}
                  disabled={submitting}
                  placeholder="A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-info">Información Adicional</Label>
              <Textarea
                id="edit-info"
                value={infoAdicional}
                onChange={(e) => setInfoAdicional(e.target.value)}
                disabled={submitting}
                placeholder="Detalles adicionales del inmueble..."
                rows={3}
              />
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
