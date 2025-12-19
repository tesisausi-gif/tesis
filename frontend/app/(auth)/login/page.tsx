'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { getAuthErrorMessage } from '@/lib/error-messages'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Intentando login con email:', email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Respuesta de Supabase:', { data, error })

      if (error) {
        console.error('Error de login:', error)
        const errorMsg = getAuthErrorMessage(error)
        toast.error(errorMsg.title, {
          description: errorMsg.description
        })
        setLoading(false)
        return
      }

      if (data.user) {
        console.log('Login exitoso, obteniendo rol del usuario...')

        // Obtener el rol del usuario desde la tabla usuarios
        const { data: usuarioData, error: usuarioError } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', data.user.id)
          .single()

        if (usuarioError || !usuarioData) {
          console.error('Error al obtener datos del usuario:', usuarioError)
          toast.error('Error al obtener información del usuario')
          setLoading(false)
          return
        }

        const rol = usuarioData.rol
        console.log('Rol del usuario:', rol)

        toast.success('Inicio de sesión exitoso')

        // Redirigir según el rol del usuario
        switch (rol) {
          case 'admin':
          case 'gestor':
            router.push('/dashboard')
            break
          case 'cliente':
            router.push('/cliente')
            break
          case 'tecnico':
            router.push('/tecnico')
            break
          default:
            router.push('/dashboard')
        }

        router.refresh()
      } else {
        console.error('No se recibió usuario en la respuesta')
        toast.error('Error al iniciar sesión', {
          description: 'No se pudo obtener información del usuario'
        })
        setLoading(false)
      }
    } catch (error) {
      console.error('Error catch:', error)
      const errorMsg = getAuthErrorMessage(error)
      toast.error(errorMsg.title, {
        description: errorMsg.description
      })
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Sistema de Gestión de Incidentes</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder al sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
