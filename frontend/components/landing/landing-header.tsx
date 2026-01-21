'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Wrench } from 'lucide-react'

export function LandingHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm"
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:h-16">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 sm:h-9 sm:w-9">
            <Wrench className="h-4 w-4 text-white sm:h-5 sm:w-5" />
          </div>
          <span className="text-lg font-bold text-slate-900 sm:text-xl">Gestión de Incidentes</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
          <Button variant="ghost" size="sm" className="sm:hidden" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Registrarse</Link>
          </Button>
        </nav>
      </div>
    </motion.header>
  )
}
