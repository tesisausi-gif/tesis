'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart2, Clock, TrendingUp, Users, AlertCircle, Tag } from 'lucide-react'
import type { MetricasDashboard } from '@/features/incidentes/incidentes.types'

interface MetricasContentProps {
  metricas: MetricasDashboard
}

const PRIORIDAD_COLORS: Record<string, string> = {
  'alta': 'bg-red-500',
  'media': 'bg-yellow-500',
  'baja': 'bg-green-500',
  'Sin prioridad': 'bg-gray-400',
}

const PRIORIDAD_BADGE: Record<string, string> = {
  'alta': 'bg-red-100 text-red-800',
  'media': 'bg-yellow-100 text-yellow-800',
  'baja': 'bg-green-100 text-green-800',
  'Sin prioridad': 'bg-gray-100 text-gray-800',
}

function BarraHorizontal({ valor, maximo, color = 'bg-blue-500' }: { valor: number; maximo: number; color?: string }) {
  const pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium w-6 text-right text-gray-700">{valor}</span>
    </div>
  )
}

export function MetricasContent({ metricas }: MetricasContentProps) {
  const maxMes = Math.max(...metricas.incidentesPorMes.map(m => m.total), 1)
  const maxCategoria = Math.max(...metricas.distribucionCategorias.map(c => c.count), 1)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Métricas y Estadísticas</h2>
        <p className="text-muted-foreground">Análisis de rendimiento del sistema</p>
      </div>

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
                    <BarraHorizontal valor={item.count} maximo={maxCategoria} color="bg-orange-400" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribución por Prioridad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              Por Prioridad
            </CardTitle>
            <CardDescription>Nivel de urgencia de los incidentes</CardDescription>
          </CardHeader>
          <CardContent>
            {metricas.distribucionPrioridades.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
            ) : (
              <div className="space-y-4">
                {metricas.distribucionPrioridades.map((item) => {
                  const total = metricas.distribucionPrioridades.reduce((s, p) => s + p.count, 0)
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                  return (
                    <div key={item.prioridad} className="flex items-center justify-between gap-3">
                      <Badge className={PRIORIDAD_BADGE[item.prioridad] || 'bg-gray-100 text-gray-800'}>
                        {item.prioridad}
                      </Badge>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${PRIORIDAD_COLORS[item.prioridad] || 'bg-gray-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-12 text-right">
                        {item.count} <span className="text-gray-400 text-xs">({pct}%)</span>
                      </span>
                    </div>
                  )
                })}
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
    </div>
  )
}
