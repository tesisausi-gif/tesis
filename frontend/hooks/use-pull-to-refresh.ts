'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PULL_THRESHOLD = 72  // raw px de drag para disparar el refresh
const RESISTANCE     = 0.5 // 0 = sin movimiento, 1 = 1:1 con el dedo

export type PullPhase = 'idle' | 'pulling' | 'ready' | 'refreshing'

export function usePullToRefresh() {
  const router = useRouter()
  const [indicatorH, setIndicatorH] = useState(0)
  const [phase, setPhase]           = useState<PullPhase>('idle')

  const startYRef    = useRef(0)
  const rawDyRef     = useRef(0)
  const isPullingRef = useRef(false)
  const isRefreshRef = useRef(false)

  const doRefresh = useCallback(async () => {
    isRefreshRef.current = true
    setPhase('refreshing')
    setIndicatorH(52)  // altura fija del indicador mientras refresca
    router.refresh()
    await new Promise(r => setTimeout(r, 1000))
    setIndicatorH(0)
    setPhase('idle')
    isRefreshRef.current = false
  }, [router])

  useEffect(() => {
    // Deshabilita el pull-to-refresh nativo del navegador
    document.documentElement.style.overscrollBehaviorY = 'contain'
    return () => { document.documentElement.style.overscrollBehaviorY = '' }
  }, [])

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY !== 0 || isRefreshRef.current) return
      startYRef.current  = e.touches[0].clientY
      rawDyRef.current   = 0
      isPullingRef.current = true
    }

    const onMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshRef.current) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) {
        setIndicatorH(0)
        setPhase('idle')
        return
      }
      rawDyRef.current = dy
      setIndicatorH(Math.min(dy * RESISTANCE, 72))
      setPhase(dy >= PULL_THRESHOLD ? 'ready' : 'pulling')
    }

    const onEnd = () => {
      if (!isPullingRef.current) return
      isPullingRef.current = false
      if (rawDyRef.current >= PULL_THRESHOLD && !isRefreshRef.current) {
        doRefresh()
      } else {
        setIndicatorH(0)
        setPhase('idle')
      }
      rawDyRef.current = 0
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove',  onMove,  { passive: true })
    window.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove',  onMove)
      window.removeEventListener('touchend',   onEnd)
    }
  }, [doRefresh])

  return { indicatorH, phase }
}
