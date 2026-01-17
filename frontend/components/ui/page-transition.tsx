'use client'

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface PageTransitionContextType {
  direction: number
  setRouteOrder: (routes: string[]) => void
}

const PageTransitionContext = createContext<PageTransitionContextType>({
  direction: 0,
  setRouteOrder: () => {},
})

export function usePageTransition() {
  return useContext(PageTransitionContext)
}

interface PageTransitionProviderProps {
  children: ReactNode
  routes: string[]
}

export function PageTransitionProvider({ children, routes }: PageTransitionProviderProps) {
  const pathname = usePathname()
  const [direction, setDirection] = useState(0)
  const prevIndexRef = useRef<number>(-1)
  const routeOrderRef = useRef<string[]>(routes)

  const setRouteOrder = (newRoutes: string[]) => {
    routeOrderRef.current = newRoutes
  }

  useEffect(() => {
    const currentIndex = routeOrderRef.current.findIndex(
      (route) => route === pathname || pathname.startsWith(route + '/')
    )

    if (prevIndexRef.current !== -1 && currentIndex !== -1) {
      setDirection(currentIndex > prevIndexRef.current ? 1 : -1)
    }

    if (currentIndex !== -1) {
      prevIndexRef.current = currentIndex
    }
  }, [pathname])

  return (
    <PageTransitionContext.Provider value={{ direction, setRouteOrder }}>
      {children}
    </PageTransitionContext.Provider>
  )
}

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()
  const { direction } = usePageTransition()

  const variants = {
    initial: (dir: number) => ({
      x: dir === 0 ? 0 : dir > 0 ? '30%' : '-30%',
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-30%' : '30%',
      opacity: 0,
    }),
  }

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={pathname}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
