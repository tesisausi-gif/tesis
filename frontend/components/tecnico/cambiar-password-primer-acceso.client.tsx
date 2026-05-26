'use client'

import { useState } from 'react'
import { KeyRound, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/shared/lib/supabase/client'
import { toast } from 'sonner'

export function CambiarPasswordPrimerAccesoTecnico({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const valido = password.length >= 8 && password === confirmar

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return

    setGuardando(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password,
        data: { debe_cambiar_password: false },
      })

      if (error) {
        toast.error('No se pudo cambiar la contraseña', { description: error.message })
        return
      }

      toast.success('Contraseña actualizada')
      onSuccess()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 pt-6 pb-5 flex items-start gap-3">
          <div className="bg-white/20 rounded-full p-2 shrink-0">
            <KeyRound className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">Establecé tu contraseña</p>
            <p className="text-blue-100 text-xs mt-1">
              Es tu primer ingreso como técnico. Elegí una contraseña segura para continuar.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nueva contraseña */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Nueva contraseña</label>
            <div className="relative">
              <input
                type={verPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setVerPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && password.length < 8 && (
              <p className="text-[11px] text-red-500">Mínimo 8 caracteres</p>
            )}
          </div>

          {/* Confirmar */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Confirmá la contraseña</label>
            <div className="relative">
              <input
                type={verConfirmar ? 'text' : 'password'}
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Repetí tu contraseña"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setVerConfirmar(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {verConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmar.length > 0 && password !== confirmar && (
              <p className="text-[11px] text-red-500">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Indicador */}
          {password.length >= 8 && password === confirmar && (
            <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
              <ShieldCheck className="h-4 w-4" />
              Contraseña lista
            </div>
          )}

          <button
            type="submit"
            disabled={!valido || guardando}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            {guardando ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            ) : (
              'Guardar contraseña'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
