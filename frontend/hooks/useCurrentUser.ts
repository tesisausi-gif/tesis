/**
 * Hook para obtener el usuario actual y su información
 * Centraliza la lógica que estaba duplicada en 15+ archivos
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'

interface CurrentUser {
  id: string
  email: string | undefined
  rol: string | null
  id_cliente: number | null
  id_tecnico: number | null
  nombre: string | null
  apellido: string | null
}

interface UseCurrentUserReturn {
  user: CurrentUser | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCurrentUser(): UseCurrentUserReturn {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        return
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, rol, id_cliente, id_tecnico, nombre, apellido')
        .eq('id', authUser.id)
        .single()

      if (usuarioError) {
        throw usuarioError
      }

      setUser({
        id: authUser.id,
        email: authUser.email,
        rol: usuario?.rol || null,
        id_cliente: usuario?.id_cliente || null,
        id_tecnico: usuario?.id_tecnico || null,
        nombre: usuario?.nombre || null,
        apellido: usuario?.apellido || null,
      })
    } catch (err) {
      console.error('Error al obtener usuario:', err)
      setError('Error al obtener información del usuario')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return { user, loading, error, refetch: fetchUser }
}
