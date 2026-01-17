'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Wrench, CheckCircle } from 'lucide-react'

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
}

export function CTASection() {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
            Comienza ahora
          </h2>
          <p className="mt-3 text-base text-slate-600 sm:mt-4 sm:text-lg">
            Elige cómo quieres usar la plataforma
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:mt-12 md:grid-cols-2 md:gap-8 max-w-4xl mx-auto">
          {/* Card Cliente */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 hover:border-blue-200">
              <CardHeader className="text-center pb-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 sm:mb-4 sm:h-16 sm:w-16"
                >
                  <User className="h-7 w-7 text-blue-600 sm:h-8 sm:w-8" />
                </motion.div>
                <CardTitle className="text-xl sm:text-2xl">Soy Cliente</CardTitle>
                <CardDescription>Reporta incidentes en tus propiedades</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6 sm:space-y-3">
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                    Crea reportes de incidentes
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                    Sigue el estado en tiempo real
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                    Califica el servicio recibido
                  </li>
                </ul>
                <Button className="w-full" size="lg" asChild>
                  <Link href="/register?tipo=cliente">Registrarme como Cliente</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card Técnico */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 hover:border-orange-200">
              <CardHeader className="text-center pb-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 sm:mb-4 sm:h-16 sm:w-16"
                >
                  <Wrench className="h-7 w-7 text-orange-600 sm:h-8 sm:w-8" />
                </motion.div>
                <CardTitle className="text-xl sm:text-2xl">Soy Técnico</CardTitle>
                <CardDescription>Ofrece tus servicios profesionales</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6 sm:space-y-3">
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                    Recibe trabajos según tu especialidad
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                    Gestiona tus asignaciones
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                    Construye tu reputación
                  </li>
                </ul>
                <Button className="w-full" size="lg" variant="outline" asChild>
                  <Link href="/register?tipo=tecnico">Solicitar registro como Técnico</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-center text-slate-600 sm:mt-10"
        >
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Inicia sesión aquí
          </Link>
        </motion.p>
      </div>
    </section>
  )
}
