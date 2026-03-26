'use client'

import { useState } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users, TrendingDown, Clock, DollarSign, FileText,
  Building2, Star, BarChart2, HelpCircle, CheckCircle,
  AlertTriangle, ArrowRight, Wrench, ShieldCheck,
} from 'lucide-react'
import type { ReportesData } from '@/features/reportes/reportes.service'

// ─── Helper: Tooltip de Valor Agregado ───────────────────────────────────────

function InfoTooltip({ texto }: { texto: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="ml-1.5 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Valor agregado de este informe"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {visible && (
        <div className="absolute z-50 bottom-5 left-0 w-60 rounded-lg bg-gray-900 text-white text-xs p-3 shadow-xl leading-relaxed">
          <p className="font-semibold mb-1 text-yellow-300">¿Por qué este informe?</p>
          <p>{texto}</p>
          <div className="absolute top-full left-3 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}

// ─── Helper: Barra horizontal ─────────────────────────────────────────────────

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

// ─── Helper: Formato moneda ───────────────────────────────────────────────────

const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

// ─── Etiquetas y colores ──────────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', enviado: 'Enviado', aprobado_admin: 'Apr. Admin',
  aprobado: 'Aprobado', rechazado: 'Rechazado', vencido: 'Vencido',
}
const ESTADO_COLOR: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  aprobado_admin: 'bg-indigo-100 text-indigo-700',
  aprobado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
  vencido: 'bg-yellow-100 text-yellow-700',
}
const PRIO_COLOR: Record<string, string> = {
  alta: 'bg-red-100 text-red-700', media: 'bg-yellow-100 text-yellow-700',
  baja: 'bg-green-100 text-green-700',
}
const TIPO_PAGO_LABEL: Record<string, string> = {
  adelanto: 'Adelanto', parcial: 'Parcial', total: 'Total', reembolso: 'Reembolso',
}

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface ReportesContentProps {
  data: ReportesData
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function ReportesContent({ data }: ReportesContentProps) {
  const {
    rendimientoTecnicos,
    embudoConversion,
    agingIncidentes,
    estadoFinanciero,
    presupuestosPorEstado,
    incidentesPorTipoInmueble,
    satisfaccionCliente,
    kpisAdministrativos,
  } = data

  const maxTec = Math.max(...rendimientoTecnicos.map(t => t.totalAsignaciones), 1)
  const maxTipoInm = Math.max(...incidentesPorTipoInmueble.map(t => t.totalIncidentes), 1)
  const agingCriticos = agingIncidentes.filter(i => i.diasDesdeCreacion >= 7)
  return (
    <div className="space-y-8">

      {/* ── KPIs Administrativos ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold">KPIs Administrativos</h3>
          <InfoTooltip texto="Permite demostrar si el sistema reduce carga operativa y medir el rendimiento global del proceso de atención." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-gray-500">Ratio de Resolución</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">{kpisAdministrativos.racioResolucion}%</div>
              <p className="text-xs text-muted-foreground">Incidentes resueltos / total</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-gray-500">Incidentes Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{kpisAdministrativos.incidentesActivos}</div>
              <p className="text-xs text-muted-foreground">Pendientes o en proceso</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-gray-500">Presup. a Revisar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{kpisAdministrativos.presupuestosPendientesRevision}</div>
              <p className="text-xs text-muted-foreground">Esperan aprobación admin</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500">
            <CardHeader className="pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-gray-500">T. Prom. Asignación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-teal-600">
                {kpisAdministrativos.tiempoPromedioAsignacionDias > 0 ? `${kpisAdministrativos.tiempoPromedioAsignacionDias}d` : '—'}
              </div>
              <p className="text-xs text-muted-foreground">Desde asignación hasta aceptación</p>
            </CardContent>
          </Card>
        </div>
        {/* Tendencia últimos 3 meses */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Incidentes creados — últimos 3 meses</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-6">
            {kpisAdministrativos.incidentesPorMesUltimos3.map(m => (
              <div key={m.mes} className="flex flex-col items-center gap-1">
                <div className="text-2xl font-bold text-gray-700">{m.total}</div>
                <div className="text-xs text-gray-500 capitalize">{m.mes}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ── Embudo de Conversión ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Embudo de Conversión</h3>
          <InfoTooltip texto="Identifica dónde se atascan los incidentes. Si muchos entran pero pocos se resuelven, señala el cuello de botella exacto para tomar acción." />
        </div>
        <Card>
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
      </section>

      {/* ── Aging + Financiero en grid ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Aging de Incidentes ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold">Incidentes sin Resolver</h3>
            <InfoTooltip texto="Evita que incidentes caigan en el olvido. Los críticos (más de 7 días) aparecen marcados para que el admin actúe antes de que el cliente reclame." />
          </div>
          <Card className={agingCriticos.length > 0 ? 'border-red-200' : ''}>
            {agingCriticos.length > 0 && (
              <div className="px-4 pt-3 pb-0 flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {agingCriticos.length} incidente{agingCriticos.length !== 1 ? 's' : ''} con más de 7 días sin resolución
              </div>
            )}
            <CardContent className="pt-4">
              {agingIncidentes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin incidentes activos</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {agingIncidentes.map(inc => (
                    <div key={inc.id_incidente} className={`flex items-start justify-between gap-3 p-2 rounded-lg ${inc.diasDesdeCreacion >= 7 ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
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
                      <div className={`text-sm font-bold whitespace-nowrap ${inc.diasDesdeCreacion >= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                        {inc.diasDesdeCreacion}d
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Estado Financiero ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Estado Financiero</h3>
            <InfoTooltip texto="Consolida presupuestos aprobados y pagos recibidos. Sin este informe no existe una vista de posición financiera total — crítico para gestión de cobros." />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500 mb-1">Presupuestado</p>
                  <p className="text-sm font-bold text-green-700">{AR.format(estadoFinanciero.totalPresupuestado)}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500 mb-1">Cobrado</p>
                  <p className="text-sm font-bold text-blue-700">{AR.format(estadoFinanciero.totalCobrado)}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500 mb-1">Saldo Pend.</p>
                  <p className="text-sm font-bold text-orange-700">{AR.format(estadoFinanciero.saldoPendiente)}</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Distribución de pagos</CardTitle>
              </CardHeader>
              <CardContent>
                {estadoFinanciero.distribucionPagos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">Sin pagos registrados</p>
                ) : (
                  <div className="space-y-2">
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
          </div>
        </section>
      </div>

      {/* ── Presupuestos por Estado ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Presupuestos por Estado</h3>
          <InfoTooltip texto="Los presupuestos 'vencidos' representan trabajo de inspección realizado sin cobro. Identificarlos permite recuperar ingresos o renegociar con el cliente." />
        </div>
        <Card>
          <CardContent className="pt-6">
            {presupuestosPorEstado.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin presupuestos registrados</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {presupuestosPorEstado.map(p => (
                  <div key={p.estado} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Badge className={`text-xs ${ESTADO_COLOR[p.estado] || 'bg-gray-100 text-gray-700'}`}>
                        {ESTADO_LABEL[p.estado] || p.estado}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">{p.cantidad} presup.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-700">{AR.format(p.montoTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Rendimiento Técnicos + Satisfacción en grid ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Rendimiento Técnicos ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Rendimiento de Técnicos</h3>
            <InfoTooltip texto="Permite asignaciones basadas en méritos y detectar técnicos sobrecargados o con bajo rendimiento, evitando decisiones basadas solo en intuición." />
          </div>
          <Card>
            <CardContent className="pt-6">
              {rendimientoTecnicos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos de técnicos</p>
              ) : (
                <div className="space-y-4">
                  {rendimientoTecnicos.slice(0, 6).map((tec, idx) => (
                    <div key={tec.id_tecnico}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold w-4 text-center ${idx === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>#{idx + 1}</span>
                          <span className="text-sm font-medium">{tec.nombre} {tec.apellido}</span>
                          {tec.especialidad && <span className="text-[10px] text-gray-400">({tec.especialidad})</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {tec.calificacionPromedio !== null && (
                            <span className="flex items-center gap-0.5 text-yellow-500 font-medium">
                              <Star className="h-3 w-3 fill-yellow-500" /> {tec.calificacionPromedio}
                            </span>
                          )}
                          <span className="text-green-600 font-medium">{tec.completadas} compl.</span>
                          <span className="text-blue-600">{tec.tasaAceptacion}% acep.</span>
                        </div>
                      </div>
                      <Barra valor={tec.totalAsignaciones} maximo={maxTec} color={idx === 0 ? 'bg-yellow-400' : 'bg-orange-400'} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Satisfacción del Cliente ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Satisfacción del Cliente</h3>
            <InfoTooltip texto="Conecta eficiencia operativa con satisfacción. Si incidentes rápidos reciben mejores notas, provee evidencia cuantitativa del valor del sistema." />
          </div>
          <Card>
            <CardContent className="pt-6 space-y-5">
              {/* Promedio central */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-500">
                    {satisfaccionCliente.promedioGeneral > 0 ? satisfaccionCliente.promedioGeneral : '—'}
                  </div>
                  <div className="flex justify-center mt-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(satisfaccionCliente.promedioGeneral) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{satisfaccionCliente.cantidadCalificaciones} calificaciones</p>
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
              {/* KPIs de satisfacción */}
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
        </section>
      </div>

      {/* ── Incidentes por Tipo de Inmueble ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold">Incidentes por Tipo de Inmueble</h3>
          <InfoTooltip texto="Permite anticipar recursos: si un tipo de inmueble genera más incidentes, se pueden tener técnicos especializados disponibles de forma preventiva." />
        </div>
        <Card>
          <CardContent className="pt-6">
            {incidentesPorTipoInmueble.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {incidentesPorTipoInmueble.map(tipo => (
                  <div key={tipo.tipoInmueble}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{tipo.tipoInmueble}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="text-green-600">{tipo.resueltos} res.</span>
                        <span className="text-blue-600">{tipo.enProceso} proc.</span>
                        <span className="text-yellow-600">{tipo.pendientes} pend.</span>
                      </div>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                      {tipo.resueltos > 0 && (
                        <div
                          className="bg-green-400 transition-all"
                          style={{ width: `${(tipo.resueltos / tipo.totalIncidentes) * 100}%` }}
                          title={`${tipo.resueltos} resueltos`}
                        />
                      )}
                      {tipo.enProceso > 0 && (
                        <div
                          className="bg-blue-400 transition-all"
                          style={{ width: `${(tipo.enProceso / tipo.totalIncidentes) * 100}%` }}
                          title={`${tipo.enProceso} en proceso`}
                        />
                      )}
                      {tipo.pendientes > 0 && (
                        <div
                          className="bg-yellow-400 transition-all"
                          style={{ width: `${(tipo.pendientes / tipo.totalIncidentes) * 100}%` }}
                          title={`${tipo.pendientes} pendientes`}
                        />
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" /> Resueltos</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> En proceso</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> Pendientes</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

    </div>
  )
}
