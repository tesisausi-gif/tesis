'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Activity, Wrench, Star, DollarSign,
  TrendingDown, Building2, RefreshCcw, Timer,
  CheckCircle, ShieldCheck, Search,
  BarChart2, FileText, TrendingUp, Layers,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import type { ReportesData, TrabajosPorCategoria, TrabajoCategoriaItem } from '@/features/reportes/reportes.service'

// ─── Tooltip sobre el título ──────────────────────────────────────────────────

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

const GROUP_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  blue:   { border: 'border-blue-400',   bg: 'bg-blue-100',   text: 'text-blue-600'   },
  amber:  { border: 'border-amber-400',  bg: 'bg-amber-100',  text: 'text-amber-600'  },
  violet: { border: 'border-violet-400', bg: 'bg-violet-100', text: 'text-violet-600' },
  green:  { border: 'border-green-400',  bg: 'bg-green-100',  text: 'text-green-600'  },
}

function GrupoHeader({
  icon: Icon, titulo, descripcion, color, tooltip,
}: {
  icon: React.ElementType
  titulo: string
  descripcion: string
  color: keyof typeof GROUP_STYLES
  tooltip: string
}) {
  const s = GROUP_STYLES[color]
  return (
    <div className={`flex items-center gap-3 pb-3 border-b-2 ${s.border}`}>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
        <Icon className={`h-5 w-5 ${s.text}`} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-800">
          <TitleTooltip texto={tooltip}>{titulo}</TitleTooltip>
        </h2>
        <p className="text-xs text-slate-500">{descripcion}</p>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function ReportesContent({ data }: { data: ReportesData }) {
  const {
    rendimientoTecnicos, embudoConversion,
    estadoFinanciero, presupuestosPorEstado, incidentesPorTipoInmueble,
    satisfaccionCliente, kpisAdministrativos, tiempoResolucionPorCategoria,
    reincidenciaPorPropiedad, rentabilidadTecnicos, cobroPromedioPorTecnico,
    trabajosPorCategoria,
  } = data

  const [busquedaTecnico, setBusquedaTecnico] = useState('')

  const tecnicoMatch = (nombre: string, apellido: string) =>
    busquedaTecnico === '' ||
    `${nombre} ${apellido}`.toLowerCase().includes(busquedaTecnico.toLowerCase())

  const maxTec = Math.max(...rendimientoTecnicos.map(t => t.totalAsignaciones), 1)
  const maxDiasResolucion = Math.max(...tiempoResolucionPorCategoria.map(c => c.diasPromedio), 1)
  const maxRentabilidad = Math.max(...rentabilidadTecnicos.map(t => t.totalCobradoCliente), 1)

  return (
    <div className="space-y-10">

      {/* ══════════════════════════════════════════════════════════════
          GRUPO 1 — INCIDENTES
      ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <GrupoHeader
          icon={Activity}
          titulo="Incidentes"
          descripcion="Estado y flujo de todos los incidentes del sistema"
          color="blue"
          tooltip="Todo lo que necesitás saber sobre el estado de los incidentes: por dónde avanzan, en qué tipo de propiedades ocurren, qué tipos tardan más y cuáles se repiten."
        />

        {/* Embudo de conversión */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <TrendingDown className="h-4 w-4 text-blue-600 shrink-0" />
              <TitleTooltip texto="¿Dónde se traban los incidentes? Muestra cuántos pasan por cada etapa del proceso. Si muchos entran pero pocos se cierran, hay un cuello de botella aquí.">
                Embudo de conversión
              </TitleTooltip>
            </CardTitle>
            <CardDescription>Cuántos incidentes pasan por cada etapa del proceso</CardDescription>
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

        {/* Tipo de inmueble + Tiempo de resolución */}
        <div className="grid gap-5 lg:grid-cols-2">

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <TitleTooltip texto="¿En qué tipo de propiedades ocurren más problemas? Muestra si las casas, departamentos u otros generan más incidentes y en qué estado están cada uno.">
                  Por tipo de inmueble
                </TitleTooltip>
              </CardTitle>
              <CardDescription>Dónde se concentran los incidentes y cómo van resolviéndose</CardDescription>
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
                        {tipo.resueltos > 0 && <div className="bg-green-400" style={{ width: `${(tipo.resueltos / tipo.totalIncidentes) * 100}%` }} />}
                        {tipo.enProceso > 0 && <div className="bg-blue-400" style={{ width: `${(tipo.enProceso / tipo.totalIncidentes) * 100}%` }} />}
                        {tipo.pendientes > 0 && <div className="bg-yellow-400" style={{ width: `${(tipo.pendientes / tipo.totalIncidentes) * 100}%` }} />}
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Timer className="h-4 w-4 text-cyan-600 shrink-0" />
                <TitleTooltip texto="¿Qué tipos de problemas tardan más en resolverse? Muestra el promedio de días por categoría. Los más lentos son los que necesitan más recursos o técnicos especializados.">
                  Tiempo de resolución por categoría
                </TitleTooltip>
              </CardTitle>
              <CardDescription>Promedio de días hasta el cierre, por tipo de problema</CardDescription>
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
        </div>

        {/* Reincidencia */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <RefreshCcw className="h-4 w-4 text-rose-600 shrink-0" />
              <TitleTooltip texto="¿Hay propiedades con el mismo problema una y otra vez? Si una propiedad aparece acá, significa que el problema no se resolvió bien la primera vez y hay que encarar una solución definitiva.">
                Reincidencia por propiedad
              </TitleTooltip>
            </CardTitle>
            <CardDescription>Propiedades con incidentes repetidos del mismo tipo</CardDescription>
          </CardHeader>
          <CardContent>
            {reincidenciaPorPropiedad.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin propiedades con reincidencias</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* ══════════════════════════════════════════════════════════════
          GRUPO 2 — TÉCNICOS
      ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <GrupoHeader
          icon={Wrench}
          titulo="Técnicos"
          descripcion="Rendimiento, productividad y economía de cada técnico"
          color="amber"
          tooltip="Todo sobre los técnicos: quién trabaja más rápido, quién genera más margen y cuánto cobra en promedio. Te ayuda a tomar mejores decisiones al asignar trabajos."
        />

        {/* Buscador — filtra todas las subsecciones */}
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Activity className="h-4 w-4 text-amber-600 shrink-0" />
                <TitleTooltip texto="¿Quién trabaja mejor? Ordena a los técnicos por incidentes completados, qué tan rápido aceptan los trabajos y la calificación que les dan los clientes.">
                  Rendimiento
                </TitleTooltip>
              </CardTitle>
              <CardDescription>Trabajos completados, tasa de aceptación y calificación del cliente</CardDescription>
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
                          {tec.calificacionPromedio !== null && <span className="text-yellow-500 font-medium">⭐ {tec.calificacionPromedio}</span>}
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                <TitleTooltip texto="¿Cuánto cobra en promedio cada técnico por trabajo? Permite comparar costos entre técnicos y detectar si los mejor calificados también tienen honorarios más altos.">
                  Cobro promedio por trabajo
                </TitleTooltip>
              </CardTitle>
              <CardDescription>Total facturado y promedio por trabajo completado</CardDescription>
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
              <TrendingUp className="h-4 w-4 text-violet-600 shrink-0" />
              <TitleTooltip texto="¿Cuánto margen deja cada técnico? Compara lo que se le cobró al cliente con lo que se le pagó al técnico. Un margen alto significa que ese técnico es más rentable para el negocio.">
                Rentabilidad por técnico
              </TitleTooltip>
            </CardTitle>
            <CardDescription>Cobrado al cliente vs. pagado al técnico — margen real por persona</CardDescription>
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
            <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-700">
              <TitleTooltip texto="El detalle más completo: para cada tipo de problema, muestra qué técnicos trabajaron, cuánto costó cada trabajo y qué calificación recibieron. Hacé clic en una categoría para ver el desglose.">
                Trabajos por categoría
              </TitleTooltip>
            </h3>
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
          color="violet"
          tooltip="Cómo perciben los clientes el servicio y qué tan bien está funcionando el sistema en general. Son los números que resumen si el negocio está yendo bien."
        />

        <div className="grid gap-5 lg:grid-cols-2">

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Star className="h-4 w-4 text-yellow-500 shrink-0" />
                <TitleTooltip texto="¿Qué tan contentos quedaron los clientes? Muestra las calificaciones que dejaron tras cada resolución y si el problema quedó realmente solucionado.">
                  Satisfacción del cliente
                </TitleTooltip>
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BarChart2 className="h-4 w-4 text-indigo-600 shrink-0" />
                <TitleTooltip texto="El pulso del sistema: cuántos incidentes están abiertos ahora, cuántos presupuestos están esperando tu aprobación y cuánto tardan en asignarse los técnicos.">
                  KPIs operativos
                </TitleTooltip>
              </CardTitle>
              <CardDescription>Indicadores clave de la operación diaria del sistema</CardDescription>
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
      ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        <GrupoHeader
          icon={DollarSign}
          titulo="Financiero"
          descripcion="Cobros, presupuestos y posición financiera del sistema"
          color="green"
          tooltip="Todo el dinero en juego: cuánto se presupuestó, cuánto se cobró, cuánto está pendiente y en qué etapa está cada presupuesto. Esencial para saber si el negocio está siendo rentable."
        />

        <div className="grid gap-5 lg:grid-cols-2">

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <DollarSign className="h-4 w-4 text-green-600 shrink-0" />
                <TitleTooltip texto="¿Cuánto dinero hay en juego en total? Muestra lo que se presupuestó, lo que se cobró efectivamente y cuánto todavía está pendiente de cobrar. Es la posición financiera real del sistema.">
                  Estado financiero global
                </TitleTooltip>
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                <TitleTooltip texto="¿En qué etapa está cada presupuesto? Los 'vencidos' son trabajos que ya se hicieron pero nunca se cobraron — son dinero que se puede recuperar si se actúa ahora.">
                  Presupuestos por estado
                </TitleTooltip>
              </CardTitle>
              <CardDescription>Pipeline de presupuestos — los vencidos requieren acción inmediata</CardDescription>
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
