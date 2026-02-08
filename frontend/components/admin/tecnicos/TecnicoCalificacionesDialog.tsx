'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Star } from 'lucide-react'

interface Calificacion {
  id_calificacion: number
  id_incidente: number
  id_tecnico: number
  tipo_calificacion: string
  puntuacion: number
  comentarios: string | null
  resolvio_problema: boolean
  fecha_calificacion: string
  incidente_descripcion?: string
}

interface TecnicoCalificacionesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idTecnico: number
  nombreTecnico: string
}

export default function TecnicoCalificacionesDialog({
  open,
  onOpenChange,
  idTecnico,
  nombreTecnico,
}: TecnicoCalificacionesDialogProps) {
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([])
  const [loading, setLoading] = useState(false)
  const [promedioCalificacion, setPromedioCalificacion] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (open && idTecnico) {
      cargarCalificaciones()
    }
  }, [open, idTecnico])

  const cargarCalificaciones = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('calificaciones')
      .select(`
        *,
        incidentes:id_incidente (
          descripcion_problema
        )
      `)
      .eq('id_tecnico', idTecnico)
      .order('fecha_calificacion', { ascending: false })

    if (error) {
      toast.error('Error al cargar calificaciones')
      console.error(error)
    } else {
      const formattedData = (data || []).map((cal: any) => ({
        ...cal,
        incidente_descripcion: cal.incidentes?.descripcion_problema,
      }))
      setCalificaciones(formattedData)

      // Calcular promedio
      if (formattedData.length > 0) {
        const suma = formattedData.reduce((acc: number, cal: Calificacion) => acc + cal.puntuacion, 0)
        setPromedioCalificacion(suma / formattedData.length)
      } else {
        setPromedioCalificacion(null)
      }
    }
    setLoading(false)
  }

  const renderEstrellas = (puntuacion: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < puntuacion
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{puntuacion}/5</span>
      </div>
    )
  }

  const getTipoCalificacionColor = (tipo: string) => {
    const colors: Record<string, string> = {
      excelente: 'bg-green-100 text-green-800',
      buena: 'bg-blue-100 text-blue-800',
      regular: 'bg-yellow-100 text-yellow-800',
      mala: 'bg-red-100 text-red-800',
    }
    return colors[tipo] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calificaciones de {nombreTecnico}</DialogTitle>
          <DialogDescription>
            Historial de calificaciones y comentarios sobre el trabajo del técnico
          </DialogDescription>
        </DialogHeader>

        {promedioCalificacion !== null && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Calificación Promedio</p>
                <div className="flex items-center gap-2 mt-1">
                  {renderEstrellas(Math.round(promedioCalificacion))}
                  <span className="text-lg font-bold">
                    {promedioCalificacion.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total de Calificaciones</p>
                <p className="text-2xl font-bold">{calificaciones.length}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-600 py-8">Cargando calificaciones...</p>
        ) : calificaciones.length === 0 ? (
          <p className="text-center text-gray-600 py-8">
            Este técnico aún no tiene calificaciones
          </p>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Puntuación</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Resolvió</TableHead>
                  <TableHead>Comentarios</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calificaciones.map((calificacion) => (
                  <TableRow key={calificacion.id_calificacion}>
                    <TableCell>
                      <span className="text-sm text-gray-600 line-clamp-2">
                        {calificacion.incidente_descripcion || `Incidente #${calificacion.id_incidente}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {renderEstrellas(calificacion.puntuacion)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTipoCalificacionColor(calificacion.tipo_calificacion)}>
                        {calificacion.tipo_calificacion}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={calificacion.resolvio_problema ? 'default' : 'secondary'}>
                        {calificacion.resolvio_problema ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 line-clamp-2">
                        {calificacion.comentarios || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(calificacion.fecha_calificacion).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
