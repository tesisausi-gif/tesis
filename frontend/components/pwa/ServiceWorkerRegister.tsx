'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Forzar chequeo de nueva versión del SW en cada carga de página
        registration.update()
      })
      .catch(() => {})

    // Cuando un SW nuevo toma el control (skipWaiting + clients.claim), recargar
    // para que el browser descargue los nuevos bundles de JS/CSS
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  return null
}
