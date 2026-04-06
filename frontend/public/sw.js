// Service Worker — PWA installable en Android y iOS
const CACHE = 'isba-v1'

self.addEventListener('install', (event) => {
  // Cachear la raíz para que Chrome vea que el SW gestiona recursos
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.add('/').catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Solo interceptar navegación (no APIs de Supabase ni assets externos)
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).catch(() => caches.match('/'))
  )
})
