import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { User, Wrench } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
          Gestión de Incidentes
          <span className="block text-blue-600">Simplificada</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 md:text-xl">
          Reporta problemas en tu propiedad y conecta con técnicos calificados.
          Seguimiento en tiempo real y resolución eficiente.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="w-full sm:w-auto gap-2" asChild>
            <Link href="/register?tipo=cliente">
              <User className="h-5 w-5" />
              Soy Cliente
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" asChild>
            <Link href="/register?tipo=tecnico">
              <Wrench className="h-5 w-5" />
              Soy Técnico
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </section>
  )
}
