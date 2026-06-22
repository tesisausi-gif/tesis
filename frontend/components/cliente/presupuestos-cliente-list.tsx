'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Check, X, Eye, DollarSign, FileText, UserX, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react'
import {
  getEstadoPresupuestoColor,
  getEstadoPresupuestoLabel,
} from '@/shared/utils/colors'
import { aprobarPresupuestoCliente, rechazarPresupuestoConDecision } from '@/features/presupuestos/presupuestos.service'
import { EstadoPresupuesto } from '@/shared/types/enums'

interface Presupuesto {
  id_presupuesto: number
  id_incidente: number
  descripcion_detallada: string
  costo_materiales?: number | null
  costo_mano_obra?: number | null
  gastos_administrativos?: number | null
  costo_total: number
  estado_presupuesto: string
  fecha_creacion: string
  fecha_aprobacion?: string | null
}

interface PresupuestosClienteProps {
  presupuestos: Presupuesto[]
  incidenteId?: number
  onPresupuestoActualizado?: () => void
}

type Paso = 'revisar' | 'decidir'

export function PresupuestosClienteList({
  presupuestos,
  incidenteId,
  onPresupuestoActualizado,
}: PresupuestosClienteProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<Presupuesto | null>(null)
  const [paso, setPaso] = useState<Paso>('revisar')
  const [notaCliente, setNotaCliente] = useState('')

  const handleAprobar = async (presupuesto: Presupuesto) => {
    setLoading(true)
    try {
      const result = await aprobarPresupuestoCliente(presupuesto.id_presupuesto)
      if (result.success) {
        toast.success('Presupuesto aprobado', {
          description: `Aprobaste el presupuesto por $${presupuesto.costo_total.toFixed(2)}`,
        })
        onPresupuestoActualizado?.()
        // Forzar re-fetch del Server Component padre para que el listado de
        // incidentes (cards) refleje el nuevo estado y oculte el botón
        // "Aprobar presup." sin depender de realtime.
        router.refresh()
      } else {
        toast.error('Error', { description: result.error })
      }
    } finally {
      setLoading(false)
    }
  }

  const abrirDialogRechazo = (presupuesto: Presupuesto) => {
    setSelectedPresupuesto(presupuesto)
    setPaso('revisar')
    setNotaCliente('')
    setDialogOpen(true)
  }

  const cerrarDialog = () => {
    setDialogOpen(false)
    setSelectedPresupuesto(null)
    setNotaCliente('')
    setPaso('revisar')
  }

  const handleDecision = async (decision: 'nuevo_tecnico' | 'otra_oportunidad') => {
    if (!selectedPresupuesto) return
    setLoading(true)
    try {
      const result = await rechazarPresupuestoConDecision(
        selectedPresupuesto.id_presupuesto,
        decision,
        notaCliente.trim() || undefined,
      )
      if (result.success) {
        if (decision === 'nuevo_tecnico') {
          toast.success('Se buscará un nuevo técnico', {
            description: 'El incidente volvió a la etapa de asignación.',
          })
        } else {
          toast.success('Notificación enviada al técnico', {
            description: 'El técnico decidirá si puede hacer un nuevo presupuesto.',
          })
        }
        cerrarDialog()
        onPresupuestoActualizado?.()
        router.refresh()
      } else {
        toast.error('Error', { description: result.error })
      }
    } finally {
      setLoading(false)
    }
  }

  const presupuestosActivos = presupuestos.filter(
    (p) => p.estado_presupuesto === EstadoPresupuesto.APROBADO_ADMIN,
  )
  const presupuestosHistorico = presupuestos.filter(
    (p) => p.estado_presupuesto !== EstadoPresupuesto.APROBADO_ADMIN,
  )

  // Desglose con comisión admin incluida en mano de obra
  const desglosarPresupuesto = (p: Presupuesto) => {
    const materiales = p.costo_materiales ?? 0
    const manoObra = p.costo_mano_obra ?? 0
    const gastos = p.gastos_administrativos ?? 0
    const manoObraConComision = manoObra + gastos
    return { materiales, manoObraConComision, total: p.costo_total }
  }

  return (
    <div className="space-y-6">
      {/* Presupuestos pendientes de aprobación */}
      {presupuestosActivos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-lg">Pendientes de Aprobación</h3>
            <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-800">
              {presupuestosActivos.length}
            </Badge>
          </div>

          {presupuestosActivos.map((presupuesto, index) => (
            <motion.div
              key={presupuesto.id_presupuesto}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <p className="font-medium">Presupuesto #{presupuesto.id_presupuesto}</p>
                        <p className="text-sm text-gray-600">{presupuesto.descripcion_detallada}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${presupuesto.costo_total.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => handleAprobar(presupuesto)}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Aprobar
                      </Button>
                      <Button
                        variant="outline"
                        disabled={loading}
                        className="flex-1 gap-2"
                        onClick={() => abrirDialogRechazo(presupuesto)}
                      >
                        <X className="h-4 w-4" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Histórico */}
      {presupuestosHistorico.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-lg">Histórico</h3>
            <Badge variant="outline">{presupuestosHistorico.length}</Badge>
          </div>
          {presupuestosHistorico.map((presupuesto) => (
            <Card key={presupuesto.id_presupuesto} className="opacity-75">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Presupuesto #{presupuesto.id_presupuesto}</p>
                      <Badge variant="outline" className={getEstadoPresupuestoColor(presupuesto.estado_presupuesto)}>
                        {getEstadoPresupuestoLabel(presupuesto.estado_presupuesto)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{presupuesto.descripcion_detallada}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">${presupuesto.costo_total.toFixed(2)}</div>
                    <p className="text-xs text-gray-600">
                      {new Date(presupuesto.fecha_creacion).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {presupuestos.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600">Sin presupuestos para este incidente</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de decisión al rechazar */}
      {dialogOpen && selectedPresupuesto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={cerrarDialog} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-red-600 px-5 py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-300 flex-shrink-0" />
              <div>
                <p className="text-white font-bold text-sm">Rechazar presupuesto</p>
                <p className="text-red-200 text-xs">Presupuesto #{selectedPresupuesto.id_presupuesto}</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {paso === 'revisar' ? (
                <>
                  {/* Desglose de costos */}
                  {(() => {
                    const { materiales, manoObraConComision, total } = desglosarPresupuesto(selectedPresupuesto)
                    return (
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Detalle del presupuesto
                        </div>
                        {materiales > 0 && (
                          <div className="flex justify-between items-center px-4 py-2.5 border-t border-gray-100">
                            <span className="text-sm text-gray-600">Materiales</span>
                            <span className="text-sm font-medium">${materiales.toLocaleString('es-AR')}</span>
                          </div>
                        )}
                        {manoObraConComision > 0 && (
                          <div className="flex justify-between items-center px-4 py-2.5 border-t border-gray-100">
                            <span className="text-sm text-gray-600">Mano de obra</span>
                            <span className="text-sm font-medium">${manoObraConComision.toLocaleString('es-AR')}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center px-4 py-2.5 border-t border-gray-200 bg-gray-50">
                          <span className="text-sm font-bold text-gray-800">Total</span>
                          <span className="text-base font-bold text-gray-900">${total.toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Nota para el técnico */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nota" className="text-sm">
                      Comentarios para el técnico <span className="text-gray-400">(opcional)</span>
                    </Label>
                    <Textarea
                      id="nota"
                      placeholder="Explicá por qué rechazás el presupuesto o qué esperás de uno nuevo..."
                      value={notaCliente}
                      onChange={(e) => setNotaCliente(e.target.value)}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" onClick={cerrarDialog} disabled={loading} className="flex-1 text-sm">
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => setPaso('decidir')}
                      disabled={loading}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm"
                    >
                      Continuar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-700 font-medium">¿Qué querés hacer?</p>

                  {/* Opción 1: nuevo técnico */}
                  <button
                    onClick={() => handleDecision('nuevo_tecnico')}
                    disabled={loading}
                    className="w-full text-left rounded-lg border-2 border-orange-200 bg-orange-50 hover:border-orange-400 hover:bg-orange-100 transition-colors p-4 space-y-1 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      {loading ? (
                        <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
                      ) : (
                        <UserX className="h-4 w-4 text-orange-600" />
                      )}
                      <span className="text-sm font-bold text-orange-800">Buscar un nuevo técnico</span>
                    </div>
                    <p className="text-xs text-orange-700 pl-6">
                      El incidente volverá a la etapa de asignación y administración asignará otro técnico.
                    </p>
                  </button>

                  {/* Opción 2: otra oportunidad */}
                  <button
                    onClick={() => handleDecision('otra_oportunidad')}
                    disabled={loading}
                    className="w-full text-left rounded-lg border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 transition-colors p-4 space-y-1 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      {loading ? (
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                      )}
                      <span className="text-sm font-bold text-blue-800">Darle otra oportunidad al técnico</span>
                    </div>
                    <p className="text-xs text-blue-700 pl-6">
                      El técnico verá tus comentarios y podrá enviar un nuevo presupuesto o declinar.
                    </p>
                  </button>

                  <Button
                    variant="ghost"
                    onClick={() => setPaso('revisar')}
                    disabled={loading}
                    className="w-full text-sm text-gray-500"
                  >
                    ← Volver
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
