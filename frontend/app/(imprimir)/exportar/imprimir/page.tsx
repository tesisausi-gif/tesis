import { PrintButton } from './print-button'
import {
  getR1IncidentesPorTipoEstado,
  getR2TiemposResolucion,
  getR3TecnicosPorVolumen,
  getR4PropiedadesMasIncidentes,
  getR5RentabilidadPorRefaccion,
  getR6DesempenoTecnicos,
  getR7Satisfaccion,
  getR8CostosMantenimiento,
  getR10RentabilidadInmueble,
  getR11ComparativoDesempenio,
  getR12IndicadoresGlobales,
  getIncidentesParaExportar,
  getPagosParaExportar,
  getTecnicosParaExportar,
} from '@/features/exportar/exportar.service'

type SP = { [key: string]: string | string[] | undefined }

function p(params: SP, key: string): string {
  const v = params[key]
  return Array.isArray(v) ? (v[0] || '') : (v || '')
}

function pNum(params: SP, key: string): number | undefined {
  const v = p(params, key)
  return v ? parseInt(v) : undefined
}

const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const fmt$ = (n: number) => AR.format(n)
const fmtPct = (n: number) => `${n.toFixed(1)}%`
const fmtN = (n: number) => n.toFixed(1)

interface PageProps {
  searchParams: Promise<SP>
}

export default async function ImprimirPage({ searchParams }: PageProps) {
  const params = await searchParams

  const tipoStr = p(params, 'tipo')
  const tipo = parseInt(tipoStr) || 0
  const fechaDesde = p(params, 'fechaDesde') || undefined
  const fechaHasta = p(params, 'fechaHasta') || undefined
  const categoria = p(params, 'categoria') || undefined
  const estadoActual = p(params, 'estadoActual') || undefined
  const idTecnico = pNum(params, 'idTecnico')
  const idInmueble = pNum(params, 'idInmueble')
  const topN = pNum(params, 'topN')
  const ordenarPor = p(params, 'ordenarPor') || undefined
  const periodo = p(params, 'periodo') || undefined
  const topTecnicos = pNum(params, 'topTecnicos')
  const topPropiedades = pNum(params, 'topPropiedades')
  const calificacionMinima = pNum(params, 'calificacionMinima')

  const fechaGenerado = new Date().toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  let titulo = 'Reporte ISBA'
  let cabeceras: string[] = []
  let filas: Record<string, unknown>[] = []
  let kpis: { label: string; valor: string }[] = []
  let errorMsg: string | null = null

  try {
    if (tipo === 1) {
      titulo = 'Incidentes por Tipo y Estado'
      const r = await getR1IncidentesPorTipoEstado({ fechaDesde, fechaHasta, categoria, estadoActual })
      kpis = [
        { label: 'Total', valor: String(r.total) },
        { label: '% Finalizados', valor: fmtPct(r.porcentajeCerrados) },
        { label: '% En proceso', valor: fmtPct(r.porcentajeEnCurso) },
        { label: 'Promedio diario', valor: fmtN(r.promedioDiario) },
      ]
      cabeceras = ['Categoría', 'Cantidad', '%']
      filas = r.porCategoria.map(c => ({ 'Categoría': c.categoria, 'Cantidad': c.cantidad, '%': fmtPct(c.porcentaje) }))

    } else if (tipo === 2) {
      titulo = 'Tiempos Promedio de Resolución'
      const r = await getR2TiemposResolucion({ fechaDesde, fechaHasta, categoria, ordenarPor: ordenarPor as any })
      kpis = [
        { label: 'Promedio días', valor: fmtN(r.promedioDias) },
        { label: 'Mínimo', valor: String(r.minDias) + ' días' },
        { label: 'Máximo', valor: String(r.maxDias) + ' días' },
        { label: 'Total incidentes', valor: String(r.totalIncidentes) },
      ]
      cabeceras = ['ID', 'Categoría', 'Descripción', 'Inmueble', 'Días']
      filas = r.incidentesMasLentos.map(i => ({
        'ID': `#${i.id_incidente}`, 'Categoría': i.categoria, 'Descripción': i.descripcion, 'Inmueble': i.inmueble, 'Días': i.dias,
      }))

    } else if (tipo === 3) {
      titulo = 'Técnicos por Volumen de Trabajo'
      const r = await getR3TecnicosPorVolumen({ fechaDesde, fechaHasta, idTecnico })
      kpis = [
        { label: 'Total técnicos', valor: String(r.totalTecnicos) },
        { label: 'Prom. asignados', valor: fmtN(r.promedioAsignados) },
        { label: 'Prom. cerrados', valor: fmtN(r.promedioCerrados) },
      ]
      cabeceras = ['Técnico', 'Especialidad', 'Asignados', 'Cerrados', 'En curso', 'Tasa %', 'Días prom.']
      filas = r.tecnicos.map(t => ({
        'Técnico': `${t.nombre} ${t.apellido}`, 'Especialidad': t.especialidad,
        'Asignados': t.asignados, 'Cerrados': t.cerrados, 'En curso': t.enCurso,
        'Tasa %': fmtPct(t.tasaCierre), 'Días prom.': fmtN(t.promedioDias),
      }))

    } else if (tipo === 4) {
      titulo = 'Propiedades con Más Incidentes'
      const r = await getR4PropiedadesMasIncidentes({ fechaDesde, fechaHasta, idInmueble, topN })
      kpis = [
        { label: 'Propiedades', valor: String(r.totalPropiedades) },
        { label: 'Total incidentes', valor: String(r.totalIncidentes) },
        { label: 'Costo total', valor: fmt$(r.costoTotal) },
      ]
      cabeceras = ['Inmueble', 'Incidentes', 'Costo total', 'Tipo frecuente', 'Abiertos']
      filas = r.inmuebles.map(i => ({
        'Inmueble': i.nombre, 'Incidentes': i.totalIncidentes, 'Costo total': fmt$(i.costoTotal),
        'Tipo frecuente': i.tipoFrecuente, 'Abiertos': i.incidentesAbiertos,
      }))

    } else if (tipo === 5) {
      titulo = 'Rentabilidad por Tipo de Refacción'
      const r = await getR5RentabilidadPorRefaccion({ fechaDesde, fechaHasta, categoria })
      kpis = [
        { label: 'Total cobrado', valor: fmt$(r.ingresoTotal) },
        { label: 'Total pagado a técnicos', valor: fmt$(r.costoTotal) },
        { label: 'Comisión ISBA', valor: fmt$(r.comisionTotal) },
        { label: 'Margen global', valor: fmtPct(r.margenGlobal) },
      ]
      cabeceras = ['Tipo', 'Cobrado a cliente', 'Pagado al técnico', 'Comisión ISBA', 'Margen %']
      filas = r.porTipo.map(t => ({
        'Tipo': t.tipo,
        'Cobrado a cliente': fmt$(t.ingresoBruto),
        'Pagado al técnico': fmt$(t.costoPagadoTecnico),
        'Comisión ISBA': fmt$(t.comision),
        'Margen %': fmtPct(t.margen),
      }))

    } else if (tipo === 6) {
      titulo = 'Desempeño de Técnicos'
      const r = await getR6DesempenoTecnicos({ fechaDesde, fechaHasta, idTecnico })
      kpis = [
        { label: 'Total técnicos', valor: String(r.totalTecnicos) },
        { label: 'Productividad prom.', valor: fmtPct(r.promedioProductividad) },
        { label: 'Satisfacción prom.', valor: r.promedioSatisfaccion > 0 ? `${fmtN(r.promedioSatisfaccion)} ★` : 'N/A' },
      ]
      cabeceras = ['#', 'Técnico', 'Especialidad', 'Asignados', 'Cerrados', 'Rechazadas', 'Productividad %', 'Días resp.', 'Satisfacción ★']
      filas = r.tecnicos.map(t => ({
        '#': t.rankingPos, 'Técnico': `${t.nombre} ${t.apellido}`,
        'Especialidad': t.especialidad || '—',
        'Asignados': t.asignados, 'Cerrados': t.cerrados,
        'Rechazadas': t.rechazadas,
        'Productividad %': fmtPct(t.productividad),
        'Días resp.': t.promedioDiasRespuesta > 0 ? fmtN(t.promedioDiasRespuesta) : '—',
        'Satisfacción ★': t.satisfaccion != null ? `${fmtN(t.satisfaccion)} ★` : 'N/A',
      }))

    } else if (tipo === 7) {
      titulo = 'Satisfacción de ISBA'
      const r = await getR7Satisfaccion({ fechaDesde, fechaHasta, idTecnico, calificacionMinima })
      kpis = [
        { label: 'Promedio global', valor: `${fmtN(r.promedioGlobal)} ★` },
        { label: 'Total evaluaciones', valor: String(r.totalEvaluaciones) },
      ]
      cabeceras = ['Técnico', 'Promedio ★', 'Evaluaciones', '5★', '4★', '3★', '2★', '1★']
      filas = r.tecnicos.map(t => ({
        'Técnico': `${t.nombre} ${t.apellido}`, 'Promedio ★': fmtN(t.promedioPuntuacion),
        'Evaluaciones': t.totalEvaluaciones,
        '5★': t.distribucion['5'] || 0, '4★': t.distribucion['4'] || 0,
        '3★': t.distribucion['3'] || 0, '2★': t.distribucion['2'] || 0, '1★': t.distribucion['1'] || 0,
      }))

    } else if (tipo === 8) {
      titulo = 'Costos Totales de Mantenimiento'
      const r = await getR8CostosMantenimiento({ fechaDesde, fechaHasta, categoria })
      kpis = [
        { label: 'Costo total', valor: fmt$(r.costoTotal) },
        { label: 'Total incidentes', valor: String(r.totalIncidentes) },
        { label: 'Costo promedio', valor: fmt$(r.costoPromedio) },
      ]
      cabeceras = ['Categoría', 'Costo total', 'Materiales', 'Mano de obra', 'Incidentes', 'Promedio']
      filas = r.porCategoria.map(c => ({
        'Categoría': c.categoria, 'Costo total': fmt$(c.costoTotal), 'Materiales': fmt$(c.materiales),
        'Mano de obra': fmt$(c.manoObra), 'Incidentes': c.totalIncidentes, 'Promedio': fmt$(c.promedioCosto),
      }))

    } else if (tipo === 10) {
      titulo = 'Rentabilidad por Inmueble'
      const r = await getR10RentabilidadInmueble({ fechaDesde, fechaHasta, idInmueble, topN })
      kpis = [
        { label: 'Ingresos totales', valor: fmt$(r.ingresosTotal) },
        { label: 'Costos totales', valor: fmt$(r.costosTotal) },
        { label: 'Rentabilidad neta', valor: fmt$(r.rentabilidadNeta) },
        { label: 'Margen global', valor: fmtPct(r.margenGlobal) },
      ]
      cabeceras = ['Inmueble', 'Ingresos', 'Costos', 'Rentabilidad', 'Margen %', 'Incidentes']
      filas = r.inmuebles.map(i => ({
        'Inmueble': i.nombre, 'Ingresos': fmt$(i.ingresos), 'Costos': fmt$(i.costos),
        'Rentabilidad': fmt$(i.rentabilidadNeta), 'Margen %': fmtPct(i.margen), 'Incidentes': i.totalIncidentes,
      }))

    } else if (tipo === 11) {
      titulo = 'Comparativo de Desempeño'
      const r = await getR11ComparativoDesempenio({ fechaDesde, fechaHasta, periodo: periodo as any })
      kpis = [
        { label: 'Período 1', valor: r.periodo1Label },
        { label: 'Período 2', valor: r.periodo2Label },
      ]
      cabeceras = ['Indicador', r.periodo1Label, r.periodo2Label, 'Cambio %', 'Tendencia']
      filas = r.indicadores.map(i => ({
        'Indicador': i.indicador,
        [r.periodo1Label]: fmtN(i.periodo1),
        [r.periodo2Label]: fmtN(i.periodo2),
        'Cambio %': `${i.cambioPorcentaje >= 0 ? '+' : ''}${fmtN(i.cambioPorcentaje)}%`,
        'Tendencia': i.tendencia === 'sube' ? '↑' : i.tendencia === 'baja' ? '↓' : '→',
      }))

    } else if (tipo === 12) {
      titulo = 'Indicadores Globales de Gestión'
      const r = await getR12IndicadoresGlobales({ fechaDesde, fechaHasta, topTecnicos, topPropiedades })
      kpis = [
        { label: 'Total incidentes', valor: String(r.totalIncidentes) },
        { label: 'Abiertos', valor: String(r.incidentesAbiertos) },
        { label: 'Finalizados', valor: String(r.incidentesCerrados) },
        { label: 'Días prom. resolución', valor: fmtN(r.promedioResolucionDias) },
        { label: 'Ingresos', valor: fmt$(r.totalIngresos) },
        { label: 'Costos', valor: fmt$(r.totalCostos) },
        { label: 'Satisfacción', valor: r.satisfaccionPromedio > 0 ? `${fmtN(r.satisfaccionPromedio)} ★` : 'N/A' },
      ]
      cabeceras = ['Top Técnicos', 'Asignados', 'Cerrados', 'Satisfacción ★']
      filas = r.topTecnicos.map(t => ({
        'Top Técnicos': `${t.nombre} ${t.apellido}`,
        'Asignados': t.asignados, 'Cerrados': t.cerrados,
        'Satisfacción ★': t.satisfaccion > 0 ? `${fmtN(t.satisfaccion)} ★` : 'N/A',
      }))

    } else if (tipoStr === 'incidentes') {
      titulo = 'Reporte de Incidentes'
      cabeceras = ['ID', 'Fecha', 'Descripción', 'Categoría', 'Prioridad', 'Estado', 'Cliente', 'Inmueble']
      const datos = await getIncidentesParaExportar({ fechaDesde, fechaHasta })
      filas = datos.map(d => ({
        'ID': `#${d.id_incidente}`,
        'Fecha': d.fecha_registro ? new Date(d.fecha_registro).toLocaleDateString('es-AR') : '',
        'Descripción': d.descripcion_problema, 'Categoría': d.categoria,
        'Prioridad': d.nivel_prioridad, 'Estado': d.estado_actual,
        'Cliente': `${d.cliente_nombre} ${d.cliente_apellido}`.trim(),
        'Inmueble': `${d.inmueble_calle} ${d.inmueble_localidad}`.trim(),
      }))

    } else if (tipoStr === 'pagos') {
      titulo = 'Reporte de Pagos'
      cabeceras = ['ID', 'Fecha', 'Monto', 'Tipo', 'Método', 'Comprobante', 'Incidente']
      const datos = await getPagosParaExportar({ fechaDesde, fechaHasta })
      filas = datos.map(d => ({
        'ID': `#${d.id_pago}`,
        'Fecha': d.fecha_pago ? new Date(d.fecha_pago).toLocaleDateString('es-AR') : '',
        'Monto': fmt$(d.monto_pagado), 'Tipo': d.tipo_pago, 'Método': d.metodo_pago,
        'Comprobante': d.numero_comprobante, 'Incidente': `#${d.incidente_id}`,
      }))

    } else if (tipoStr === 'tecnicos') {
      titulo = 'Reporte de Técnicos'
      cabeceras = ['Nombre', 'Apellido', 'Especialidad', 'Asignaciones', 'Completadas']
      const datos = await getTecnicosParaExportar()
      filas = datos.map(d => ({
        'Nombre': d.nombre, 'Apellido': d.apellido, 'Especialidad': d.especialidad,
        'Asignaciones': d.total_asignaciones, 'Completadas': d.asignaciones_completadas,
      }))
    } else {
      errorMsg = 'Tipo de reporte no reconocido.'
    }
  } catch (err) {
    console.error('Error generando reporte:', err)
    errorMsg = 'Error al generar el reporte. Intente nuevamente.'
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#111', padding: '20px', background: '#fff', minHeight: '100vh' }}>
      <style>{`
        @media print {
          #btn-print { display: none !important; }
          [data-sonner-toaster] { display: none !important; }
        }
        h1 { font-size: 18px; margin: 0 0 4px 0; color: #1e3a5f; }
        .meta { color: #666; font-size: 10px; margin-bottom: 16px; }
        .kpis { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
        .kpi { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 14px; min-width: 110px; }
        .kpi-label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
        .kpi-valor { font-size: 15px; font-weight: 700; color: #1d4ed8; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        th { background: #1d4ed8; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; white-space: nowrap; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
        tr:nth-child(even) td { background: #f9fafb; }
        .footer { margin-top: 18px; color: #aaa; font-size: 9px; text-align: right; border-top: 1px solid #e5e7eb; padding-top: 6px; }
        .error-msg { color: #dc2626; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px; margin: 20px 0; }
      `}</style>

      <h1>{titulo}</h1>
      <p className="meta">
        Sistema ISBA · Generado el {fechaGenerado}
        {(fechaDesde || fechaHasta) && ` · Período: ${fechaDesde || '…'} → ${fechaHasta || '…'}`}
        {filas.length > 0 && ` · ${filas.length} registros`}
      </p>

      <div id="btn-print">
        <PrintButton />
      </div>

      {errorMsg && <div className="error-msg">{errorMsg}</div>}

      {kpis.length > 0 && (
        <div className="kpis">
          {kpis.map(k => (
            <div key={k.label} className="kpi">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-valor">{k.valor}</div>
            </div>
          ))}
        </div>
      )}

      {!errorMsg && filas.length === 0 && (
        <p style={{ color: '#666', marginTop: 20 }}>No hay datos para el período seleccionado.</p>
      )}

      {filas.length > 0 && (
        <table>
          <thead>
            <tr>{cabeceras.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={i}>
                {cabeceras.map(c => <td key={c}>{String(fila[c] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="footer">ISBA · Sistema de Gestión de Incidentes · {fechaGenerado}</p>
    </div>
  )
}
