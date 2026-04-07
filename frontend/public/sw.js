/**
 * Service Worker — ISBA PWA
 *
 * Estrategia: Network-first para navegación, shell offline como fallback.
 *
 * Qué NO hace (por diseño):
 * - No cachea llamadas a Supabase ni APIs externas (evita datos desactualizados)
 * - No intercepta requests que no sean navegación de página (mode !== 'navigate')
 * - No cachea assets dinámicos, datos sensibles ni respuestas autenticadas
 *
 * Esto elimina los riesgos de cache incorrecto e interferencia con peticiones de red.
 * El único dato cacheado es la URL raíz "/" como shell offline de emergencia.
 */

const CACHE_NAME = 'isba-shell-v2'

// ─── Instalación: pre-cachear solo el shell raíz ─────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/').catch(() => {}))
  )
  // Activar inmediatamente sin esperar a que cierren las tabs viejas
  self.skipWaiting()
})

// ─── Activación: limpiar caches de versiones anteriores ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => clients.claim())
  )
})

// ─── Fetch: solo intercepta navegación de página ─────────────────────────────
self.addEventListener('fetch', (event) => {
  // Ignorar todo lo que no sea navegación a páginas propias (GET, same-origin, navigate)
  if (
    event.request.method !== 'GET' ||
    event.request.mode !== 'navigate'
  ) return

  // Network-first: intentar la red, fallar silenciosamente al shell cacheado
  event.respondWith(
    fetch(event.request).catch(() => caches.match('/'))
  )
})
