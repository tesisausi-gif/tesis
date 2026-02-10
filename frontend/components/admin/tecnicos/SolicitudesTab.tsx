'use client'

import { useState, useEffect } from 'react'
import {
  getSolicitudesRegistro,
  rechazarSolicitud as rechazarSolicitudService,
  aprobarSolicitudTecnico,
} from '@/features/usuarios/usuarios.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Filter } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Solicitud {
  id_solicitud: number
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  dni: string | null
  especialidad: string | null
  direccion: string | null
  estado_solicitud: string
  fecha_solicitud: string
}

export default function SolicitudesTab() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>('todas')

  useEffect(() => {
    cargarSolicitudes()
  }, [])

  const cargarSolicitudes = async () => {
    try {
      const data = await getSolicitudesRegistro()
      setSolicitudes(data as Solicitud[])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }

  const abrirDialog = (solicitud: Solicitud) => {
    setSelectedSolicitud(solicitud)
    setPassword(Math.random().toString(36).slice(-8))
    setDialogOpen(true)
  }

  const aprobarSolicitud = async () => {
    if (!selectedSolicitud || !password) {
      toast.error('Debes generar una contraseña')
      return
    }

    setProcesando(true)

    try {
      const result = await aprobarSolicitudTecnico(
        selectedSolicitud.id_solicitud,
        password
      )

      if (!result.success) {
        toast.error('Error al aprobar solicitud', {
          description: result.error
        })
        return
      }

      toast.success('Técnico aprobado', {
        description: `Se ha enviado un email a ${selectedSolicitud.email} con la contraseña`
      })

      setDialogOpen(false)
      setSelectedSolicitud(null)
      setPassword('')
      cargarSolicitudes()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al aprobar solicitud')
    } finally {
      setProcesando(false)
    }
  }

  const rechazarSolicitud = async (id: number) => {
    if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return

    try {
      const result = await rechazarSolicitudService(id)

      if (!result.success) {
        toast.error('Error al rechazar solicitud')
        return
      }

      toast.success('Solicitud rechazada')
      cargarSolicitudes()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al rechazar solicitud')
    }
  }

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aprobada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800',
    }
    return colors[estado] || 'bg-gray-100 text-gray-800'
  }

  const generarNuevaPassword = () => {
    const newPass = Math.random().toString(36).slice(-10)
    setPassword(newPass)
  }

  // Filtrar solicitudes según el estado seleccionado
  const solicitudesFiltradas = solicitudes.filter((solicitud) => {
    if (filtroEstado === 'todas') return true
    return solicitud.estado_solicitud === filtroEstado
  })

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Solicitudes de Registro</CardTitle>
              <CardDescription>
                Revisa y aprueba las solicitudes de técnicos que desean registrarse
              </CardDescription>
            </div>

            {/* Filtro de Estado */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filtroEstado} onValueChange={(value: any) => setFiltroEstado(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="aprobada">Aprobadas</SelectItem>
                  <SelectItem value="rechazada">Rechazadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-600 py-4">Cargando solicitudes...</p>
          ) : solicitudes.length === 0 ? (
            <p className="text-center text-gray-600 py-4">
              No hay solicitudes
            </p>
          ) : solicitudesFiltradas.length === 0 ? (
            <p className="text-center text-gray-600 py-4">
              No hay solicitudes {filtroEstado !== 'todas' ? `en estado "${filtroEstado}"` : ''}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudesFiltradas.map((solicitud) => (
                  <TableRow key={solicitud.id_solicitud}>
                    <TableCell className="font-medium">
                      {solicitud.nombre} {solicitud.apellido}
                    </TableCell>
                    <TableCell>{solicitud.email}</TableCell>
                    <TableCell>{solicitud.especialidad || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(solicitud.estado_solicitud)}>
                        {solicitud.estado_solicitud}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(solicitud.fecha_solicitud).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {solicitud.estado_solicitud === 'pendiente' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirDialog(solicitud)}
                            title="Aprobar"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => rechazarSolicitud(solicitud.id_solicitud)}
                            title="Rechazar"
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aprobar Técnico</DialogTitle>
            <DialogDescription>
              Genera una contraseña para el nuevo técnico
            </DialogDescription>
          </DialogHeader>
          {selectedSolicitud && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Técnico</Label>
                <p className="text-sm font-medium">
                  {selectedSolicitud.nombre} {selectedSolicitud.apellido}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm">{selectedSolicitud.email}</p>
              </div>
              <div className="space-y-2">
                <Label>Especialidad</Label>
                <p className="text-sm">{selectedSolicitud.especialidad || 'No especificada'}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña Temporal</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generarNuevaPassword}
                  >
                    Generar
                  </Button>
                </div>
                <p className="text-xs text-gray-600">
                  Esta contraseña se enviará al técnico por email
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={procesando}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={aprobarSolicitud}
                  disabled={procesando || !password}
                >
                  {procesando ? 'Aprobando...' : 'Aprobar y Crear Cuenta'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
