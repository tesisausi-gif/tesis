import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ISBA - Sistema de Gestión de Incidentes',
    short_name: 'ISBA',
    description: 'Sistema de gestión de incidentes para inmobiliaria ISBA',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    orientation: 'portrait',
    icons: [
      {
        // Ruta real: app/icon-192/route.tsx — SIN extensión .png
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',          // Chrome requiere 'any' para contar el ícono como válido
      },
      {
        // 'any': Chrome lo usa para el ícono de instalación
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // 'maskable': Android lo usa para íconos adaptativos (recorte circular/forma)
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
