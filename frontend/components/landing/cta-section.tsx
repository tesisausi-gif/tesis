import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Wrench, CheckCircle } from 'lucide-react'

export function CTASection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Comienza ahora
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Elige cómo quieres usar la plataforma
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Card Cliente */}
          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Soy Cliente</CardTitle>
              <CardDescription>Reporta incidentes en tus propiedades</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Crea reportes de incidentes
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Sigue el estado en tiempo real
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Califica el servicio recibido
                </li>
              </ul>
              <Button className="w-full" size="lg" asChild>
                <Link href="/register?tipo=cliente">Registrarme como Cliente</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card Técnico */}
          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-orange-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <Wrench className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl">Soy Técnico</CardTitle>
              <CardDescription>Ofrece tus servicios profesionales</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Recibe trabajos según tu especialidad
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Gestiona tus asignaciones
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Construye tu reputación
                </li>
              </ul>
              <Button className="w-full" size="lg" variant="outline" asChild>
                <Link href="/register?tipo=tecnico">Solicitar registro como Técnico</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="mt-10 text-center text-slate-600">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </section>
  )
}
