'use client'

import { useEffect } from 'react'

export function PrintButton() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('autoprint') === '1') {
      // Pequeño delay para que el contenido termine de renderizar
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <button
      onClick={() => window.print()}
      style={{
        marginBottom: 16,
        padding: '8px 20px',
        background: '#1d4ed8',
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      ⬇ Descargar PDF
    </button>
  )
}
