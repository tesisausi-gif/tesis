'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, Search, Filter, Eye, Users, Clock, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { estadoIncidenteColors, prioridadColors, EstadoIncidente, NivelPrioridad, CategoriaIncidente } from '@/types/enums'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'

interface Incidente {
  id_incidente: number
  descripcion_problema: string
  categoria: string | null
  nivel_prioridad: string | null
  estado_actual: string
  fecha_registro: string
  fecha_cierre: string | null
  fue_resuelto: boolean
  inmuebles: {
    calle: string | null
    altura: string | null
    localidad: string | null
  } | null
  clientes: {
    nombre: string
    apellido: string
  } | null
}

const estados = Object.values(EstadoIncidente)
const categorias = Object.values(CategoriaIncidente)

export default function IncidentesAdminPage() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    cargarIncidentes()
  }, [])

  const cargarIncidentes = async () => {
    try {
      const { data, error } = await supabase
        .from('incidentes')
        .select(`
          id_incidente,
          descripcion_problema,
          categoria,
          nivel_prioridad,
          estado_actual,
          fecha_registro,
          fecha_cierre,
          fue_resuelto,
          inmuebles (calle, altura, localidad),
          clientes:id_cliente_reporta (nombre, apellido)
        `)
        .order('fecha_registro', { ascending: false })

      if (error) {
        console.error('Error al cargar incidentes:', error)
        toast.error('Error al cargar incidentes')
        return
      }

      setIncidentes((data as unknown as Incidente[]) || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar incidentes')
    } finally {
      setLoading(false)
    }
  }

  const incidentesFiltrados = incidentes.filter((incidente) => {
    // Filtro por estado
    if (filtroEstado !== 'todos' && incidente.estado_actual !== filtroEstado) {
      return false
    }

    // Filtro por categoría
    if (filtroCategoria !== 'todos' && incidente.categoria !== filtroCategoria) {
      return false
    }

    // Filtro por búsqueda
    if (busqueda) {
      const searchLower = busqueda.toLowerCase()
      const matchId = incidente.id_incidente.toString().includes(searchLower)
      const matchDesc = incidente.descripcion_problema.toLowerCase().includes(searchLower)
      const matchCliente = `${incidente.clientes?.nombre} ${incidente.clientes?.apellido}`.toLowerCase().includes(searchLower)
      const matchDireccion = `${incidente.inmuebles?.calle} ${incidente.inmuebles?.altura}`.toLowerCase().includes(searchLower)

      if (!matchId && !matchDesc && !matchCliente && !matchDireccion) {
        return false
      }
    }

    return true
  })

  const getEstadoColor = (estado: string) => {
    return estadoIncidenteColors[estado as EstadoIncidente] || 'bg-gray-100 text-gray-800'
  }

  const getPrioridadColor = (prioridad: string) => {
    return prioridadColors[prioridad as NivelPrioridad] || 'bg-gray-100 text-gray-800'
  }

  const abrirModal = (id: number) => {
    setIncidenteSeleccionado(id)
    setModalOpen(true)
  }

  // Stats
  const totalIncidentes = incidentes.length
  const pendientes = incidentes.filter(i => i.estado_actual === EstadoIncidente.REPORTADO).length
  const enProceso = incidentes.filter(i =>
    [EstadoIncidente.EN_EVALUACION, EstadoIncidente.ASIGNADO, EstadoIncidente.EN_PROCESO, EstadoIncidente.EN_EJECUCION].includes(i.estado_actual as EstadoIncidente)
  ).length
  const resueltos = incidentes.filter(i => i.fue_resuelto).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando incidentes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Incidentes</h1>
        <p className="text-gray-600 mt-1">
          Administra y da seguimiento a todos los incidentes reportados
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncidentes}</div>
            <p className="text-xs text-muted-foreground">incidentes registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendientes}</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{enProceso}</div>
            <p className="text-xs text-muted-foreground">siendo atendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resueltos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resueltos}</div>
            <p className="text-xs text-muted-foreground">finalizados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por ID, descripción, cliente o dirección..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {estados.map((estado) => (
                  <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las categorías</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Incidentes */}
      <Card>
        <CardHeader>
          <CardTitle>Incidentes ({incidentesFiltrados.length})</CardTitle>
          <CardDescription>
            Click en un incidente para ver los detalles completos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidentesFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidentesFiltrados.map((incidente) => (
                    <TableRow
                      key={incidente.id_incidente}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => abrirModal(incidente.id_incidente)}
                    >
                      <TableCell className="font-medium">
                        #{incidente.id_incidente}
                      </TableCell>
                      <TableCell>
                        {incidente.clientes
                          ? `${incidente.clientes.nombre} ${incidente.clientes.apellido}`
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {incidente.inmuebles
                          ? `${incidente.inmuebles.calle} ${incidente.inmuebles.altura}, ${incidente.inmuebles.localidad}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {incidente.categoria || '-'}
                      </TableCell>
                      <TableCell>
                        {incidente.nivel_prioridad && (
                          <Badge className={getPrioridadColor(incidente.nivel_prioridad)}>
                            {incidente.nivel_prioridad}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEstadoColor(incidente.estado_actual)}>
                          {incidente.estado_actual}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(incidente.fecha_registro), 'dd/MM/yy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            abrirModal(incidente.id_incidente)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron incidentes</p>
              {(filtroEstado !== 'todos' || filtroCategoria !== 'todos' || busqueda) && (
                <Button
                  variant="link"
                  onClick={() => {
                    setFiltroEstado('todos')
                    setFiltroCategoria('todos')
                    setBusqueda('')
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalle */}
      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={cargarIncidentes}
        rol="admin"
      />
    </div>
  )
}
