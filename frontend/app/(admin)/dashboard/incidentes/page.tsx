import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, Search, Filter, Eye, Users, Clock, CheckCircle, XCircle, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { estadoIncidenteColors, prioridadColors, EstadoIncidente, NivelPrioridad, CategoriaIncidente } from '@/shared/types/enums'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { ModalAsignarTecnico } from '@/components/admin/modal-asignar-tecnico'

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

const estados = Object.values(EstadoIncidente) as string[]
const categorias = Object.values(CategoriaIncidente) as string[]

export default function IncidentesAdminPage() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false)
  const [incidenteParaAsignar, setIncidenteParaAsignar] = useState<{id: number, categoria: string | null} | null>(null)

  const cargarIncidentes = async () => {
    try {
      // TODO: Aquí debería importar getIncidentesForAdmin() del service
      // Por ahora usa supabase directamente pero necesita refactoring
      setIncidentes([])
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

  const abrirModalAsignar = (id: number, categoria: string | null) => {
    setIncidenteParaAsignar({ id, categoria })
    setModalAsignarOpen(true)
  }

  const renderTablaIncidentes = (incidentesAMostrar: Incidente[]) => {
    if (incidentesAMostrar.length === 0) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay incidentes en este estado</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[150px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidentesAMostrar.map((incidente) => (
              <TableRow
                key={incidente.id_incidente}
                className="hover:bg-gray-50"
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
                <TableCell className="text-sm text-gray-600">
                  {format(new Date(incidente.fecha_registro), 'dd/MM/yy', { locale: es })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {incidente.estado_actual === 'pendiente' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => abrirModalAsignar(incidente.id_incidente, incidente.categoria)}
                        className="gap-1"
                      >
                        <Wrench className="h-4 w-4" />
                        Asignar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirModal(incidente.id_incidente)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Stats
  const totalIncidentes = incidentes.length
  const pendientes = incidentes.filter(i => i.estado_actual === EstadoIncidente.PENDIENTE).length
  const enProceso = incidentes.filter(i =>
    i.estado_actual === EstadoIncidente.EN_PROCESO
  ).length
  const resueltos = incidentes.filter(i => i.estado_actual === EstadoIncidente.RESUELTO).length

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

      {/* Tabla de Incidentes por Estado */}
      <div className="space-y-4">
        <Tabs defaultValue="pendiente" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pendiente" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pendientes
              <Badge variant="secondary" className="ml-2">
                {incidentes.filter(i => i.estado_actual === 'pendiente').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="en_proceso" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              En Proceso
              <Badge variant="secondary" className="ml-2">
                {incidentes.filter(i => i.estado_actual === 'en_proceso').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="resuelto" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resueltos
              <Badge variant="secondary" className="ml-2">
                {incidentes.filter(i => i.estado_actual === 'resuelto').length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Pendientes */}
          <TabsContent value="pendiente">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Incidentes Pendientes
                </CardTitle>
                <CardDescription>
                  Incidentes sin técnico asignado. Selecciona uno para asignar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTablaIncidentes(incidentes.filter(i => i.estado_actual === 'pendiente'))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: En Proceso */}
          <TabsContent value="en_proceso">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  Incidentes en Proceso
                </CardTitle>
                <CardDescription>
                  Incidentes con técnico asignado y en ejecución.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTablaIncidentes(incidentes.filter(i => i.estado_actual === 'en_proceso'))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Resueltos */}
          <TabsContent value="resuelto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Incidentes Resueltos
                </CardTitle>
                <CardDescription>
                  Incidentes completados y cerrados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTablaIncidentes(incidentes.filter(i => i.estado_actual === 'resuelto'))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Detalle */}
      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={cargarIncidentes}
        rol="admin"
      />

      {/* Modal de Asignación de Técnico */}
      {incidenteParaAsignar && (
        <ModalAsignarTecnico
          open={modalAsignarOpen}
          onOpenChange={setModalAsignarOpen}
          idIncidente={incidenteParaAsignar.id}
          categoriaIncidente={incidenteParaAsignar.categoria}
          onAsignarExito={() => {
            cargarIncidentes()
            setIncidenteParaAsignar(null)
          }}
        />
      )}
    </div>
  )
}
