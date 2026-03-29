'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart2, Clock, TrendingUp, Users, AlertCircle, Tag, Filter, Loader2, FileSpreadsheet, LineChart } from 'lucide-react'
import { toast } from 'sonner'
import { getMetricasDashboard } from '@/features/incidentes/incidentes.service'
import type { MetricasDashboard } from '@/features/incidentes/incidentes.types'
import { ExportarContent } from '@/components/admin/exportar-content.client'
import { ReportesContent } from '@/components/admin/reportes-content.client'
import type { ReportesData } from '@/features/reportes/reportes.service'

interface MetricasContentProps {
  metricas: MetricasDashboard
  reportes: ReportesData
}

type Periodo = '7d' | '30d' | '90d' | '6m' | '1y' | 'custom' | 'todo'

function fechaDesde(periodo: Periodo): string | null {
  if (periodo === 'todo' || periodo === 'custom') return null
  const ahora = new Date()
  const dias: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '6m': 182, '1y': 365 }
  ahora.setDate(ahora.getDate() - dias[periodo])
  return ahora.toISOString().slice(0, 10)
}

function BarraHorizontal({ valor, maximo, color = 'bg-blue-500', showLabel = true }: { valor: number; maximo: number; color?: string; showLabel?: boolean }) {
  const pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-sm font-medium w-6 text-right text-gray-700">{valor}</span>}
    </div>
  )
}

export function MetricasContent({ metricas: metricasIniciales, reportes }: MetricasContentProps) {
  const [metricas, setMetricas] = useState(metricasIniciales)
  const [periodo, setPeriodo] = useState<Periodo>('todo')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [cargando, setCargando] = useState(false)

  const aplicarFiltro = async (p: Periodo) => {
    setPeriodo(p)
    if (p === 'custom') return // espera inputs manuales
    setCargando(true)
    try {
      const desde = fechaDesde(p)
      const nuevas = await getMetricasDashboard(desde ? { fechaDesde: desde } : undefined)
      setMetricas(nuevas)
    } catch {
      toast.error('Error al filtrar métricas')
    } finally {
      setCargando(false)
    }
  }

  const aplicarFiltroCustom = async () => {
    if (!customDesde && !customHasta) return
    setCargando(true)
    try {
      const nuevas = await getMetricasDashboard({
        fechaDesde: customDesde || undefined,
        fechaHasta: customHasta || undefined,
      })
      setMetricas(nuevas)
    } catch {
      toast.error('Error al filtrar métricas')
    } finally {
      setCargando(false)
    }
  }

  const maxMes = Math.max(...metricas.incidentesPorMes.map(m => m.total), 1)
  const maxCategoria = Math.max(...metricas.distribucionCategorias.map(c => c.count), 1)

  const PERIODOS: { valor: Periodo; label: string }[] = [
    { valor: 'todo', label: 'Todo' },
    { valor: '7d', label: '7 días' },
    { valor: '30d', label: '30 días' },
    { valor: '90d', label: '90 días' },
    { valor: '6m', label: '6 meses' },
    { valor: '1y', label: '1 año' },
    { valor: 'custom', label: 'Personalizado' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Métricas e Informes</h2>
          <p className="text-muted-foreground">Análisis de rendimiento y reportes exportables</p>
        </div>
        {cargando && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

    <Tabs defaultValue="metricas">
      <TabsList className="mb-4">
        <TabsTrigger value="metricas" className="gap-2"><BarChart2 className="h-4 w-4" />Métricas</TabsTrigger>
        <TabsTrigger value="reportes" className="gap-2"><LineChart className="h-4 w-4" />Reportes</TabsTrigger>
        <TabsTrigger value="informes" className="gap-2"><FileSpreadsheet className="h-4 w-4" />Informes</TabsTrigger>
      </TabsList>

      <TabsContent value="informes">
        <ExportarContent />
      </TabsContent>

      <TabsContent value="reportes">
        <ReportesContent data={reportes} />
      </TabsContent>

      <TabsContent value="metricas" className="space-y-6">

      {/* Filtro de período */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtrar por período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PERIODOS.map(p => (
              <Button
                key={p.valor}
                size="sm"
                variant={periodo === p.valor ? 'default' : 'outline'}
                onClick={() => aplicarFiltro(p.valor)}
                disabled={cargando}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {periodo === 'custom' && (
            <div className="flex flex-wrap gap-3 items-end pt-1">
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={customDesde} onChange={e => setCustomDesde(e.target.value)} className="w-36 h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={customHasta} onChange={e => setCustomHasta(e.target.value)} className="w-36 h-8 text-sm" />
              </div>
              <Button size="sm" onClick={aplicarFiltroCustom} disabled={cargando || (!customDesde && !customHasta)}>
                Aplicar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{metricas.totalIncidentes}</div>
            <p className="text-xs text-muted-foreground">En el sistema</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio Resolución</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {metricas.tiempoPromedioResolucion > 0 ? `${metricas.tiempoPromedioResolucion}d` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Días promedio hasta cierre</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Técnico</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-600 truncate">
              {metricas.topTecnicos[0]
                ? `${metricas.topTecnicos[0].nombre} ${metricas.topTecnicos[0].apellido}`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metricas.topTecnicos[0]
                ? `${metricas.topTecnicos[0].incidentesResueltos} incidentes resueltos`
                : 'Sin datos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras - Incidentes por mes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-600" />
            Incidentes por Mes
          </CardTitle>
          <CardDescription>Últimos 6 meses — total vs resueltos</CardDescription>
        </CardHeader>
        <CardContent>
          {metricas.incidentesPorMes.every(m => m.total === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin datos en los últimos 6 meses</p>
          ) : (
            <div className="space-y-3">
              {metricas.incidentesPorMes.map((item) => (
                <div key={item.mes}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="font-medium capitalize">{item.mes}</span>
                    <span>{item.resueltos}/{item.total}</span>
                  </div>
                  {/* Barra total */}
                  <div className="relative h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-200 rounded transition-all duration-500"
                      style={{ width: `${maxMes > 0 ? (item.total / maxMes) * 100 : 0}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-green-500 rounded transition-all duration-500"
                      style={{ width: `${maxMes > 0 ? (item.resueltos / maxMes) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-200 inline-block" /> Total</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Resueltos</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Distribución por Categoría */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-orange-600" />
              Por Categoría
            </CardTitle>
            <CardDescription>Distribución de incidentes</CardDescription>
          </CardHeader>
          <CardContent>
            {metricas.distribucionCategorias.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {metricas.distribucionCategorias.map((item) => (
                  <div key={item.categoria}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="truncate max-w-[60%]">{item.categoria}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <BarraHorizontal valor={item.count} maximo={maxCategoria} color="bg-orange-400" showLabel={false} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Ranking de Técnicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Ranking de Técnicos
          </CardTitle>
          <CardDescription>Por incidentes resueltos (asignaciones completadas)</CardDescription>
        </CardHeader>
        <CardContent>
          {metricas.topTecnicos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay asignaciones completadas aún</p>
          ) : (
            <div className="space-y-3">
              {metricas.topTecnicos.map((tec, idx) => {
                const maxResueltos = metricas.topTecnicos[0].incidentesResueltos
                return (
                  <div key={`${tec.nombre}_${tec.apellido}`} className="flex items-center gap-3">
                    <span className={`text-sm font-bold w-5 text-center ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-700' : 'text-gray-400'}`}>
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-medium w-36 truncate">
                      {tec.nombre} {tec.apellido}
                    </span>
                    <div className="flex-1">
                      <BarraHorizontal
                        valor={tec.incidentesResueltos}
                        maximo={maxResueltos}
                        color={idx === 0 ? 'bg-yellow-400' : 'bg-purple-400'}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>
    </Tabs>
    </div>
  )
}
