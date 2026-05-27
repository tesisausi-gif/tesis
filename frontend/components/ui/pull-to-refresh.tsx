'use client'

import { ArrowDown, RefreshCw } from 'lucide-react'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const { indicatorH, phase } = usePullToRefresh()

  const isActive     = phase !== 'idle'
  const isReady      = phase === 'ready'
  const isRefreshing = phase === 'refreshing'
  const snapping     = phase === 'idle'  // cuando suelta sin llegar al umbral

  return (
    <div>
      {/* Spacer + indicador: crece con el gesto y aloja el pill */}
      <div
        className="flex items-end justify-center overflow-hidden bg-gray-50"
        style={{
          height: indicatorH,
          transition: snapping ? 'height 0.25s ease' : 'none',
        }}
      >
        {isActive && (
          <div className={`mb-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm select-none transition-colors duration-150 ${
            isReady || isRefreshing
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-500 border border-gray-200'
          }`}>
            {isRefreshing
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <ArrowDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isReady ? 'rotate-180' : ''}`} />
            }
            <span>
              {isRefreshing ? 'Actualizando…' : isReady ? 'Soltar para actualizar' : 'Deslizá para actualizar'}
            </span>
          </div>
        )}
      </div>

      {children}
    </div>
  )
}
