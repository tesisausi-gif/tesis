'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Star, AlertCircle, Loader2 } from 'lucide-react'
import { getTecnicosParaAsignacion } from '@/features/usuarios/usuarios.service'
import { crearAsignacion } from '@/features/asignaciones/asignaciones.service'
import type { Tecnico } from '@/features/usuarios/usuarios.types'

interface ModalAsignarTecnicoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idIncidente: number
  categoriaIncidente: string | null
  onAsignarExito: () => void
}

export function ModalAsignarTecnico({
  open,
  onOpenChange,
  idIncidente,
  categoriaIncidente,
  onAsignarExito,
}: ModalAsignarTecnicoProps) {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [cargando, setCargando] = useState(false)
  const [asignando, setAsignando] = useState(false)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<Tecnico | null>(null)
  const [busqueda, setBusqueda] = useState('')

  // Cargar técnicos
  useEffect(() => {
    if (!open) return

    const cargarTecnicos = async () => {
      setCargando(true)
      try {
        const data = await getTecnicosParaAsignacion()
        setTecnicos(data)
      } catch (error) {
        console.error('Error cargando técnicos:', error)
        toast.error('Error al cargar técnicos')
      } finally {
        setCargando(false)
      }
    }

    cargarTecnicos()
  }, [open])

  // Filtrar técnicos por búsqueda y especialidad
  const tecnicosFiltrados = tecnicos.filter((t) => {
    const matchNombre = `${t.nombre} ${t.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
    const matchEspecialidad = (t.especialidad || '').toLowerCase().includes(busqueda.toLowerCase())

    // Si hay categoría, filtrar por especialidad compatible
    if (categoriaIncidente) {
      const especialidadMatch = (t.especialidad || '').toLowerCase().includes(categoriaIncidente.toLowerCase())
      return (matchNombre || matchEspecialidad) && especialidadMatch
    }

    return matchNombre || matchEspecialidad
  })

  // Renderizar calificación en estrellas
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ))
  }

  // Asignar técnico
  const handleAsignar = async () => {
    if (!tecnicoSeleccionado) {
      toast.error('Selecciona un técnico')
      return
    }

    setAsignando(true)
    try {
      const result = await crearAsignacion({
        id_incidente: idIncidente,
        id_tecnico: tecnicoSeleccionado.id_tecnico,
        observaciones: null,
      })

      if (result.success) {
        toast.success(`Técnico ${tecnicoSeleccionado.nombre} asignado exitosamente`)
        onAsignarExito()
        onOpenChange(false)
        setTecnicoSeleccionado(null)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error asignando técnico:', error)
      toast.error('Error al asignar técnico')
    } finally {
      setAsignando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Asignar Técnico</DialogTitle>
          <DialogDescription>
            Selecciona un técnico para el incidente #{idIncidente}
            {categoriaIncidente && ` (${categoriaIncidente})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Búsqueda */}
          <div>
            <Label htmlFor="busqueda-tecnico">Buscar Técnico</Label>
            <Input
              id="busqueda-tecnico"
              placeholder="Nombre, apellido o especialidad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Tabla de Técnicos */}
          {cargando ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Cargando técnicos...</span>
            </div>
          ) : tecnicosFiltrados.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">
                {busqueda ? 'No se encontraron técnicos' : 'No hay técnicos disponibles'}
              </p>
            </Card>
          ) : (
            <div className="h-[400px] w-full rounded-md border overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Calificación</TableHead>
                    <TableHead>Trabajos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tecnicosFiltrados.map((tecnico) => (
                    <TableRow
                      key={tecnico.id_tecnico}
                      className={`cursor-pointer hover:bg-blue-50 ${
                        tecnicoSeleccionado?.id_tecnico === tecnico.id_tecnico
                          ? 'bg-blue-100'
                          : ''
                      }`}
                      onClick={() => setTecnicoSeleccionado(tecnico)}
                    >
                      <TableCell>
                        <input
                          type="radio"
                          checked={
                            tecnicoSeleccionado?.id_tecnico === tecnico.id_tecnico
                          }
                          onChange={() => setTecnicoSeleccionado(tecnico)}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {tecnico.nombre} {tecnico.apellido}
                      </TableCell>
                      <TableCell>{tecnico.especialidad}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {renderStars(tecnico.calificacion_promedio ?? 0)}
                          <span className="text-sm ml-1 font-medium">
                            {tecnico.calificacion_promedio != null ? tecnico.calificacion_promedio.toFixed(1) : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {tecnico.cantidad_trabajos_realizados}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Detalle del técnico seleccionado */}
          {tecnicoSeleccionado && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm font-medium text-blue-900">
                Seleccionado: <span className="font-bold">{tecnicoSeleccionado.nombre} {tecnicoSeleccionado.apellido}</span>
              </p>
              <p className="text-xs text-blue-800 mt-1">
                Especialidad: {tecnicoSeleccionado.especialidad} • Trabajos realizados: {tecnicoSeleccionado.cantidad_trabajos_realizados}
              </p>
            </Card>
          )}

          {/* Botones */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={asignando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAsignar}
              disabled={!tecnicoSeleccionado || asignando}
            >
              {asignando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Asignando...
                </>
              ) : (
                'Asignar Técnico'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
