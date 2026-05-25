'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarDays, Loader2 } from 'lucide-react'
import { AgendaTecnico } from '@/components/tecnico/agenda-tecnico.client'
import { getFranjasAgendaTecnico } from '@/features/disponibilidad/disponibilidad.service'
import type { FranjaAgenda } from '@/features/disponibilidad/disponibilidad.types'

interface AgendaTecnicoModalProps {
  idTecnico: number
  nombreTecnico?: string
  /** Clases CSS del botón trigger */
  triggerClassName?: string
  /** Texto del trigger */
  triggerLabel?: string
}

export function AgendaTecnicoModal({
  idTecnico,
  nombreTecnico,
  triggerClassName,
  triggerLabel = 'Ver Agenda',
}: AgendaTecnicoModalProps) {
  const [open, setOpen] = useState(false)
  const [franjas, setFranjas] = useState<FranjaAgenda[] | null>(null)
  const [cargando, setCargando] = useState(false)

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setCargando(true)
      setFranjas(null)
      try {
        const data = await getFranjasAgendaTecnico(idTecnico)
        setFranjas(data)
      } catch {
        setFranjas([])
      } finally {
        setCargando(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className={triggerClassName}>
          <CalendarDays className="w-4 h-4" />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm max-h-[85vh] overflow-x-hidden overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
            {nombreTecnico ? `Agenda — ${nombreTecnico}` : 'Mi Agenda'}
          </DialogTitle>
        </DialogHeader>
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando agenda…
          </div>
        ) : (
          <AgendaTecnico franjas={franjas ?? []} embedded />
        )}
      </DialogContent>
    </Dialog>
  )
}
