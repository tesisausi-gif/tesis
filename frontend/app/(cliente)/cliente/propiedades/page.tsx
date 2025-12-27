'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Building2, MapPin, Plus, Home, Edit, Trash2, Power, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface TipoInmueble {
  id_tipo_inmueble: number
  nombre: string
}

interface Provincia {
  id: string
  nombre: string
}

interface Localidad {
  id: string
  nombre: string
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
  id_cliente: number
  tipos_inmuebles?: TipoInmueble
}

export default function ClientePropiedades() {
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([])
  const [tiposInmuebles, setTiposInmuebles] = useState<TipoInmueble[]>([])
  const [loading, setLoading] = useState(true)
  const [idCliente, setIdCliente] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingInmueble, setEditingInmueble] = useState<Inmueble | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [inmuebleToDelete, setInmuebleToDelete] = useState<Inmueble | null>(null)

  // Location data
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [localidades, setLocalidades] = useState<Localidad[]>([])
  const [loadingLocalidades, setLoadingLocalidades] = useState(false)

  // Form state
  const [tipoInmueble, setTipoInmueble] = useState('')
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
    cargarTiposInmuebles()
    cargarProvincias()
  }, [])

  // Cargar localidades cuando cambia la provincia
  useEffect(() => {
    if (provincia) {
      cargarLocalidades(provincia)
    } else {
      setLocalidades([])
      setLocalidad('')
    }
  }, [provincia])

  const cargarInmuebles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Obtener id_cliente del usuario
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id_cliente')
        .eq('id', user.id)
        .single()

      if (usuario?.id_cliente) {
        setIdCliente(usuario.id_cliente)

        // Obtener inmuebles del cliente con tipo
        const { data: inmuebles, error } = await supabase
          .from('inmuebles')
          .select('*, tipos_inmuebles(id_tipo_inmueble, nombre)')
          .eq('id_cliente', usuario.id_cliente)

        if (error) {
          toast.error('Error al cargar inmuebles')
          return
        }

        setInmuebles(inmuebles || [])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar inmuebles')
    } finally {
      setLoading(false)
    }
  }

  const cargarTiposInmuebles = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_inmuebles')
        .select('*')
        .eq('esta_activo', true)
        .order('nombre')

      if (error) {
        console.error('Error al cargar tipos:', error)
        return
      }

      setTiposInmuebles(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cargarProvincias = async () => {
    try {
      const response = await fetch('https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre&max=24')
      const data = await response.json()

      if (data.provincias) {
        setProvincias(data.provincias.sort((a: Provincia, b: Provincia) =>
          a.nombre.localeCompare(b.nombre)
        ))
      }
    } catch (error) {
      console.error('Error al cargar provincias:', error)
      toast.error('Error al cargar provincias')
    }
  }

  const cargarLocalidades = async (provinciaNombre: string) => {
    setLoadingLocalidades(true)
    try {
      const response = await fetch(
        `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provinciaNombre)}&campos=id,nombre&max=1000`
      )
      const data = await response.json()

      if (data.localidades) {
        // Eliminar duplicados por nombre
        const localidadesUnicas = data.localidades.filter(
          (loc: Localidad, index: number, self: Localidad[]) =>
            index === self.findIndex((l: Localidad) => l.nombre === loc.nombre)
        )

        setLocalidades(localidadesUnicas.sort((a: Localidad, b: Localidad) =>
          a.nombre.localeCompare(b.nombre)
        ))
      }
    } catch (error) {
      console.error('Error al cargar localidades:', error)
      toast.error('Error al cargar localidades')
    } finally {
      setLoadingLocalidades(false)
    }
  }

  const limpiarFormulario = () => {
    setTipoInmueble('')
    setProvincia('')
    setLocalidad('')
    setBarrio('')
    setCalle('')
    setAltura('')
    setPiso('')
    setDpto('')
    setInfoAdicional('')
    setEditingInmueble(null)
  }

  const abrirDialogCrear = () => {
    limpiarFormulario()
    setDialogOpen(true)
  }

  const abrirDialogEditar = (inmueble: Inmueble) => {
    setEditingInmueble(inmueble)
    setTipoInmueble(inmueble.id_tipo_inmueble.toString())
    setProvincia(inmueble.provincia || '')
    setLocalidad(inmueble.localidad || '')
    setBarrio(inmueble.barrio || '')
    setCalle(inmueble.calle || '')
    setAltura(inmueble.altura || '')
    setPiso(inmueble.piso || '')
    setDpto(inmueble.dpto || '')
    setInfoAdicional(inmueble.informacion_adicional || '')
    setDialogOpen(true)
  }

  const registrarInmueble = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tipoInmueble || !provincia || !localidad || !calle || !altura) {
      toast.error('Por favor completa todos los campos obligatorios')
      return
    }

    if (!idCliente && !editingInmueble) {
      toast.error('No se pudo identificar el cliente')
      return
    }

    setSubmitting(true)

    try {
      const inmuebleData = {
        id_tipo_inmueble: parseInt(tipoInmueble),
        provincia,
        localidad,
        barrio: barrio || null,
        calle,
        altura,
        piso: piso || null,
        dpto: dpto || null,
        informacion_adicional: infoAdicional || null,
      }

      if (editingInmueble) {
        // Actualizar inmueble existente
        const { error } = await supabase
          .from('inmuebles')
          .update(inmuebleData)
          .eq('id_inmueble', editingInmueble.id_inmueble)

        if (error) {
          toast.error('Error al actualizar inmueble', {
            description: error.message
          })
          return
        }

        toast.success('Inmueble actualizado exitosamente')
      } else {
        // Crear nuevo inmueble
        const { error } = await supabase
          .from('inmuebles')
          .insert({
            ...inmuebleData,
            id_cliente: idCliente,
            esta_activo: true
          })

        if (error) {
          toast.error('Error al registrar inmueble', {
            description: error.message
          })
          return
        }

        toast.success('Inmueble registrado exitosamente')
      }

      limpiarFormulario()
      setDialogOpen(false)
      cargarInmuebles()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleEstadoInmueble = async (inmueble: Inmueble) => {
    try {
      const nuevoEstado = !inmueble.esta_activo
      const { error } = await supabase
        .from('inmuebles')
        .update({ esta_activo: nuevoEstado })
        .eq('id_inmueble', inmueble.id_inmueble)

      if (error) {
        toast.error('Error al cambiar estado del inmueble')
        return
      }

      toast.success(
        nuevoEstado
          ? 'Inmueble activado exitosamente'
          : 'Inmueble dado de baja exitosamente'
      )
      cargarInmuebles()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    }
  }

  const confirmarEliminar = (inmueble: Inmueble) => {
    setInmuebleToDelete(inmueble)
    setDeleteDialogOpen(true)
  }

  const eliminarInmueble = async () => {
    if (!inmuebleToDelete) return

    try {
      const { error } = await supabase
        .from('inmuebles')
        .delete()
        .eq('id_inmueble', inmuebleToDelete.id_inmueble)

      if (error) {
        toast.error('Error al eliminar inmueble', {
          description: error.message
        })
        return
      }

      toast.success('Inmueble eliminado exitosamente')
      setDeleteDialogOpen(false)
      setInmuebleToDelete(null)
      cargarInmuebles()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando inmuebles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 py-6 md:px-6 md:py-8">
      {/* Header - Mobile First */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Mis Inmuebles
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Propiedades asociadas a tu cuenta
          </p>
        </div>

        {inmuebles && inmuebles.length > 0 && (
          <Button
            onClick={abrirDialogCrear}
            className="w-full md:w-auto gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar Inmueble
          </Button>
        )}
      </div>

      {inmuebles && inmuebles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inmuebles.map((inmueble) => (
            <Card key={inmueble.id_inmueble} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-1">
                      <Building2 className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base md:text-lg truncate">
                        {inmueble.tipos_inmuebles?.nombre || 'Inmueble'}
                      </CardTitle>
                      <CardDescription className="flex items-start gap-1 mt-1 text-xs md:text-sm">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">
                          {[inmueble.calle, inmueble.altura, inmueble.piso && `Piso ${inmueble.piso}`, inmueble.dpto && `Dpto ${inmueble.dpto}`]
                            .filter(Boolean)
                            .join(' ')}
                          {inmueble.barrio && `, ${inmueble.barrio}`}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {inmueble.esta_activo ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Inactivo
                      </Badge>
                    )}

                    {/* Menú de Acciones */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => abrirDialogEditar(inmueble)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleEstadoInmueble(inmueble)}>
                          <Power className="mr-2 h-4 w-4" />
                          {inmueble.esta_activo ? 'Dar de Baja' : 'Activar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => confirmarEliminar(inmueble)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              {inmueble.informacion_adicional && (
                <CardContent className="pt-0">
                  <p className="text-xs md:text-sm text-gray-700 line-clamp-3">
                    {inmueble.informacion_adicional}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State - Mobile First & Aesthetic */
        <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 md:py-16 text-center">
            <div className="rounded-full bg-blue-100 p-4 md:p-6 mb-6">
              <Home className="h-12 w-12 md:h-16 md:w-16 text-blue-600" />
            </div>

            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              ¡Aún no tienes inmuebles registrados!
            </h3>

            <p className="text-sm md:text-base text-gray-600 mb-6 max-w-md">
              Para poder reportar incidentes y solicitar servicios técnicos, primero debes registrar al menos un inmueble.
            </p>

            <Button
              size="lg"
              className="w-full md:w-auto gap-2 shadow-lg hover:shadow-xl transition-shadow"
              onClick={abrirDialogCrear}
            >
              <Plus className="h-5 w-5" />
              Registrar mi primer inmueble
            </Button>

            <p className="text-xs md:text-sm text-gray-500 mt-4">
              Podrás gestionar tus incidentes una vez que registres un inmueble
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog para registrar/editar inmueble */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl">
              {editingInmueble ? 'Editar Inmueble' : 'Registrar Inmueble'}
            </DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              {editingInmueble
                ? 'Actualiza los datos de tu propiedad'
                : 'Completa los datos de tu propiedad para poder gestionar incidentes'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={registrarInmueble} className="space-y-4 mt-4">
            {/* Tipo de Inmueble */}
            <div className="space-y-2">
              <Label htmlFor="tipo" className="text-sm md:text-base">
                Tipo de Inmueble *
              </Label>
              <Select value={tipoInmueble} onValueChange={setTipoInmueble}>
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposInmuebles.map((tipo) => (
                    <SelectItem key={tipo.id_tipo_inmueble} value={tipo.id_tipo_inmueble.toString()}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Provincia y Localidad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provincia" className="text-sm md:text-base">
                  Provincia *
                </Label>
                <Select value={provincia} onValueChange={setProvincia} disabled={submitting}>
                  <SelectTrigger id="provincia">
                    <SelectValue placeholder="Selecciona provincia" />
                  </SelectTrigger>
                  <SelectContent>
                    {provincias.map((prov) => (
                      <SelectItem key={prov.id} value={prov.nombre}>
                        {prov.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="localidad" className="text-sm md:text-base">
                  Localidad *
                </Label>
                <Select
                  value={localidad}
                  onValueChange={setLocalidad}
                  disabled={submitting || !provincia || loadingLocalidades}
                >
                  <SelectTrigger id="localidad">
                    <SelectValue placeholder={
                      loadingLocalidades
                        ? 'Cargando...'
                        : !provincia
                        ? 'Primero selecciona provincia'
                        : 'Selecciona localidad'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {localidades.map((loc) => (
                      <SelectItem key={loc.id} value={loc.nombre}>
                        {loc.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Barrio */}
            <div className="space-y-2">
              <Label htmlFor="barrio" className="text-sm md:text-base">
                Barrio
              </Label>
              <Input
                id="barrio"
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
                placeholder="Ej: Palermo, Recoleta, Centro... (opcional)"
                disabled={submitting}
              />
            </div>

            {/* Calle y Altura */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="calle" className="text-sm md:text-base">
                  Calle *
                </Label>
                <Input
                  id="calle"
                  value={calle}
                  onChange={(e) => setCalle(e.target.value)}
                  placeholder="Ej: Av. 7"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="altura" className="text-sm md:text-base">
                  Altura *
                </Label>
                <Input
                  id="altura"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  placeholder="Ej: 1234"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Piso y Dpto (solo si NO es Casa) */}
            {tipoInmueble &&
             tiposInmuebles.find(t => t.id_tipo_inmueble.toString() === tipoInmueble)?.nombre !== 'Casa' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="piso" className="text-sm md:text-base">
                    Piso
                  </Label>
                  <Input
                    id="piso"
                    value={piso}
                    onChange={(e) => setPiso(e.target.value)}
                    placeholder="Opcional"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dpto" className="text-sm md:text-base">
                    Dpto
                  </Label>
                  <Input
                    id="dpto"
                    value={dpto}
                    onChange={(e) => setDpto(e.target.value)}
                    placeholder="Opcional"
                    disabled={submitting}
                  />
                </div>
              </div>
            )}

            {/* Información Adicional */}
            <div className="space-y-2">
              <Label htmlFor="info-adicional" className="text-sm md:text-base">
                Información Adicional
              </Label>
              <Textarea
                id="info-adicional"
                value={infoAdicional}
                onChange={(e) => setInfoAdicional(e.target.value)}
                placeholder="Detalles adicionales, referencias, etc."
                rows={3}
                disabled={submitting}
              />
            </div>

            {/* Botones */}
            <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full md:w-auto"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full md:flex-1"
                disabled={submitting}
              >
                {submitting
                  ? editingInmueble ? 'Actualizando...' : 'Registrando...'
                  : editingInmueble ? 'Actualizar Inmueble' : 'Registrar Inmueble'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El inmueble será eliminado permanentemente
              de tu cuenta.
              {inmuebleToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="font-medium text-gray-900">
                    {inmuebleToDelete.tipos_inmuebles?.nombre || 'Inmueble'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {[inmuebleToDelete.calle, inmuebleToDelete.altura].filter(Boolean).join(' ')}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse md:flex-row gap-2">
            <AlertDialogCancel className="w-full md:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarInmueble}
              className="w-full md:w-auto bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
