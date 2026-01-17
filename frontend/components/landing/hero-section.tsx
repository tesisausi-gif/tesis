'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { User, Wrench } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl"
        >
          Gestión de Incidentes
          <span className="block text-blue-600">Simplificada</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:mt-6 sm:text-lg md:text-xl"
        >
          Reporta problemas en tu propiedad y conecta con técnicos calificados.
          Seguimiento en tiempo real y resolución eficiente.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4"
        >
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
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-6 text-sm text-slate-500"
        >
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Inicia sesión
          </Link>
        </motion.p>
      </div>
    </section>
  )
}
