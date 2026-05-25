'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Activity, Wrench, Star, DollarSign,
  TrendingDown, Clock, Building2, RefreshCcw, Timer,
  AlertTriangle, CheckCircle, ShieldCheck, Search,
  BarChart2, FileText, TrendingUp, Layers,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import type { ReportesData, TrabajosPorCategoria, TrabajoCategoriaItem } from '@/features/reportes/reportes.service'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Barra({ valor, maximo, color = 'bg-blue-500' }: { valor: number; maximo: number; color?: string }) {
  const pct = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-7 text-right text-gray-600">{valor}</span>
    </div>
  )
}

const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', enviado: 'Enviado', aprobado_admin: 'Apr. Admin',
  aprobado: 'Aprobado', rechazado: 'Rechazado', vencido: 'Vencido',
}
const ESTADO_COLOR: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700', enviado: 'bg-blue-100 text-blue-700',
  aprobado_admin: 'bg-indigo-100 text-indigo-700', aprobado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700', vencido: 'bg-yellow-100 text-yellow-700',
}
const PRIO_COLOR: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700', alta: 'bg-orange-100 text-orange-700',
  media: 'bg-yellow-100 text-yellow-700', baja: 'bg-green-100 text-green-700',
}
const TIPO_PAGO_LABEL: Record<string, string> = {
  adelanto: 'Adelanto', parcial: 'Parcial', total: 'Total', reembolso: 'Reembolso',
}

// ─── Subcomponente: Trabajos por Categoría (acordeón) ─────────────────────────

function TrabajosPorCategoriaSection({ data }: { data: TrabajosPorCategoria[] }) {
  const [expandida, setExpandida] = useState<string | null>(null)
  const fmtFecha = (s: string) => new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })

  if (data.length === 0) {
    return <Card><CardContent className="text-center py-8 text-sm text-muted-foreground">Sin datos</CardContent></Card>
  }

  return (
    <div className="space-y-2">
      {data.map((cat) => {
        const abierta = expandida === cat.categoria
        return (
          <Card key={cat.categoria} className="overflow-hidden">
            <button
              type="button"
              className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              onClick={() => setExpandida(abierta ? null : cat.categoria)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-gray-800">{cat.categoria}</span>
                  <Badge variant="secondary" className="text-xs">{cat.totalTrabajos} trabajos</Badge>
                  {cat.calificacionPromedio != null && (
                    <span className="text-xs text-yellow-600 font-medium">{cat.calificacionPromedio.toFixed(1)} ⭐</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-1 text-xs text-gray-500">
                  {cat.montoTotalCobrado > 0 && <span className="text-green-600 font-medium">Cobrado: {AR.format(cat.montoTotalCobrado)}</span>}
                  {cat.montoTotalPagado > 0 && <span className="text-blue-600 font-medium">Pagado: {AR.format(cat.montoTotalPagado)}</span>}
                  {cat.montoTotalCobrado > 0 && cat.montoTotalPagado > 0 && (
                    <span className="text-violet-600 font-medium">Margen: {AR.format(cat.montoTotalCobrado - cat.montoTotalPagado)}</span>
                  )}
                </div>
              </div>
              {abierta ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
            </button>
            {abierta && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-2">Inc.</th>
                      <th className="text-left px-4 py-2">Fecha</th>
                      <th className="text-left px-4 py-2">Técnico</th>
                      <th className="text-right px-4 py-2">Cal.</th>
                      <th className="text-right px-4 py-2">Materiales</th>
                      <th className="text-right px-4 py-2">M. Obra</th>
                      <th className="text-right px-4 py-2">Total presup.</th>
                      <th className="text-right px-4 py-2">Cobro cli.</th>
                      <th className="text-right px-4 py-2">Pago tec.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cat.trabajos.map((t: TrabajoCategoriaItem) => (
                      <tr key={t.id_incidente} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-700">#{t.id_incidente}</td>
                        <td className="px-4 py-2 text-gray-500">{fmtFecha(t.fecha_creacion)}</td>
                        <td className="px-4 py-2 text-gray-700">{t.nombre_tecnico} {t.apellido_tecnico}</td>
                        <td className="px-4 py-2 text-right">
                          {t.calificacion != null ? <span className="text-yellow-500 font-semibold">{t.calificacion} ⭐</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">{t.costo_materiales != null ? AR.format(t.costo_materiales) : '—'}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{t.costo_mano_obra != null ? AR.format(t.costo_mano_obra) : '—'}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-800">{t.costo_total != null ? AR.format(t.costo_total) : '—'}</td>
                        <td className="px-4 py-2 text-right text-green-700 font-medium">{t.monto_cobro_cliente != null ? AR.format(t.monto_cobro_cliente) : '—'}</td>
                        <td className="px-4 py-2 text-right text-blue-700 font-medium">{t.monto_pago_tecnico != null ? AR.format(t.monto_pago_tecnico) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ─── Cabecera de Grupo ────────────────────────────────────────────────────────

function GrupoHeader({
  icon: Icon, titulo, descripcion, color,
}: {
  icon: React.ElementType
  titulo: string
  descripcion: string
  color: string
}) {
  return (
    <div className={`flex items-center gap-3 pb-3 border-b-2 ${color}`}>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color.replace('border-b-2 ', '').replace('border-', 'bg-').replace('-400', '-100')}`}>
        <Icon className={`h-5 w-5 ${color.replace('border-b-2 ', '').replace('border-', 'text-').replace('-400', '-600')}`} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-800">{titulo}</h2>
        <p className="text-xs text-slate-500">{descripcion}</p>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function ReportesContent({ data }: { data: ReportesData }) {
  const {
    rendimientoTecnicos, embudoConversion, agingIncidentes,
    estadoFinanciero, presupuestosPorEstado, incidentesPorTipoInmueble,
    satisfaccionCliente, kpisAdministrativos, tiempoResolucionPorCategoria,
    reincidenciaPorPropiedad, rentabilidadTecnicos, cobroPromedioPorTecnico,
    trabajosPorCategoria,
  } = data

  // Filtros interactivos
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos')
  const [busquedaTecnico, setBusquedaTecnico] = useState('')

  // Datos derivados
  const agingFiltrado = filtroPrioridad === 'todos'
    ? agingIncidentes
    : agingIncidentes.filter(i => (i.nivel_prioridad ?? '').toLowerCase() === filtroPrioridad)

  const tecnicoMatch = (nombre: string, apellido: string) =>
    busquedaTecnico === '' ||
    `${nombre} ${apellido}`.toLowerCase().includes(busquedaTecnico.toLowerCase())

  const maxTec = Math.max(...rendimientoTecnicos.map(t => t.totalAsignaciones), 1)
  const maxDiasResolucion = Math.max(...tiempoResolucionPorCategoria.map(c => c.diasPromedio), 1)
  const maxRentabilidad = Math.max(...rentabilidadTecnicos.map(t => t.totalCobradoCliente), 1)
  const agingCriticos = agingIncidentes.filter(i => i.diasDesdeCreacion >= 7).length

  const PRIORIDADES = ['todos', 'urgente', 'alta', 'media', 'baja']

  return (
    <div className="space-y-10">

      {/* ══════════════════════════════════════════════════════════════
          GRUPO 1 — INCIDENTES
          Todo lo que habla del estado y flujo de los incidentes
      ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <GrupoHeader
          icon={Activity}
          titulo="Incidentes"
          descripcion="Estado, flujo y distribución de todos los incidentes del sistema"
          color="border-blue-400"
        />

        {/* Embudo de conversión — full width */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              Embudo de conversión
            </CardTitle>
            <CardDescription>Cuántos incidentes pasan por cada etapa — identifica cuellos de botella</CardDescription>
          </CardHeader>
          <CardContent>
            {embudoConversion.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-4">
                {embudoConversion.map((etapa, idx) => (
                  <div key={etapa.etapa} className="flex items-center gap-4">
                    <div className="w-44 text-sm text-gray-700 font-medium truncate">{etapa.etapa}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                        style={{
                          width: `${etapa.porcentaje}%`,
                          background: `hsl(${220 - idx * 35}, 70%, 55%)`,
                          minWidth: etapa.cantidad > 0 ? '2rem' : '0',
                        }}
                      >
                        {etapa.cantidad > 0 && (
                          <span className="text-white text-xs font-semibold">{etapa.cantidad}</span>
                        )}
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-semibold text-gray-600">{etapa.porcentaje}%</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aging + Tipo de Inmueble */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Sin resolver (Aging) — con filtro de prioridad */}
          <Card className={agingCriticos > 0 ? 'border-red-200' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Clock className="h-4 w-4 text-red-600" />
                    Sin resolver
                    {agingCriticos > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-[10px] font-semibold">
                        {agingCriticos} críticos
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Incidentes activos — ordenados por tiempo sin resolución</CardDescription>
                </div>
              </div>
              {/* Filtro de prioridad */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {PRIORIDADES.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFiltroPrioridad(p)}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors capitalize ${
                      filtroPrioridad === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p === 'todos' ? 'Todos' : p}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {agingFiltrado.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {filtroPrioridad === 'todos' ? 'Sin incidentes activos' : `Sin incidentes de prioridad "${filtroPrioridad}"`}
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {agingFiltrado.map(inc => (
                    <div
                      key={inc.id_incidente}
                      className={`flex items-start justify-between gap-3 p-2 rounded-lg ${inc.diasDesdeCreacion >= 7 ? 'bg-red-50' : 'bg-gray-50'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-xs font-bold text-gray-500">#{inc.id_incidente}</span>
                          {inc.nivel_prioridad && (
                            <Badge className={`text-[10px] py-0 ${PRIO_COLOR[inc.nivel_prioridad] || 'bg-gray-100 text-gray-600'}`}>
                              {inc.nivel_prioridad}
                            </Badge>
                          )}
                          {!inc.tieneTecnico && (
                            <Badge className="text-[10px] py-0 bg-orange-100 text-orange-700">Sin técnico</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">{inc.descripcion_problema}</p>
                        <p className="text-[10px] text-gray-400">{inc.clienteNombre}</p>
                      </div>
                      <div className={`text-sm font-bold whitespace-nowrap shrink-0 ${inc.diasDesdeCreacion >= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                        {inc.diasDesdeCreacion}d
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Por tipo de inmueble */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Por tipo de inmueble
              </CardTitle>
              <CardDescription>Dónde se concentran los incidentes y en qué estado están</CardDescription>
            </CardHeader>
            <CardContent>
              {incidentesPorTipoInmueble.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {incidentesPorTipoInmueble.map(tipo => (
                    <div key={tipo.tipoInmueble}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{tipo.tipoInmueble}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="text-green-600">{tipo.resueltos} res.</span>
                          <span className="text-blue-600">{tipo.enProceso} proc.</span>
                          <span className="text-yellow-600">{tipo.pendientes} pend.</span>
                        </div>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                        {tipo.resueltos > 0 && <div className="bg-green-400 transition-all" style={{ width: `${(tipo.resueltos / tipo.totalIncidentes) * 100}%` }} />}
                        {tipo.enProceso > 0 && <div className="bg-blue-400 transition-all" style={{ width: `${(tipo.enProceso / tipo.totalIncidentes) * 100}%` }} />}
                        {tipo.pendientes > 0 && <div className="bg-yellow-400 transition-all" style={{ width: `${(tipo.pendientes / tipo.totalIncidentes) * 100}%` }} />}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" /> Resueltos</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> En proceso</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> Pendientes</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tiempo de resolución + Reincidencia */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Tiempo de resolución por categoría */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Timer className="h-4 w-4 text-cyan-600" />
                Tiempo de resolución por categoría
              </CardTitle>
              <CardDescription>Qué tipos de problemas tardan más — útil para ajustar SLAs</CardDescription>
            </CardHeader>
            <CardContent>
              {tiempoResolucionPorCategoria.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos de resolución</p>
              ) : (
                <div className="space-y-4">
                  {tiempoResolucionPorCategoria.map(cat => (
                    <div key={cat.categoria}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[55%]">{cat.categoria}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="text-cyan-600 font-semibold">{cat.diasPromedio}d</span>
                          <span className="text-gray-400">({cat.diasMinimo}–{cat.diasMaximo}d)</span>
                          <span className="text-gray-400">{cat.cantidadResueltos} casos</span>
                        </div>
                      </div>
                      <Barra valor={cat.diasPromedio} maximo={maxDiasResolucion} color="bg-cyan-400" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reincidencia por propiedad */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <RefreshCcw className="h-4 w-4 text-rose-600" />
                Reincidencia por propiedad
              </CardTitle>
              <CardDescription>Propiedades con múltiples incidentes del mismo tipo — señal de problema estructural</CardDescription>
            </CardHeader>
            <CardContent>
              {reincidenciaPorPropiedad.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin propiedades con reincidencias</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {reincidenciaPorPropiedad.map(prop => (
                    <div key={prop.id_propiedad} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-gray-50 border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{prop.direccion}</p>
                        {prop.categoriaMasFrecuente && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Más frecuente: <span className="font-medium text-rose-600">{prop.categoriaMasFrecuente}</span> ({prop.cantCategoriaMasFrecuente}x)
                          </p>
                        )}
                      </div>
                      <Badge className="bg-rose-100 text-rose-700 text-xs whitespace-nowrap shrink-0">
                        {prop.totalIncidentes} incidentes
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          GRUPO 2 — TÉCNICOS
          Rendimiento, productividad y economía de cada técnico
      ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <GrupoHeader
          icon={Wrench}
          titulo="Técnicos"
          descripcion="Rendimiento, productividad y economía de cada técnico"
          color="border-amber-400"
        />

        {/* Buscador de técnico — filtra todas las subsecciones */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Filtrar por técnico..."
            value={busquedaTecnico}
            onChange={e => setBusquedaTecnico(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Rendimiento + Cobro promedio */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Rendimiento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Activity className="h-4 w-4 text-amber-600" />
                Rendimiento
              </CardTitle>
              <CardDescription>Velocidad de aceptación, trabajos completados y calificación</CardDescription>
            </CardHeader>
            <CardContent>
              {rendimientoTecnicos.filter(t => tecnicoMatch(t.nombre, t.apellido)).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
              ) : (
                <div className="space-y-4">
                  {rendimientoTecnicos.filter(t => tecnicoMatch(t.nombre, t.apellido)).slice(0, 8).map((tec, idx) => (
                    <div key={tec.id_tecnico}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-bold w-4 text-center shrink-0 ${idx === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>#{idx + 1}</span>
                          <span className="text-sm font-medium truncate">{tec.nombre} {tec.apellido}</span>
                          {tec.especialidad && <span className="text-[10px] text-gray-400 shrink-0">({tec.especialidad})</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                          {tec.calificacionPromedio !== null && (
                            <span className="text-yellow-500 font-medium">⭐ {tec.calificacionPromedio}</span>
                          )}
                          <span className="text-green-600 font-medium">{tec.completadas} compl.</span>
                          <span className="text-blue-600">{tec.tasaAceptacion}%</span>
                        </div>
                      </div>
                      <Barra valor={tec.totalAsignaciones} maximo={maxTec} color={idx === 0 ? 'bg-yellow-400' : 'bg-amber-400'} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cobro promedio */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Cobro promedio por trabajo
              </CardTitle>
              <CardDescription>Cuánto cobra en promedio cada técnico por trabajo completado</CardDescription>
            </CardHeader>
            <CardContent>
              {cobroPromedioPorTecnico.filter(t => tecnicoMatch(t.nombre, t.apellido)).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-gray-500 uppercase tracking-wide">
                        <th className="text-left pb-2 pr-3">Técnico</th>
                        <th className="text-right pb-2 pr-3">Trabajos</th>
                        <th className="text-right pb-2 pr-3">Total</th>
                        <th className="text-right pb-2">Promedio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cobroPromedioPorTecnico.filter(t => tecnicoMatch(t.nombre, t.apellido)).map((tec) => (
                        <tr key={tec.id_tecnico} className="hover:bg-gray-50">
                          <td className="py-2 pr-3 font-medium text-gray-800">{tec.nombre} {tec.apellido}</td>
                          <td className="py-2 pr-3 text-right text-gray-600">{tec.cantidadTrabajos}</td>
                          <td className="py-2 pr-3 text-right text-gray-700">{AR.format(tec.totalPagadoTecnico)}</td>
                          <td className="py-2 text-right font-bold text-emerald-700">{AR.format(tec.promedioCobroPorTrabajo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rentabilidad */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <TrendingUp className="h-4 w-4 text-violet-600" />
              Rentabilidad por técnico
            </CardTitle>
            <CardDescription>Margen generado por cada técnico — lo cobrado al cliente vs. lo pagado al técnico</CardDescription>
          </CardHeader>
          <CardContent>
            {rentabilidadTecnicos.filter(t => tecnicoMatch(t.nombre, t.apellido)).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
            ) : (
              <div className="space-y-3">
                {rentabilidadTecnicos.filter(t => tecnicoMatch(t.nombre, t.apellido)).map((tec, idx) => (
                  <div key={tec.id_tecnico}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold w-4 text-center ${idx === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>#{idx + 1}</span>
                        <span className="text-sm font-medium text-gray-800">{tec.nombre} {tec.apellido}</span>
                        <span className="text-xs text-gray-400">{tec.cantidadTrabajos} trabajos</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-600 font-medium">{AR.format(tec.totalCobradoCliente)}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-red-400">{AR.format(tec.totalPagadoTecnico)}</span>
                        <span className={`font-bold ${tec.margen >= 0 ? 'text-violet-600' : 'text-red-600'}`}>
                          = {AR.format(tec.margen)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                      <div className="bg-violet-400 transition-all" style={{ width: `${Math.round((tec.totalCobradoCliente / maxRentabilidad) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trabajos por categoría */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-700">Trabajos por categoría</h3>
            <span className="text-xs text-slate-400">— detalle por técnico, costos y calificaciones</span>
          </div>
          <TrabajosPorCategoriaSection data={trabajosPorCategoria} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          GRUPO 3 — CLIENTES & KPIs OPERATIVOS
      ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <GrupoHeader
          icon={Star}
          titulo="Clientes & KPIs Operativos"
          descripcion="Satisfacción del cliente e indicadores clave del sistema"
          color="border-violet-400"
        />

        <div className="grid gap-5 lg:grid-cols-2">

          {/* Satisfacción del cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Star className="h-4 w-4 text-yellow-500" />
                Satisfacción del cliente
              </CardTitle>
              <CardDescription>Calificaciones post-resolución y tasa de conformidad firmada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="text-center shrink-0">
                  <div className="text-4xl font-bold text-yellow-500">
                    {satisfaccionCliente.promedioGeneral > 0 ? satisfaccionCliente.promedioGeneral : '—'}
                  </div>
                  <div className="flex justify-center mt-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(satisfaccionCliente.promedioGeneral) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{satisfaccionCliente.cantidadCalificaciones} calif.</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {satisfaccionCliente.distribucion.map(d => (
                    <div key={d.estrellas} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-3">{d.estrellas}</span>
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: satisfaccionCliente.cantidadCalificaciones > 0 ? `${(d.cantidad / satisfaccionCliente.cantidadCalificaciones) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-4 text-right">{d.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xl font-bold">{satisfaccionCliente.tasaResolucionProblema}%</span>
                  </div>
                  <p className="text-xs text-gray-500">Resolvió el problema</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xl font-bold">{satisfaccionCliente.tasaConformidadFirmada}%</span>
                  </div>
                  <p className="text-xs text-gray-500">Conformidades firmadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs administrativos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BarChart2 className="h-4 w-4 text-indigo-600" />
                KPIs operativos
              </CardTitle>
              <CardDescription>Indicadores globales de operación y carga del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50">
                  <p className="text-xs text-gray-500 mb-1">Ratio de resolución</p>
                  <p className="text-2xl font-bold text-indigo-600">{kpisAdministrativos.racioResolucion}%</p>
                </div>
                <div className="p-3 rounded-lg border border-blue-100 bg-blue-50">
                  <p className="text-xs text-gray-500 mb-1">Incidentes activos</p>
                  <p className="text-2xl font-bold text-blue-600">{kpisAdministrativos.incidentesActivos}</p>
                </div>
                <div className="p-3 rounded-lg border border-orange-100 bg-orange-50">
                  <p className="text-xs text-gray-500 mb-1">Presup. a revisar</p>
                  <p className="text-2xl font-bold text-orange-600">{kpisAdministrativos.presupuestosPendientesRevision}</p>
                </div>
                <div className="p-3 rounded-lg border border-teal-100 bg-teal-50">
                  <p className="text-xs text-gray-500 mb-1">T. prom. asignación</p>
                  <p className="text-2xl font-bold text-teal-600">
                    {kpisAdministrativos.tiempoPromedioAsignacionDias > 0 ? `${kpisAdministrativos.tiempoPromedioAsignacionDias}d` : '—'}
                  </p>
                </div>
              </div>
              {kpisAdministrativos.incidentesPorMesUltimos3.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 mb-2">Últimos 3 meses</p>
                  <div className="flex gap-6">
                    {kpisAdministrativos.incidentesPorMesUltimos3.map(m => (
                      <div key={m.mes} className="flex flex-col items-center gap-1">
                        <div className="text-xl font-bold text-gray-700">{m.total}</div>
                        <div className="text-xs text-gray-500 capitalize">{m.mes}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          GRUPO 4 — FINANCIERO
          Estado de cobros, presupuestos y flujo de dinero
      ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <GrupoHeader
          icon={DollarSign}
          titulo="Financiero"
          descripcion="Cobros, presupuestos y posición financiera del sistema"
          color="border-green-400"
        />

        <div className="grid gap-5 lg:grid-cols-2">

          {/* Estado financiero */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <DollarSign className="h-4 w-4 text-green-600" />
                Estado financiero global
              </CardTitle>
              <CardDescription>Posición consolidada de cobros y saldos pendientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                  <p className="text-xs text-gray-500 mb-1">Presupuestado</p>
                  <p className="text-sm font-bold text-green-700">{AR.format(estadoFinanciero.totalPresupuestado)}</p>
                </div>
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                  <p className="text-xs text-gray-500 mb-1">Cobrado</p>
                  <p className="text-sm font-bold text-blue-700">{AR.format(estadoFinanciero.totalCobrado)}</p>
                </div>
                <div className="p-3 rounded-lg border border-orange-200 bg-orange-50">
                  <p className="text-xs text-gray-500 mb-1">Saldo pend.</p>
                  <p className="text-sm font-bold text-orange-700">{AR.format(estadoFinanciero.saldoPendiente)}</p>
                </div>
              </div>
              {estadoFinanciero.distribucionPagos.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs text-gray-500">Distribución de pagos</p>
                  {estadoFinanciero.distribucionPagos.map(d => (
                    <div key={d.tipo} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{TIPO_PAGO_LABEL[d.tipo] || d.tipo}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{d.cantidad} pagos</span>
                        <span className="font-bold text-gray-800">{AR.format(d.monto)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Presupuestos por estado */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="h-4 w-4 text-purple-600" />
                Presupuestos por estado
              </CardTitle>
              <CardDescription>Pipeline de presupuestos — los vencidos representan trabajo sin cobrar</CardDescription>
            </CardHeader>
            <CardContent>
              {presupuestosPorEstado.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin presupuestos registrados</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {presupuestosPorEstado.map(p => (
                    <div key={p.estado} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Badge className={`text-xs ${ESTADO_COLOR[p.estado] || 'bg-gray-100 text-gray-700'}`}>
                          {ESTADO_LABEL[p.estado] || p.estado}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{p.cantidad} presup.</p>
                      </div>
                      <p className="text-sm font-bold text-gray-700">{AR.format(p.montoTotal)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}
