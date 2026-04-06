// Minimal Service Worker — enables PWA installability and standalone mode
const CACHE = 'isba-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Pass-through: no offline caching, just satisfy Chrome's SW requirement
  event.respondWith(fetch(event.request))
})
