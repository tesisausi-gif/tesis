'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginacionProps {
  pagina: number
  total: number
  porPagina?: number
  onChange: (pagina: number) => void
}

export function Paginacion({ pagina, total, porPagina = 10, onChange }: PaginacionProps) {
  const totalPaginas = Math.ceil(total / porPagina)
  if (totalPaginas <= 1) return null

  const desde = (pagina - 1) * porPagina + 1
  const hasta = Math.min(pagina * porPagina, total)

  return (
    <div className="flex items-center justify-between px-1 pt-3 pb-1 border-t border-gray-100 mt-3">
      <span className="text-xs text-muted-foreground">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(pagina - 1)}
          disabled={pagina === 1}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium px-2 tabular-nums">
          {pagina} / {totalPaginas}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
