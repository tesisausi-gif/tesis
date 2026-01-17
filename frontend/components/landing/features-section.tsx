'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Clock, UserCheck, LayoutDashboard } from 'lucide-react'

const features = [
  {
    icon: AlertCircle,
    title: 'Reporta Incidentes Fácilmente',
    description: 'Crea reportes detallados con fotos y descripción. El proceso es rápido y sencillo.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Clock,
    title: 'Seguimiento en Tiempo Real',
    description: 'Monitorea el estado de tus incidentes. Recibe notificaciones de cada actualización.',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: UserCheck,
    title: 'Técnicos Calificados',
    description: 'Contamos con profesionales especializados en distintas áreas para resolver tu problema.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    icon: LayoutDashboard,
    title: 'Panel de Administración',
    description: 'Gestiona propiedades, técnicos e incidentes desde un único lugar centralizado.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
}

export function FeaturesSection() {
  return (
    <section className="bg-slate-50 py-16 md:py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
            Todo lo que necesitas
          </h2>
          <p className="mt-3 text-base text-slate-600 sm:mt-4 sm:text-lg">
            Una plataforma completa para la gestión de incidentes
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                <CardContent className="pt-6">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${feature.bgColor}`}>
                    <feature.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${feature.color}`} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 sm:text-lg">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
