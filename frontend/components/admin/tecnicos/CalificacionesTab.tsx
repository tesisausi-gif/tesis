'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  tecnico_nombre?: string
  tecnico_apellido?: string
  incidente_descripcion?: string
}

export default function CalificacionesTab() {
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    cargarCalificaciones()
  }, [])

  const cargarCalificaciones = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('calificaciones')
      .select(`
        *,
        tecnicos:id_tecnico (
          nombre,
          apellido
        ),
        incidentes:id_incidente (
          descripcion_problema
        )
      `)
      .order('fecha_calificacion', { ascending: false })

    if (error) {
      toast.error('Error al cargar calificaciones')
      console.error(error)
    } else {
      const formattedData = (data || []).map((cal: any) => ({
        ...cal,
        tecnico_nombre: cal.tecnicos?.nombre,
        tecnico_apellido: cal.tecnicos?.apellido,
        incidente_descripcion: cal.incidentes?.descripcion_problema,
      }))
      setCalificaciones(formattedData)
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
    <Card>
      <CardHeader>
        <CardTitle>Calificaciones de Técnicos</CardTitle>
        <CardDescription>
          Historial de calificaciones y comentarios sobre el trabajo de los técnicos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-gray-600 py-4">Cargando calificaciones...</p>
        ) : calificaciones.length === 0 ? (
          <p className="text-center text-gray-600 py-4">
            No hay calificaciones registradas
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Técnico</TableHead>
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
                  <TableCell className="font-medium">
                    {calificacion.tecnico_nombre && calificacion.tecnico_apellido
                      ? `${calificacion.tecnico_nombre} ${calificacion.tecnico_apellido}`
                      : 'Técnico no disponible'}
                  </TableCell>
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
        )}
      </CardContent>
    </Card>
  )
}
