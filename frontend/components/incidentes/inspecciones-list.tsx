'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Wrench } from 'lucide-react'
import { crearInspeccion, eliminarInspeccion } from '@/features/inspecciones/inspecciones.service'
import type { InspeccionConDetalle } from '@/features/inspecciones/inspecciones.types'

interface InspeccionsListProps {
  incidenteId: number
  idTecnico: number
  inspecciones: InspeccionConDetalle[]
  onInspeccionCreated?: () => void
  onInspeccionDeleted?: () => void
}

export function InspeccionesList({
  incidenteId,
  idTecnico,
  inspecciones,
  onInspeccionCreated,
  onInspeccionDeleted,
}: InspeccionsListProps) {
  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [descripcionInspeccion, setDescripcionInspeccion] = useState('')
  const [hallazgos, setHallazgos] = useState('')

  const resetForm = () => {
    setDescripcionInspeccion('')
    setHallazgos('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!descripcionInspeccion.trim()) {
      toast.error('Describe la inspección realizada')
      return
    }

    if (descripcionInspeccion.trim().length < 10) {
      toast.error('La descripción debe tener al menos 10 caracteres')
      return
    }

    setLoading(true)
    try {
      const result = await crearInspeccion({
        id_incidente: incidenteId,
        id_tecnico: idTecnico,
        descripcion_inspeccion: descripcionInspeccion.trim(),
        hallazgos: hallazgos.trim() || undefined,
      })

      if (result.success) {
        toast.success('Inspección registrada', {
          description: 'Se ha guardado el reporte de inspección',
        })
        resetForm()
        setOpenModal(false)
        onInspeccionCreated?.()
      } else {
        toast.error('Error', {
          description: result.error,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (idInspeccion: number) => {
    if (!confirm('¿Eliminar esta inspección?')) return

    setLoading(true)
    try {
      const result = await eliminarInspeccion(idInspeccion)
      if (result.success) {
        toast.success('Inspección eliminada')
        onInspeccionDeleted?.()
      } else {
        toast.error('Error', {
          description: result.error,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header con botón crear */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-semibold">Inspecciones Técnicas</h3>
            <p className="text-sm text-gray-600">{inspecciones.length} reportes</p>
          </div>
        </div>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Inspección
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Inspección</DialogTitle>
              <DialogDescription>
                Documenta los resultados de tu inspección técnica
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción de la Inspección</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Describe en detalle qué inspeccionaste y qué encontraste..."
                  value={descripcionInspeccion}
                  onChange={(e) => setDescripcionInspeccion(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500">
                  {descripcionInspeccion.length}/1000 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hallazgos">Hallazgos Importantes (opcional)</Label>
                <Textarea
                  id="hallazgos"
                  placeholder="Problemas detectados, recomendaciones, detalles relevantes..."
                  value={hallazgos}
                  onChange={(e) => setHallazgos(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  {hallazgos.length}/500 caracteres
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setOpenModal(false)
                  }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Guardando...' : 'Registrar Inspección'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Listado de inspecciones */}
      <div className="space-y-3">
        {inspecciones.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <Eye className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">Sin inspecciones aún</p>
              <p className="text-sm text-gray-500">Registra tu primera inspección</p>
            </CardContent>
          </Card>
        ) : (
          inspecciones.map((inspeccion, index) => (
            <motion.div
              key={inspeccion.id_inspeccion}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 font-medium">
                            {format(new Date(inspeccion.fecha_inspeccion || new Date()), 'dd MMM yyyy', { locale: es })}
                          </span>
                        </div>
                        <p className="font-medium text-sm">{inspeccion.descripcion_inspeccion}</p>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(inspeccion.id_inspeccion)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>

                    {inspeccion.hallazgos && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded">
                        <p className="font-medium text-sm text-amber-900 mb-1">Hallazgos:</p>
                        <p className="text-sm text-amber-800">{inspeccion.hallazgos}</p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <span>
                        Por {inspeccion.tecnicos?.nombre} {inspeccion.tecnicos?.apellido}
                      </span>
                      <span>•</span>
                      <span>{format(new Date(inspeccion.fecha_registro || new Date()), 'HH:mm', { locale: es })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
