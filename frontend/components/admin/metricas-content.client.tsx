'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BarChart2, Clock, Users,
  Tag, Filter, Loader2, CheckCircle2, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

function TitleTooltip({ children, texto }: { children: React.ReactNode; texto: string }) {
  return (
    <span className="relative group cursor-default">
      <span className="border-b border-dotted border-slate-400 leading-none">{children}</span>
      <span className="
        absolute z-50 bottom-full left-0 mb-2 w-64
        rounded-lg bg-slate-900 text-white text-xs p-3 shadow-xl leading-relaxed
        opacity-0 group-hover:opacity-100 transition-opacity duration-150
        pointer-events-none normal-case font-normal tracking-normal whitespace-normal
      ">
        {texto}
        <span className="absolute top-full left-4 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  )
}
import { toast } from 'sonner'
import { getMetricasDashboard } from '@/features/incidentes/incidentes.service'
import type { MetricasDashboard } from '@/features/incidentes/incidentes.types'
import { ReportesContent } from '@/components/admin/reportes-content.client'
import type { ReportesData } from '@/features/reportes/reportes.service'
import { PpisContent } from '@/components/admin/ppis-content.client'
import type { TodosPpisData } from '@/features/reportes/metricas-ppis.service'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

interface MetricasContentProps {
  metricas: MetricasDashboard
  reportes: ReportesData
  ppis: TodosPpisData
}

type Periodo = '7d' | '30d' | '90d' | '6m' | '1y' | 'custom' | 'todo'

function fechaDesde(periodo: Periodo): string | null {
  if (periodo === 'todo' || periodo === 'custom') return null
  const ahora = new Date()
  const dias: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '6m': 182, '1y': 365 }
  ahora.setDate(ahora.getDate() - dias[periodo])
  return ahora.toISOString().slice(0, 10)
}

const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: 'todo', label: 'Todo' },
  { valor: '7d',   label: '7 días' },
  { valor: '30d',  label: '30 días' },
  { valor: '90d',  label: '90 días' },
  { valor: '6m',   label: '6 meses' },
  { valor: '1y',   label: '1 año' },
  { valor: 'custom', label: 'Personalizado' },
]

type SeccionActiva = 'indicadores' | 'ppis'

export function MetricasContent({ metricas: metricasIniciales, reportes, ppis }: MetricasContentProps) {
  const [seccion, setSeccion] = useState<SeccionActiva>('ppis')
  const [metricas, setMetricas] = useState(metricasIniciales)
  const [periodo, setPeriodo] = useState<Periodo>('todo')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [cargando, setCargando] = useState(false)

  const aplicarFiltro = async (p: Periodo) => {
    setPeriodo(p)
    if (p === 'custom') return
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

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Indicadores"
        subtitle="Análisis de rendimiento y reportes del sistema Mantis"
        right={cargando ? (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Actualizando...
          </div>
        ) : undefined}
      />

      {/* Selector de sección — tab "Indicadores" oculto temporalmente */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start">
        {/* <button
          onClick={() => setSeccion('indicadores')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            seccion === 'indicadores'
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
          }`}
        >
          Indicadores
        </button> */}
        <button
          onClick={() => setSeccion('ppis')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            seccion === 'ppis'
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
          }`}
        >
          PPIs de Proceso
        </button>
      </div>

      {/* ── Sección PPIs ────────────────────────────────────────────────────── */}
      {seccion === 'ppis' && (
        <PpisContent ppis={ppis} />
      )}

      {/* ── Sección Indicadores (existentes) ──────────────────────────────── */}
      {seccion === 'indicadores' && (<>

      {/* Loading indicator */}
      {cargando && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-end">
          <Loader2 className="h-4 w-4 animate-spin" /> Actualizando...
        </div>
      )}

      {/* Filtro de período */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
            <Filter className="h-4 w-4" /> Filtrar KPIs por período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            {PERIODOS.map(p => (
              <button
                key={p.valor}
                onClick={() => aplicarFiltro(p.valor)}
                disabled={cargando}
                className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                  periodo === p.valor
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                }`}
              >
                {p.label}
              </button>
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
              <Button size="sm" onClick={aplicarFiltroCustom} disabled={cargando || (!customDesde && !customHasta)} className="bg-blue-700 hover:bg-blue-800">
                Aplicar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <Card className="border-l-4 border-l-blue-600 bg-gradient-to-br from-white to-blue-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              <TitleTooltip texto="Cuántos incidentes se crearon en el período que seleccionaste con el filtro de arriba. Es el volumen total de trabajo que entró al sistema.">
                Total Incidentes
              </TitleTooltip>
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-3xl font-bold text-blue-700">{metricas.totalIncidentes}</div>
            <p className="text-xs text-slate-400 mt-1">registrados en el período</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500 bg-gradient-to-br from-white to-teal-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              <TitleTooltip texto="En promedio, cuántos días pasan desde que se crea un incidente hasta que se cierra. Cuanto más bajo, más rápido se resuelven los problemas.">
                Tiempo Prom. Resolución
              </TitleTooltip>
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-3xl font-bold text-teal-700">
              {metricas.tiempoPromedioResolucion > 0 ? `${metricas.tiempoPromedioResolucion}d` : '—'}
            </div>
            <p className="text-xs text-slate-400 mt-1">días hasta cierre</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              <TitleTooltip texto="De cada 100 incidentes registrados, cuántos se cerraron con éxito. Cuanto más cerca del 100%, mejor está funcionando el sistema.">
                Tasa de Resolución
              </TitleTooltip>
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-3xl font-bold text-green-700">{reportes.kpisAdministrativos.racioResolucion}%</div>
            <p className="text-xs text-slate-400 mt-1">incidentes resueltos / total</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500 bg-gradient-to-br from-white to-violet-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              <TitleTooltip texto="El técnico con más incidentes resueltos en el período seleccionado. Un indicador rápido de quién está liderando el equipo.">
                Top Técnico
              </TitleTooltip>
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-base font-bold text-violet-700 truncate leading-tight mt-1">
              {metricas.topTecnicos[0] ? (
                <Link href="/dashboard/tecnicos" className="hover:underline hover:text-violet-900 transition-colors">
                  {metricas.topTecnicos[0].nombre} {metricas.topTecnicos[0].apellido}
                </Link>
              ) : '—'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {metricas.topTecnicos[0]
                ? `${metricas.topTecnicos[0].incidentesResueltos} incidentes resueltos`
                : 'Sin asignaciones completadas'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Incidentes por mes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <TitleTooltip texto="Evolución mes a mes de cuántos incidentes se abrieron y cuántos se cerraron. Si la barra azul oscura (resueltos) crece, el equipo está mejorando su capacidad de respuesta.">
              Incidentes por Mes
            </TitleTooltip>
          </CardTitle>
          <CardDescription>Últimos 6 meses — total vs. resueltos</CardDescription>
        </CardHeader>
        <CardContent>
          {metricas.incidentesPorMes.every(m => m.total === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin datos en los últimos 6 meses</p>
          ) : (
            <div className="space-y-3">
              {metricas.incidentesPorMes.map(item => (
                <div key={item.mes}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span className="font-medium capitalize">{item.mes}</span>
                    <span className="tabular-nums">
                      <span className="text-green-600 font-semibold">{item.resueltos}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span>{item.total}</span>
                    </span>
                  </div>
                  <div className="relative h-5 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-100 rounded transition-all duration-500"
                      style={{ width: `${maxMes > 0 ? (item.total / maxMes) * 100 : 0}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-600 rounded transition-all duration-500"
                      style={{ width: `${maxMes > 0 ? (item.resueltos / maxMes) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-blue-100 inline-block" /> Total</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-blue-600 inline-block" /> Resueltos</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Por Categoría + Ranking Técnicos */}
      <div className="grid gap-4 lg:grid-cols-2">

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4 text-amber-600" />
              <TitleTooltip texto="Qué tipos de problemas se reportan más. La barra más larga es la categoría más demandada — útil para saber en qué especialidades tener más técnicos disponibles.">
                Por Categoría
              </TitleTooltip>
            </CardTitle>
            <CardDescription>Volumen de incidentes por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            {metricas.distribucionCategorias.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {metricas.distribucionCategorias.map(item => {
                  const pct = maxCategoria > 0 ? Math.round((item.count / maxCategoria) * 100) : 0
                  return (
                    <div key={item.categoria}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="truncate max-w-[65%] font-medium">{item.categoria}</span>
                        <span className="font-bold tabular-nums">{item.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-violet-600" />
              <TitleTooltip texto="Los técnicos ordenados de mayor a menor por incidentes resueltos. Muestra quién lleva más trabajo completado en el período seleccionado.">
                Ranking de Técnicos
              </TitleTooltip>
            </CardTitle>
            <CardDescription>Por incidentes resueltos</CardDescription>
          </CardHeader>
          <CardContent>
            {metricas.topTecnicos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay asignaciones completadas aún</p>
            ) : (
              <div className="space-y-3">
                {metricas.topTecnicos.map((tec, idx) => {
                  const maxResueltos = metricas.topTecnicos[0].incidentesResueltos
                  const pct = maxResueltos > 0 ? Math.round((tec.incidentesResueltos / maxResueltos) * 100) : 0
                  const medallaColor = idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-300'
                  const barColor = idx === 0 ? 'bg-yellow-400' : 'bg-violet-400'
                  return (
                    <div key={`${tec.nombre}_${tec.apellido}`} className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-5 text-center shrink-0 ${medallaColor}`}>#{idx + 1}</span>
                      <Link href="/dashboard/tecnicos" className="text-sm font-medium truncate flex-1 min-w-0 hover:text-blue-600 hover:underline transition-colors">
                        {tec.nombre} {tec.apellido}
                      </Link>
                      <div className="w-28 flex items-center gap-2 shrink-0">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-4 text-right tabular-nums">{tec.incidentesResueltos}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Separador: 13 Reportes de Valor ── */}
      <div className="flex items-center gap-3 pt-4">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 px-3">13 Reportes de Valor</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* 13 secciones analíticas */}
      <ReportesContent data={reportes} />

      </>)}

    </div>
  )
}
