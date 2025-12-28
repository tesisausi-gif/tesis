'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Building2, MapPin, Eye } from 'lucide-react'

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Inmuebles Registrados
          </CardTitle>
          <CardDescription>
            Lista completa de todos los inmuebles del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Cargando inmuebles...</p>
          ) : inmuebles.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay inmuebles registrados
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
                {inmuebles.map((inmueble) => (
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
                      <Badge variant={inmueble.esta_activo ? 'default' : 'secondary'}>
                        {inmueble.esta_activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(inmueble.fecha_creacion).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/inmueble/${inmueble.id_inmueble}`)}
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
    </div>
  )
}
