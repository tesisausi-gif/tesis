'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Check, X, Eye, Calendar, DollarSign, FileText } from 'lucide-react'
import {
  getEstadoPresupuestoColor,
  getEstadoPresupuestoLabel,
} from '@/shared/utils/colors'
import { aprobarPresupuestoCliente, rechazarPresupuestoCliente } from '@/features/presupuestos/presupuestos.service'
import { EstadoPresupuesto } from '@/shared/types/enums'

interface Presupuesto {
  id_presupuesto: number
  id_incidente: number
  id_tecnico: number
  descripcion_trabajo: string
  detalles_trabajo?: string
  costo_total: number
  estado_presupuesto: string
  fecha_creacion: string
  fecha_vencimiento?: string
  fecha_aprobacion?: string
  fecha_rechazo?: string
  razon_rechazo?: string | null
  tecnicos?: {
    nombre: string
    apellido: string
  }
}

interface PresupuestosClienteProps {
  presupuestos: Presupuesto[]
  incidenteId?: number
  onPresupuestoActualizado?: () => void
}

// Mapeos locales eliminados, se usan centralizados en colors.ts

export function PresupuestosClienteList({
  presupuestos,
  incidenteId,
  onPresupuestoActualizado,
}: PresupuestosClienteProps) {
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<Presupuesto | null>(null)
  const [razonRechazo, setRazonRechazo] = useState('')

  const handleAprobar = async (presupuesto: Presupuesto) => {
    setLoading(true)
    try {
      const result = await aprobarPresupuestoCliente(presupuesto.id_presupuesto)

      if (result.success) {
        toast.success('Presupuesto aprobado', {
          description: `Has aprobado el presupuesto $${presupuesto.costo_total.toFixed(2)}`,
        })
        onPresupuestoActualizado?.()
      } else {
        toast.error('Error', {
          description: result.error,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRechazar = async () => {
    if (!selectedPresupuesto) return

    if (!razonRechazo.trim()) {
      toast.error('Indica por qué rechazas el presupuesto')
      return
    }

    setLoading(true)
    try {
      const result = await rechazarPresupuestoCliente(
        selectedPresupuesto.id_presupuesto,
        razonRechazo.trim()
      )

      if (result.success) {
        toast.success('Presupuesto rechazado', {
          description: 'Has rechazado el presupuesto',
        })
        setModalOpen(false)
        setRazonRechazo('')
        setSelectedPresupuesto(null)
        onPresupuestoActualizado?.()
      } else {
        toast.error('Error', {
          description: result.error,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const presupuestosActivos = presupuestos.filter(
    (p) => p.estado_presupuesto === EstadoPresupuesto.APROBADO_ADMIN
  )

  const presupuestosHistorico = presupuestos.filter(
    (p) => p.estado_presupuesto !== EstadoPresupuesto.APROBADO_ADMIN
  )

  return (
    <div className="space-y-6">
      {/* Presupuestos pendientes de aprobación */}
      {presupuestosActivos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-lg">Pendientes de Aprobación</h3>
            <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-800">{presupuestosActivos.length}</Badge>
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
                        <p className="font-medium">
                          Presupuesto #{presupuesto.id_presupuesto}
                        </p>
                        <p className="text-sm text-gray-600">
                          {presupuesto.descripcion_trabajo}
                        </p>
                        {presupuesto.detalles_trabajo && (
                          <p className="text-xs text-gray-600 mt-2">
                            {presupuesto.detalles_trabajo}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${presupuesto.costo_total.toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-600">
                          por {presupuesto.tecnicos?.nombre} {presupuesto.tecnicos?.apellido}
                        </p>
                      </div>
                    </div>

                    {presupuesto.fecha_vencimiento && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Vencimiento:{' '}
                          {new Date(presupuesto.fecha_vencimiento).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => handleAprobar(presupuesto)}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Aprobar
                      </Button>

                      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={loading}
                            className="flex-1 gap-2"
                            onClick={() => setSelectedPresupuesto(presupuesto)}
                          >
                            <X className="h-4 w-4" />
                            Rechazar
                          </Button>
                        </DialogTrigger>

                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rechazar Presupuesto</DialogTitle>
                            <DialogDescription>
                              Presupuesto #{selectedPresupuesto?.id_presupuesto} -${' '}
                              {selectedPresupuesto?.costo_total.toFixed(2)}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="razon">
                                ¿Por qué rechazas este presupuesto?
                              </Label>
                              <Textarea
                                id="razon"
                                placeholder="Explica brevemente tu motivo..."
                                value={razonRechazo}
                                onChange={(e) => setRazonRechazo(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <div className="flex gap-2 pt-4">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setModalOpen(false)
                                  setRazonRechazo('')
                                }}
                                disabled={loading}
                              >
                                Cancelar
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleRechazar}
                                disabled={loading}
                                className="flex-1"
                              >
                                {loading ? 'Rechazando...' : 'Confirmar Rechazo'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Histórico de presupuestos */}
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
                    <p className="text-sm text-gray-600">
                      {presupuesto.descripcion_trabajo}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-semibold">${presupuesto.costo_total.toFixed(2)}</div>
                    <p className="text-xs text-gray-600">
                      {new Date(presupuesto.fecha_creacion).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>

                {presupuesto.razon_rechazo && (
                  <div className="mt-3 bg-red-50 p-2 rounded text-sm text-red-800">
                    <strong>Razón del rechazo:</strong> {presupuesto.razon_rechazo}
                  </div>
                )}
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
    </div>
  )
}
