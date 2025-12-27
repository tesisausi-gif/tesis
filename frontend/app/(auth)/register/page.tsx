'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { getAuthErrorMessage } from '@/lib/error-messages'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [especialidades, setEspecialidades] = useState<Array<{id_especialidad: number, nombre: string}>>([])
  const router = useRouter()
  const supabase = createClient()

  // Form state para Cliente
  const [clienteEmail, setClienteEmail] = useState('')
  const [clientePassword, setClientePassword] = useState('')
  const [clienteConfirmPassword, setClienteConfirmPassword] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteApellido, setClienteApellido] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteDNI, setClienteDNI] = useState('')
  const [clienteTipoCliente, setClienteTipoCliente] = useState('Propietario')

  // Form state para Técnico
  const [tecnicoNombre, setTecnicoNombre] = useState('')
  const [tecnicoApellido, setTecnicoApellido] = useState('')
  const [tecnicoEmail, setTecnicoEmail] = useState('')
  const [tecnicoTelefono, setTecnicoTelefono] = useState('')
  const [tecnicoDNI, setTecnicoDNI] = useState('')
  const [tecnicoEspecialidad, setTecnicoEspecialidad] = useState('')
  const [tecnicoDireccion, setTecnicoDireccion] = useState('')

  // Cargar especialidades al montar el componente
  useEffect(() => {
    const fetchEspecialidades = async () => {
      const { data, error } = await supabase
        .from('especialidades')
        .select('id_especialidad, nombre')
        .eq('esta_activa', true)
        .order('nombre')

      if (error) {
        console.error('Error al cargar especialidades:', error)
        toast.error('Error al cargar especialidades')
      } else {
        setEspecialidades(data || [])
      }
    }

    fetchEspecialidades()
  }, [])

  const handleClienteRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (clientePassword !== clienteConfirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (clientePassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: clienteEmail,
        password: clientePassword,
        options: {
          data: {
            nombre: clienteNombre,
            apellido: clienteApellido,
            rol: 'cliente',
            telefono: clienteTelefono,
            dni: clienteDNI,
            tipo_cliente: clienteTipoCliente,
          }
        }
      })

      if (error) {
        const errorMsg = getAuthErrorMessage(error)
        toast.error(errorMsg.title, {
          description: errorMsg.description
        })
        return
      }

      if (data.user) {
        // El trigger handle_new_user() crea automáticamente en usuarios y clientes
        toast.success('Registro exitoso', {
          description: 'Ya puedes iniciar sesión'
        })

        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (error) {
      toast.error('Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleTecnicoRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tecnicoNombre || !tecnicoApellido || !tecnicoEmail) {
      toast.error('Por favor completa los campos requeridos')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('solicitudes_registro')
        .insert({
          nombre: tecnicoNombre,
          apellido: tecnicoApellido,
          email: tecnicoEmail,
          telefono: tecnicoTelefono,
          dni: tecnicoDNI,
          especialidad: tecnicoEspecialidad,
          direccion: tecnicoDireccion,
          estado_solicitud: 'pendiente'
        })

      if (error) {
        const errorMsg = getAuthErrorMessage(error)
        toast.error(errorMsg.title, {
          description: errorMsg.description
        })
        return
      }

      toast.success('Solicitud enviada', {
        description: 'Recibirás un email cuando sea aprobada'
      })

      // Limpiar formulario
      setTecnicoNombre('')
      setTecnicoApellido('')
      setTecnicoEmail('')
      setTecnicoTelefono('')
      setTecnicoDNI('')
      setTecnicoEspecialidad('')
      setTecnicoDireccion('')

      setTimeout(() => {
        router.push('/login')
      }, 3000)

    } catch (error) {
      toast.error('Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Registro</CardTitle>
        <CardDescription>
          Selecciona tu tipo de cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cliente" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cliente">Cliente</TabsTrigger>
            <TabsTrigger value="tecnico">Técnico</TabsTrigger>
          </TabsList>

          {/* TAB CLIENTE */}
          <TabsContent value="cliente">
            <form onSubmit={handleClienteRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente-nombre">Nombre *</Label>
                  <Input
                    id="cliente-nombre"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cliente-apellido">Apellido *</Label>
                  <Input
                    id="cliente-apellido"
                    value={clienteApellido}
                    onChange={(e) => setClienteApellido(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente-email">Email *</Label>
                <Input
                  id="cliente-email"
                  type="email"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente-telefono">Teléfono</Label>
                  <Input
                    id="cliente-telefono"
                    type="tel"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    disabled={loading}
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cliente-dni">DNI</Label>
                  <Input
                    id="cliente-dni"
                    value={clienteDNI}
                    onChange={(e) => setClienteDNI(e.target.value)}
                    disabled={loading}
                    placeholder="12345678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente-tipo">Tipo de Cliente</Label>
                <Select value={clienteTipoCliente} onValueChange={setClienteTipoCliente} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Particular">Particular</SelectItem>
                    <SelectItem value="Empresa">Empresa</SelectItem>
                    <SelectItem value="Propietario">Propietario</SelectItem>
                    <SelectItem value="Inquilino">Inquilino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente-password">Contraseña *</Label>
                <Input
                  id="cliente-password"
                  type="password"
                  value={clientePassword}
                  onChange={(e) => setClientePassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente-confirm">Confirmar Contraseña *</Label>
                <Input
                  id="cliente-confirm"
                  type="password"
                  value={clienteConfirmPassword}
                  onChange={(e) => setClienteConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Registrando...' : 'Registrarse como Cliente'}
              </Button>
            </form>
          </TabsContent>

          {/* TAB TÉCNICO */}
          <TabsContent value="tecnico">
            <form onSubmit={handleTecnicoRegister} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tu solicitud será revisada por un administrador antes de ser aprobada.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tecnico-nombre">Nombre *</Label>
                  <Input
                    id="tecnico-nombre"
                    value={tecnicoNombre}
                    onChange={(e) => setTecnicoNombre(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tecnico-apellido">Apellido *</Label>
                  <Input
                    id="tecnico-apellido"
                    value={tecnicoApellido}
                    onChange={(e) => setTecnicoApellido(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tecnico-email">Email *</Label>
                <Input
                  id="tecnico-email"
                  type="email"
                  value={tecnicoEmail}
                  onChange={(e) => setTecnicoEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tecnico-telefono">Teléfono</Label>
                  <Input
                    id="tecnico-telefono"
                    type="tel"
                    value={tecnicoTelefono}
                    onChange={(e) => setTecnicoTelefono(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tecnico-dni">DNI</Label>
                  <Input
                    id="tecnico-dni"
                    value={tecnicoDNI}
                    onChange={(e) => setTecnicoDNI(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tecnico-especialidad">Especialidad *</Label>
                <Select
                  value={tecnicoEspecialidad}
                  onValueChange={setTecnicoEspecialidad}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {especialidades.map((esp) => (
                      <SelectItem key={esp.id_especialidad} value={esp.nombre}>
                        {esp.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tecnico-direccion">Dirección</Label>
                <Input
                  id="tecnico-direccion"
                  value={tecnicoDireccion}
                  onChange={(e) => setTecnicoDireccion(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
