'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, DollarSign, Wrench, Loader2, FileSpreadsheet, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  getIncidentesParaExportar,
  getPagosParaExportar,
  getTecnicosParaExportar,
} from '@/features/exportar/exportar.service'
import type { TipoReporte } from '@/features/exportar/exportar.types'

// ─── helpers CSV ────────────────────────────────────────────────────────────

function escaparCSV(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  const str = String(valor)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function generarCSV(cabeceras: string[], filas: Record<string, unknown>[]): string {
  const header = cabeceras.map(escaparCSV).join(',')
  const body = filas.map(fila => cabeceras.map(c => escaparCSV(fila[c])).join(','))
  return [header, ...body].join('\n')
}

function descargarCSV(csv: string, nombreArchivo: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─── definición de reportes ──────────────────────────────────────────────────

const REPORTES: {
  tipo: TipoReporte
  titulo: string
  descripcion: string
  icon: typeof FileText
  color: string
  cabeceras: string[]
}[] = [
  {
    tipo: 'incidentes',
    titulo: 'Reporte de Incidentes',
    descripcion: 'Todos los incidentes del sistema con estado, cliente e inmueble',
    icon: FileText,
    color: 'text-blue-600',
    cabeceras: [
      'id_incidente', 'fecha_registro', 'descripcion_problema', 'categoria',
      'nivel_prioridad', 'estado_actual', 'fue_resuelto', 'fecha_cierre',
      'cliente_nombre', 'cliente_apellido', 'inmueble_calle', 'inmueble_localidad',
    ],
  },
  {
    tipo: 'pagos',
    titulo: 'Reporte de Pagos',
    descripcion: 'Historial de pagos con importes, métodos y comprobantes',
    icon: DollarSign,
    color: 'text-green-600',
    cabeceras: [
      'id_pago', 'fecha_pago', 'monto_pagado', 'tipo_pago', 'metodo_pago',
      'numero_comprobante', 'incidente_id', 'incidente_descripcion',
      'cliente_nombre', 'cliente_apellido',
    ],
  },
  {
    tipo: 'tecnicos',
    titulo: 'Reporte de Técnicos',
    descripcion: 'Técnicos activos con asignaciones totales y completadas',
    icon: Wrench,
    color: 'text-orange-600',
    cabeceras: [
      'nombre', 'apellido', 'especialidad', 'email', 'telefono',
      'total_asignaciones', 'asignaciones_completadas',
    ],
  },
]

// ─── componente ──────────────────────────────────────────────────────────────

export function ExportarContent() {
  const [cargando, setCargando] = useState<TipoReporte | null>(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const exportarCSV = async (tipo: TipoReporte) => {
    setCargando(tipo)
    try {
      let filas: Record<string, unknown>[] = []
      let cabeceras: string[] = []
      const fecha = new Date().toISOString().slice(0, 10)

      const filtro = {
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      }

      if (tipo === 'incidentes') {
        const datos = await getIncidentesParaExportar(filtro)
        filas = datos as unknown as Record<string, unknown>[]
        cabeceras = REPORTES.find(r => r.tipo === 'incidentes')!.cabeceras
        descargarCSV(generarCSV(cabeceras, filas), `incidentes_${fecha}.csv`)
      } else if (tipo === 'pagos') {
        const datos = await getPagosParaExportar(filtro)
        filas = datos as unknown as Record<string, unknown>[]
        cabeceras = REPORTES.find(r => r.tipo === 'pagos')!.cabeceras
        descargarCSV(generarCSV(cabeceras, filas), `pagos_${fecha}.csv`)
      } else if (tipo === 'tecnicos') {
        const datos = await getTecnicosParaExportar()
        filas = datos as unknown as Record<string, unknown>[]
        cabeceras = REPORTES.find(r => r.tipo === 'tecnicos')!.cabeceras
        descargarCSV(generarCSV(cabeceras, filas), `tecnicos_${fecha}.csv`)
      }

      toast.success('Reporte exportado', {
        description: `${filas.length} registros descargados como CSV`,
      })
    } catch {
      toast.error('Error al exportar', { description: 'Intenta de nuevo más tarde' })
    } finally {
      setCargando(null)
    }
  }

  const exportarPDF = (tipo: TipoReporte) => {
    const reporte = REPORTES.find(r => r.tipo === tipo)!
    // Abre la página de impresión del reporte en una ventana nueva
    const url = `/dashboard/exportar/imprimir?tipo=${tipo}`
    window.open(url, '_blank', 'width=900,height=700,noopener,noreferrer')
    toast.info(`Abriendo vista de impresión: ${reporte.titulo}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Exportar Reportes</h2>
        <p className="text-muted-foreground">
          Descarga datos del sistema en formato CSV o genera PDF para imprimir
        </p>
      </div>

      {/* Filtro de fechas global */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtrar por rango de fechas (opcional)
          </CardTitle>
          <CardDescription className="text-xs">
            Se aplica a incidentes y pagos. Dejar en blanco para exportar todo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="w-36 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="w-36 h-8 text-sm"
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setFechaDesde(''); setFechaHasta('') }}
                className="text-xs text-muted-foreground"
              >
                Limpiar filtro
              </Button>
            )}
          </div>
          {(fechaDesde || fechaHasta) && (
            <p className="text-xs text-blue-600 mt-2">
              Filtrando: {fechaDesde || '...'} → {fechaHasta || '...'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        {REPORTES.map((reporte) => {
          const Icon = reporte.icon
          const ocupado = cargando === reporte.tipo
          return (
            <Card key={reporte.tipo} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${reporte.color}`}>
                  <Icon className="h-5 w-5" />
                  {reporte.titulo}
                </CardTitle>
                <CardDescription>{reporte.descripcion}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {reporte.cabeceras.slice(0, 4).map(c => (
                    <Badge key={c} variant="outline" className="text-xs font-mono">
                      {c}
                    </Badge>
                  ))}
                  {reporte.cabeceras.length > 4 && (
                    <Badge variant="outline" className="text-xs text-gray-400">
                      +{reporte.cabeceras.length - 4} más
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => exportarCSV(reporte.tipo)}
                    disabled={cargando !== null}
                    className="flex-1 gap-2"
                    variant="default"
                  >
                    {ocupado ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    CSV
                  </Button>

                  <Button
                    onClick={() => exportarPDF(reporte.tipo)}
                    disabled={cargando !== null}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-dashed border-gray-300 bg-gray-50">
        <CardContent className="py-4">
          <p className="text-xs text-gray-500">
            <strong>CSV:</strong> Compatible con Excel, Google Sheets y cualquier herramienta de análisis. Incluye BOM UTF-8 para soporte de caracteres especiales.
            <br />
            <strong>PDF:</strong> Abre una vista optimizada para impresión. Usa Ctrl+P (o Cmd+P) para guardar como PDF.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
