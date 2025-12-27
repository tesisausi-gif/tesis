'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Star, Trash2 } from 'lucide-react'
import TecnicoCalificacionesDialog from './TecnicoCalificacionesDialog'
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<{
    id: number
    nombre: string
  } | null>(null)
  const [tecnicoAEliminar, setTecnicoAEliminar] = useState<Tecnico | null>(null)
  const [deleting, setDeleting] = useState(false)
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

  const abrirCalificaciones = (tecnico: Tecnico) => {
    setTecnicoSeleccionado({
      id: tecnico.id_tecnico,
      nombre: `${tecnico.nombre} ${tecnico.apellido}`,
    })
    setDialogOpen(true)
  }

  const abrirDialogoEliminar = (tecnico: Tecnico) => {
    setTecnicoAEliminar(tecnico)
    setDeleteDialogOpen(true)
  }

  const eliminarTecnico = async () => {
    if (!tecnicoAEliminar) return

    setDeleting(true)
    try {
      // Primero, eliminar el usuario asociado si existe
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id_tecnico', tecnicoAEliminar.id_tecnico)
        .single()

      if (usuario) {
        const { error: userError } = await supabase.auth.admin.deleteUser(
          usuario.id
        )

        if (userError) {
          console.error('Error al eliminar usuario de auth:', userError)
          // Continuar con la eliminación del técnico aunque falle la eliminación del usuario de auth
        }
      }

      // Eliminar el técnico (esto también eliminará todas las referencias en cascada)
      const { error } = await supabase
        .from('tecnicos')
        .delete()
        .eq('id_tecnico', tecnicoAEliminar.id_tecnico)

      if (error) {
        toast.error('Error al eliminar técnico')
        console.error(error)
      } else {
        toast.success(`Técnico ${tecnicoAEliminar.nombre} ${tecnicoAEliminar.apellido} eliminado correctamente`)
        setDeleteDialogOpen(false)
        setTecnicoAEliminar(null)
        cargarTecnicos()
      }
    } catch (error) {
      toast.error('Error al eliminar técnico')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Técnicos Registrados</CardTitle>
        <CardDescription>
          Lista de todos los técnicos en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-gray-600 py-4">Cargando técnicos...</p>
        ) : tecnicos.length === 0 ? (
          <p className="text-center text-gray-600 py-4">
            No hay técnicos registrados
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
              {tecnicos.map((tecnico) => (
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
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirCalificaciones(tecnico)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Ver calificaciones
                      </Button>
                      <Button
                        variant={tecnico.esta_activo ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => toggleActivo(tecnico)}
                      >
                        {tecnico.esta_activo ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => abrirDialogoEliminar(tecnico)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar este técnico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el técnico{' '}
              <strong>
                {tecnicoAEliminar?.nombre} {tecnicoAEliminar?.apellido}
              </strong>{' '}
              y todas sus referencias en el sistema:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Usuario asociado</li>
                <li>Asignaciones a incidentes</li>
                <li>Inspecciones realizadas</li>
                <li>Calificaciones recibidas</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminarTecnico}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Eliminando...' : 'Eliminar técnico'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
