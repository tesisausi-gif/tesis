'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings, Wrench, Plus, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  crearEspecialidad,
  toggleActivaEspecialidad,
} from '@/features/usuarios/usuarios.service'
import { ChangePasswordCard } from '@/components/shared/change-password-card'

interface Especialidad {
  id_especialidad: number
  nombre: string
  descripcion: string | null
  esta_activa: boolean
}

interface ConfiguracionContentProps {
  especialidades: Especialidad[]
}

export function ConfiguracionContent({ especialidades: esp }: ConfiguracionContentProps) {
  const router = useRouter()
  const [especialidades, setEspecialidades] = useState<Especialidad[]>(esp)
  const [nuevaEsp, setNuevaEsp] = useState('')
  const [nuevaEspDesc, setNuevaEspDesc] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaEsp.trim()) return

    setGuardando(true)
    try {
      const result = await crearEspecialidad({
        nombre: nuevaEsp.trim(),
        descripcion: nuevaEspDesc.trim() || null,
      })

      if (!result.success) {
        toast.error('Error al crear especialidad', { description: result.error })
        return
      }

      toast.success('Especialidad creada')
      setNuevaEsp('')
      setNuevaEspDesc('')
      setAgregando(false)
      router.refresh()
    } catch {
      toast.error('Error inesperado')
    } finally {
      setGuardando(false)
    }
  }

  const handleToggleActiva = async (id: number, estadoActual: boolean) => {
    try {
      const result = await toggleActivaEspecialidad(id, !estadoActual)
      if (!result.success) {
        toast.error('Error al actualizar especialidad', { description: result.error })
        return
      }
      setEspecialidades(prev =>
        prev.map(e => e.id_especialidad === id ? { ...e, esta_activa: !estadoActual } : e)
      )
      toast.success(estadoActual ? 'Especialidad desactivada' : 'Especialidad activada')
    } catch {
      toast.error('Error inesperado')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-gray-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-sm text-gray-600">Parámetros generales del sistema ISBA</p>
        </div>
      </div>

      {/* Especialidades */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Especialidades de Técnicos
              </CardTitle>
              <CardDescription>
                Gestiona las especialidades disponibles para los técnicos del sistema
              </CardDescription>
            </div>
            {!agregando && (
              <Button size="sm" onClick={() => setAgregando(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulario nueva especialidad */}
          {agregando && (
            <form onSubmit={handleAgregar} className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="nueva-esp">Nombre *</Label>
                  <Input
                    id="nueva-esp"
                    value={nuevaEsp}
                    onChange={(e) => setNuevaEsp(e.target.value)}
                    placeholder="ej: Plomería"
                    disabled={guardando}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nueva-esp-desc">Descripción</Label>
                  <Input
                    id="nueva-esp-desc"
                    value={nuevaEspDesc}
                    onChange={(e) => setNuevaEspDesc(e.target.value)}
                    placeholder="Descripción opcional"
                    disabled={guardando}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={guardando}>
                  <Check className="h-4 w-4 mr-1" />
                  {guardando ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setAgregando(false); setNuevaEsp(''); setNuevaEspDesc('') }}
                  disabled={guardando}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {/* Lista de especialidades */}
          <div className="divide-y">
            {especialidades.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No hay especialidades registradas</p>
            ) : (
              especialidades.map((esp) => (
                <div key={esp.id_especialidad} className="flex items-center justify-between py-3">
                  <div>
                    <span className="font-medium text-sm">{esp.nombre}</span>
                    {esp.descripcion && (
                      <p className="text-xs text-gray-500">{esp.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={esp.esta_activa
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500'}
                    >
                      {esp.esta_activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleToggleActiva(esp.id_especialidad, esp.esta_activa)}
                    >
                      {esp.esta_activa ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info del sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
          <CardDescription>Datos generales del sistema ISBA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Sistema</span>
            <span className="font-medium">ISBA - Gestión de Incidentes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Versión</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Especialidades activas</span>
            <span className="font-medium">{especialidades.filter(e => e.esta_activa).length}</span>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  )
}
