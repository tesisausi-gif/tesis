'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X, Loader2, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import { subirFotoInspeccion } from '@/features/documentos/documentos.service'
import Image from 'next/image'

interface FotoUploaderProps {
  idInspeccion: number
  fotosIniciales?: string[]
  soloLectura?: boolean
}

export function FotoUploader({ idInspeccion, fotosIniciales = [], soloLectura = false }: FotoUploaderProps) {
  const [fotos, setFotos] = useState<string[]>(fotosIniciales)
  const [subiendo, setSubiendo] = useState(false)
  const [viendoFoto, setViendoFoto] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    if (!archivo.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (JPG, PNG, WEBP)')
      return
    }

    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append('archivo', archivo)

      const result = await subirFotoInspeccion(idInspeccion, formData)

      if (!result.success) {
        toast.error('Error al subir foto', { description: result.error })
        return
      }

      setFotos(prev => [...prev, result.data!])
      toast.success('Foto subida correctamente')
    } finally {
      setSubiendo(false)
      // Reset input para permitir subir el mismo archivo de nuevo
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {/* Título + botón subir */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
          <Camera className="h-3.5 w-3.5" />
          Fotos ({fotos.length})
        </p>
        {!soloLectura && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
              disabled={subiendo}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={subiendo}
              onClick={() => inputRef.current?.click()}
            >
              {subiendo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {subiendo ? 'Subiendo...' : 'Agregar foto'}
            </Button>
          </>
        )}
      </div>

      {/* Grid de miniaturas */}
      {fotos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((url, idx) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer group border border-gray-200"
              onClick={() => setViendoFoto(url)}
            >
              <Image
                src={url}
                alt={`Foto ${idx + 1}`}
                fill
                className="object-cover"
                sizes="120px"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        !soloLectura && (
          <p className="text-xs text-gray-400 text-center py-2">
            Sin fotos aún. Toca "Agregar foto" para subir una imagen.
          </p>
        )
      )}

      {/* Lightbox simple */}
      {viendoFoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViendoFoto(null)}
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setViendoFoto(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative max-w-full max-h-full w-full h-full">
            <Image
              src={viendoFoto}
              alt="Foto ampliada"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </div>
  )
}
