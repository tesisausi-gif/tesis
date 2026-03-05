'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        marginBottom: 16,
        padding: '6px 16px',
        background: '#1d4ed8',
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      Imprimir / Guardar PDF
    </button>
  )
}
