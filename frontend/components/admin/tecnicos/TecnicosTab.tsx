'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Star, Eye, Power, Filter, Edit } from 'lucide-react'
import TecnicoCalificacionesDialog from './TecnicoCalificacionesDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Tecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  correo_electronico: string
  telefono: string | null
  dni: string | null
  direccion: string | null
  especialidad: string | null
  calificacion_promedio: number | null
  cantidad_trabajos_realizados: number
  esta_activo: boolean
  fecha_creacion: string
}

export default function TecnicosTab() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionsDialogOpen, setActionsDialogOpen] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos')
  const [filtroEspecialidad, setFiltroEspecialidad] = useState<string>('todas')
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<{
    id: number
    nombre: string
  } | null>(null)
  const [tecnicoActual, setTecnicoActual] = useState<Tecnico | null>(null)
  const supabase = createClient()

  useEffect(() => {
    cargarTecnicos()
  }, [])

  const cargarTecnicos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tecnicos')
      .select('*')
      .order('fecha_creacion', { ascending: false })

    if (error) {
      toast.error('Error al cargar técnicos')
      console.error(error)
    } else {
      setTecnicos(data || [])
    }
    setLoading(false)
  }

  const toggleActivo = async (tecnico: Tecnico) => {
    const { error } = await supabase
      .from('tecnicos')
      .update({ esta_activo: !tecnico.esta_activo })
      .eq('id_tecnico', tecnico.id_tecnico)

    if (error) {
      toast.error('Error al actualizar estado')
      console.error(error)
    } else {
      toast.success(tecnico.esta_activo ? 'Técnico desactivado' : 'Técnico activado')
      cargarTecnicos()
    }
  }

  const abrirModalAcciones = (tecnico: Tecnico) => {
    setTecnicoActual(tecnico)
    setActionsDialogOpen(true)
  }

  const abrirCalificaciones = (tecnico: Tecnico) => {
    setActionsDialogOpen(false)
    setTecnicoSeleccionado({
      id: tecnico.id_tecnico,
      nombre: `${tecnico.nombre} ${tecnico.apellido}`,
    })
    setDialogOpen(true)
  }

  const handleToggleActivo = async (tecnico: Tecnico) => {
    setActionsDialogOpen(false)
    await toggleActivo(tecnico)
  }

  // Obtener especialidades únicas
  const especialidadesUnicas = Array.from(
    new Set(
      tecnicos
        .map((t) => t.especialidad)
        .filter((e) => e !== null && e !== '')
    )
  ).sort()

  // Filtrar técnicos según los filtros seleccionados
  const tecnicosFiltrados = tecnicos.filter((tecnico) => {
    // Filtro por estado - convertir a booleano para manejar tanto números como booleanos
    const estaActivo = Boolean(tecnico.esta_activo)
    const cumpleEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activos' && estaActivo) ||
      (filtroEstado === 'inactivos' && !estaActivo)

    // Filtro por especialidad
    const cumpleEspecialidad =
      filtroEspecialidad === 'todas' ||
      tecnico.especialidad === filtroEspecialidad

    return cumpleEstado && cumpleEspecialidad
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Técnicos Registrados</CardTitle>
            <CardDescription>
              Lista de todos los técnicos en el sistema
            </CardDescription>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500 hidden sm:block" />

            {/* Filtro de Estado */}
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

            {/* Filtro de Especialidad */}
            <Select value={filtroEspecialidad} onValueChange={(value: string) => setFiltroEspecialidad(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Especialidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las especialidades</SelectItem>
                {especialidadesUnicas.map((esp) => (
                  <SelectItem key={esp} value={esp!}>
                    {esp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-gray-600 py-4">Cargando técnicos...</p>
        ) : tecnicos.length === 0 ? (
          <p className="text-center text-gray-600 py-4">
            No hay técnicos registrados
          </p>
        ) : tecnicosFiltrados.length === 0 ? (
          <p className="text-center text-gray-600 py-4">
            No hay técnicos
            {filtroEstado !== 'todos' && ` ${filtroEstado}`}
            {filtroEspecialidad !== 'todas' && ` con especialidad "${filtroEspecialidad}"`}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Trabajos</TableHead>
                <TableHead>Calificación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tecnicosFiltrados.map((tecnico) => (
                <TableRow key={tecnico.id_tecnico}>
                  <TableCell className="font-medium">
                    {tecnico.nombre} {tecnico.apellido}
                  </TableCell>
                  <TableCell>{tecnico.correo_electronico}</TableCell>
                  <TableCell>{tecnico.telefono || '-'}</TableCell>
                  <TableCell>{tecnico.especialidad || '-'}</TableCell>
                  <TableCell>{tecnico.cantidad_trabajos_realizados}</TableCell>
                  <TableCell>
                    {tecnico.calificacion_promedio
                      ? `${tecnico.calificacion_promedio.toFixed(1)} ⭐`
                      : 'Sin calificar'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={tecnico.esta_activo ? 'default' : 'secondary'}
                      className={tecnico.esta_activo ? 'bg-green-500' : 'bg-gray-500'}
                    >
                      {tecnico.esta_activo ? (
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
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirModalAcciones(tecnico)}
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

      {tecnicoSeleccionado && (
        <TecnicoCalificacionesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          idTecnico={tecnicoSeleccionado.id}
          nombreTecnico={tecnicoSeleccionado.nombre}
        />
      )}

      {/* Modal de Acciones */}
      <Dialog open={actionsDialogOpen} onOpenChange={setActionsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Acciones de Técnico</DialogTitle>
            <DialogDescription>
              {tecnicoActual && `${tecnicoActual.nombre} ${tecnicoActual.apellido}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Ver Calificaciones */}
            <button
              onClick={() => tecnicoActual && abrirCalificaciones(tecnicoActual)}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Ver Calificaciones</h3>
                <p className="text-sm text-gray-600">
                  Historial de calificaciones del técnico
                </p>
              </div>
            </button>

            {/* Editar Técnico */}
            <button
              onClick={() => {
                setActionsDialogOpen(false)
                toast.info('Función de edición próximamente disponible')
              }}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Editar Técnico</h3>
                <p className="text-sm text-gray-600">
                  Modificar información del técnico
                </p>
              </div>
            </button>

            {/* Activar/Desactivar */}
            <button
              onClick={() => tecnicoActual && handleToggleActivo(tecnicoActual)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all group ${
                tecnicoActual?.esta_activo
                  ? 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                  : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
              }`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                tecnicoActual?.esta_activo
                  ? 'bg-orange-100 group-hover:bg-orange-200'
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <Power className={`h-5 w-5 ${
                  tecnicoActual?.esta_activo ? 'text-orange-600' : 'text-green-600'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">
                  {tecnicoActual?.esta_activo ? 'Desactivar' : 'Activar'} Técnico
                </h3>
                <p className="text-sm text-gray-600">
                  {tecnicoActual?.esta_activo
                    ? 'No podrá acceder al sistema ni recibir nuevos trabajos'
                    : 'Podrá acceder al sistema y recibir nuevos trabajos'}
                </p>
              </div>
            </button>

            {/* Nota informativa */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                ℹ️ Los técnicos inactivos se mantienen en el sistema para preservar el historial de trabajos realizados
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
