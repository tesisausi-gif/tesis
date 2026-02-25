import { getIncidentesParaExportar, getPagosParaExportar, getTecnicosParaExportar } from '@/features/exportar/exportar.service'

interface PrintPageProps {
  searchParams: Promise<{ tipo?: string }>
}

export default async function ImprimirPage({ searchParams }: PrintPageProps) {
  const { tipo } = await searchParams

  const fecha = new Date().toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  let titulo = 'Reporte'
  let cabeceras: string[] = []
  let filas: Record<string, unknown>[] = []

  if (tipo === 'incidentes') {
    titulo = 'Reporte de Incidentes'
    cabeceras = ['ID', 'Fecha', 'Descripción', 'Categoría', 'Prioridad', 'Estado', 'Cliente', 'Inmueble']
    const datos = await getIncidentesParaExportar()
    filas = datos.map(d => ({
      'ID': d.id_incidente,
      'Fecha': d.fecha_registro ? new Date(d.fecha_registro).toLocaleDateString('es-AR') : '',
      'Descripción': d.descripcion_problema,
      'Categoría': d.categoria,
      'Prioridad': d.nivel_prioridad,
      'Estado': d.estado_actual,
      'Cliente': `${d.cliente_nombre} ${d.cliente_apellido}`.trim(),
      'Inmueble': `${d.inmueble_calle} ${d.inmueble_localidad}`.trim(),
    }))
  } else if (tipo === 'pagos') {
    titulo = 'Reporte de Pagos'
    cabeceras = ['ID', 'Fecha', 'Monto', 'Tipo', 'Método', 'Comprobante', 'Cliente', 'Incidente']
    const datos = await getPagosParaExportar()
    filas = datos.map(d => ({
      'ID': d.id_pago,
      'Fecha': d.fecha_pago ? new Date(d.fecha_pago).toLocaleDateString('es-AR') : '',
      'Monto': new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(d.monto_pagado),
      'Tipo': d.tipo_pago,
      'Método': d.metodo_pago,
      'Comprobante': d.numero_comprobante,
      'Cliente': `${d.cliente_nombre} ${d.cliente_apellido}`.trim(),
      'Incidente': `#${d.incidente_id}`,
    }))
  } else if (tipo === 'tecnicos') {
    titulo = 'Reporte de Técnicos'
    cabeceras = ['Nombre', 'Apellido', 'Especialidad', 'Email', 'Teléfono', 'Asignaciones', 'Completadas']
    const datos = await getTecnicosParaExportar()
    filas = datos.map(d => ({
      'Nombre': d.nombre,
      'Apellido': d.apellido,
      'Especialidad': d.especialidad,
      'Email': d.email,
      'Teléfono': d.telefono,
      'Asignaciones': d.total_asignaciones,
      'Completadas': d.asignaciones_completadas,
    }))
  }

  return (
    <html lang="es">
      <head>
        <title>{titulo} — ISBA</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .meta { color: #666; font-size: 10px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1d4ed8; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
          td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #f9fafb; }
          .footer { margin-top: 16px; color: #999; font-size: 9px; text-align: right; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        `}</style>
      </head>
      <body>
        <h1>{titulo}</h1>
        <p className="meta">Sistema ISBA · Generado el {fecha} · {filas.length} registros</p>

        <button
          onClick={() => window.print()}
          style={{ marginBottom: 16, padding: '6px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
        >
          Imprimir / Guardar PDF
        </button>

        {filas.length === 0 ? (
          <p style={{ color: '#666', marginTop: 20 }}>No hay datos para mostrar.</p>
        ) : (
          <table>
            <thead>
              <tr>
                {cabeceras.map(c => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i}>
                  {cabeceras.map(c => (
                    <td key={c}>{String(fila[c] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="footer">ISBA · Sistema de Gestión de Incidentes</p>
      </body>
    </html>
  )
}
