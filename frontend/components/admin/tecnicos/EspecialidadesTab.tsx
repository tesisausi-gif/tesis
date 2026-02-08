'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Edit, CheckCircle2, XCircle, Filter } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Especialidad {
  id_especialidad: number
  nombre: string
  descripcion: string | null
  esta_activa: boolean
  fecha_creacion: string
}

export default function EspecialidadesTab() {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEspecialidad, setEditingEspecialidad] = useState<Especialidad | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'activas' | 'inactivas'>('todas')

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchEspecialidades()
  }, [])

  const fetchEspecialidades = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('especialidades')
      .select('*')
      .order('nombre')

    if (error) {
      toast.error('Error al cargar especialidades')
      console.error(error)
    } else {
      setEspecialidades(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    if (editingEspecialidad) {
      const { error } = await supabase
        .from('especialidades')
        .update({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null
        })
        .eq('id_especialidad', editingEspecialidad.id_especialidad)

      if (error) {
        toast.error('Error al actualizar especialidad')
        console.error(error)
      } else {
        toast.success('Especialidad actualizada')
        setDialogOpen(false)
        resetForm()
        fetchEspecialidades()
      }
    } else {
      const { error } = await supabase
        .from('especialidades')
        .insert({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya existe una especialidad con ese nombre')
        } else {
          toast.error('Error al crear especialidad')
        }
        console.error(error)
      } else {
        toast.success('Especialidad creada')
        setDialogOpen(false)
        resetForm()
        fetchEspecialidades()
      }
    }
  }

  const handleToggleActiva = async (especialidad: Especialidad) => {
    const { error } = await supabase
      .from('especialidades')
      .update({ esta_activa: !especialidad.esta_activa })
      .eq('id_especialidad', especialidad.id_especialidad)

    if (error) {
      toast.error('Error al actualizar estado')
      console.error(error)
    } else {
      toast.success(especialidad.esta_activa ? 'Especialidad desactivada' : 'Especialidad activada')
      fetchEspecialidades()
    }
  }

  const handleEdit = (especialidad: Especialidad) => {
    setEditingEspecialidad(especialidad)
    setNombre(especialidad.nombre)
    setDescripcion(especialidad.descripcion || '')
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingEspecialidad(null)
    setNombre('')
    setDescripcion('')
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  // Filtrar especialidades según el estado seleccionado
  const especialidadesFiltradas = especialidades.filter((especialidad) => {
    if (filtroEstado === 'activas') return especialidad.esta_activa === true
    if (filtroEstado === 'inactivas') return especialidad.esta_activa === false
    return true // 'todas'
  })

  return (
    <>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Especialidades</h3>
          <p className="text-sm text-gray-600">
            Define las especialidades disponibles para técnicos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {/* Filtro de Estado */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={filtroEstado} onValueChange={(value: any) => setFiltroEstado(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="activas">Activas</SelectItem>
                <SelectItem value="inactivas">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Especialidad
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEspecialidad ? 'Editar Especialidad' : 'Nueva Especialidad'}
              </DialogTitle>
              <DialogDescription>
                {editingEspecialidad
                  ? 'Modifica los datos de la especialidad'
                  : 'Completa los datos para crear una nueva especialidad'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Plomería"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe brevemente esta especialidad"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingEspecialidad ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-gray-600">Cargando especialidades...</p>
          </CardContent>
        </Card>
      ) : especialidadesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-600">
              No hay especialidades {filtroEstado !== 'todas' ? `${filtroEstado}` : 'registradas'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {especialidadesFiltradas.map((especialidad) => (
            <Card key={especialidad.id_especialidad}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{especialidad.nombre}</CardTitle>
                    {especialidad.descripcion && (
                      <CardDescription className="mt-2">
                        {especialidad.descripcion}
                      </CardDescription>
                    )}
                  </div>
                  <Badge
                    variant={especialidad.esta_activa ? 'default' : 'secondary'}
                    className={especialidad.esta_activa ? 'bg-green-500' : 'bg-gray-500'}
                  >
                    {especialidad.esta_activa ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Activa
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactiva
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(especialidad)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant={especialidad.esta_activa ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleToggleActiva(especialidad)}
                  >
                    {especialidad.esta_activa ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
