'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { cambiarPasswordObligatorio } from '@/features/auth/cambiar-password.service'
import { createClient } from '@/shared/lib/supabase/client'

export default function CambiarPasswordPage() {
  const router = useRouter()
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrarNueva, setMostrarNueva] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const requisitos = [
    { label: 'Al menos 8 caracteres', ok: nueva.length >= 8 },
    { label: 'Al menos una mayúscula', ok: /[A-Z]/.test(nueva) },
    { label: 'Al menos un número', ok: /[0-9]/.test(nueva) },
  ]
  const todosOk = requisitos.every(r => r.ok)
  const coinciden = nueva === confirmar && confirmar.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!todosOk) { toast.error('La contraseña no cumple los requisitos'); return }
    if (!coinciden) { toast.error('Las contraseñas no coinciden'); return }

    setSubmitting(true)
    try {
      const result = await cambiarPasswordObligatorio(nueva)
      if (!result.success) {
        toast.error('Error al cambiar contraseña', { description: result.error })
        return
      }
      toast.success('Contraseña actualizada correctamente')
      // Obtener rol para redirigir al lugar correcto
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', user.id)
          .single()
        const rol = usuario?.rol
        router.push(rol === 'tecnico' ? '/tecnico' : rol === 'cliente' ? '/cliente' : '/dashboard')
      } else {
        router.push('/login')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-2">
            <ShieldCheck className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cambiá tu contraseña</h1>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            Por seguridad, debés establecer una contraseña propia antes de continuar.
          </p>
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Estás usando una contraseña temporal asignada por el administrador. Esta contraseña
            debe cambiarse ahora para poder acceder al sistema.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nueva contraseña</CardTitle>
            <CardDescription className="text-xs">Elegí una contraseña segura que no hayas usado antes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nueva contraseña */}
              <div className="space-y-2">
                <Label htmlFor="nueva">Nueva contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="nueva"
                    type={mostrarNueva ? 'text' : 'password'}
                    value={nueva}
                    onChange={e => setNueva(e.target.value)}
                    placeholder="Ingresá tu nueva contraseña"
                    className="pl-9 pr-9"
                    disabled={submitting}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNueva(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {mostrarNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Requisitos */}
              {nueva.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {requisitos.map(r => (
                    <li key={r.label} className={`flex items-center gap-1.5 ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${r.ok ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {r.label}
                    </li>
                  ))}
                </ul>
              )}

              {/* Confirmar */}
              <div className="space-y-2">
                <Label htmlFor="confirmar">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmar"
                    type={mostrarConfirmar ? 'text' : 'password'}
                    value={confirmar}
                    onChange={e => setConfirmar(e.target.value)}
                    placeholder="Repetí la contraseña"
                    className={`pl-9 pr-9 ${confirmar.length > 0 && !coinciden ? 'border-red-400' : ''}`}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmar(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {mostrarConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmar.length > 0 && !coinciden && (
                  <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !todosOk || !coinciden}
              >
                {submitting ? 'Guardando...' : 'Guardar contraseña y continuar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
