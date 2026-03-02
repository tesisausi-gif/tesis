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
  const [puntuacion, setPuntuacion] = useState<number>(5)
  const [hoverEstrellas, setHoverEstrellas] = useState<number>(0)
  const [comentarios, setComentarios] = useState('')

  const resetForm = () => {
    setPuntuacion(5)
    setComentarios('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (puntuacion < 1) {
      toast.error('Califica al técnico con al menos una estrella')
      return
    }

    setLoading(true)
    try {
      const result = await crearCalificacion({
        id_incidente: incidenteId,
        id_tecnico: idTecnico,
        puntuacion,
        comentarios: comentarios.trim() || null,
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
                  onClick={() => setPuntuacion(star)}
                  onMouseEnter={() => setHoverEstrellas(star)}
                  onMouseLeave={() => setHoverEstrellas(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      (hoverEstrellas || puntuacion) >= star
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              {puntuacion} de 5 estrellas
            </p>
          </div>

          {/* Comentario */}
          <div className="space-y-2">
            <Label htmlFor="comentarios">Comentario (opcional)</Label>
            <Textarea
              id="comentarios"
              placeholder="Cuéntanos más sobre tu experiencia con el técnico..."
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {comentarios.length}/500 caracteres
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
