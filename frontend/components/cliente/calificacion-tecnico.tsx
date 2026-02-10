'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Star, Send } from 'lucide-react'
import { crearCalificacion } from '@/features/calificaciones/calificaciones.service'
import { EstrellasCalificacion } from '@/features/calificaciones/calificaciones.types'

interface CalificacionTecnicoProps {
  incidenteId: number
  idTecnico: number
  nombreTecnico: string
  onCalificacionCreated?: () => void
}

export function CalificacionTecnico({
  incidenteId,
  idTecnico,
  nombreTecnico,
  onCalificacionCreated,
}: CalificacionTecnicoProps) {
  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [estrellas, setEstrellas] = useState<number>(5)
  const [hoverEstrellas, setHoverEstrellas] = useState<number>(0)
  const [comentario, setComentario] = useState('')
  const [aspectoTecnico, setAspectoTecnico] = useState<number>(5)
  const [puntualidad, setPuntualidad] = useState<number>(5)
  const [actitud, setActitud] = useState<number>(5)

  const resetForm = () => {
    setEstrellas(5)
    setComentario('')
    setAspectoTecnico(5)
    setPuntualidad(5)
    setActitud(5)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (estrellas < 1) {
      toast.error('Califica al técnico con al menos una estrella')
      return
    }

    setLoading(true)
    try {
      const result = await crearCalificacion({
        id_incidente: incidenteId,
        id_tecnico: idTecnico,
        estrellas,
        comentario: comentario.trim() || null,
        aspecto_tecnico: aspectoTecnico,
        puntualidad: puntualidad,
        actitud: actitud,
      })

      if (result.success) {
        toast.success('Calificación enviada', {
          description: `Gracias por calificar a ${nombreTecnico}`,
        })
        resetForm()
        setOpenModal(false)
        onCalificacionCreated?.()
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
    <Dialog open={openModal} onOpenChange={setOpenModal}>
      <DialogTrigger asChild>
        <Button onClick={() => resetForm()} className="gap-2">
          <Star className="h-4 w-4" />
          Calificar Técnico
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Calificar a {nombreTecnico}</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia con este técnico
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Calificación general */}
          <div className="space-y-3">
            <Label>Calificación General</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setEstrellas(star)}
                  onMouseEnter={() => setHoverEstrellas(star)}
                  onMouseLeave={() => setHoverEstrellas(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      (hoverEstrellas || estrellas) >= star
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              {estrellas} de 5 estrellas
            </p>
          </div>

          {/* Aspectos específicos */}
          <div className="space-y-4">
            <Label>Evalúa por Aspecto</Label>

            {/* Aspecto técnico */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Aspecto Técnico</span>
                <span className="text-sm text-gray-600">{aspectoTecnico}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={aspectoTecnico}
                onChange={(e) => setAspectoTecnico(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Puntualidad */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Puntualidad</span>
                <span className="text-sm text-gray-600">{puntualidad}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={puntualidad}
                onChange={(e) => setPuntualidad(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Actitud */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Actitud/Trato</span>
                <span className="text-sm text-gray-600">{actitud}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={actitud}
                onChange={(e) => setActitud(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Comentario */}
          <div className="space-y-2">
            <Label htmlFor="comentario">Comentario (opcional)</Label>
            <Textarea
              id="comentario"
              placeholder="Cuéntanos más sobre tu experiencia con el técnico..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {comentario.length}/500 caracteres
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpenModal(false)
                resetForm()
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 gap-2">
              <Send className="h-4 w-4" />
              {loading ? 'Enviando...' : 'Enviar Calificación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
