import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#2563eb',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Sin border-radius para maskable: Android recorta la forma él solo
        }}
      >
        <span
          style={{
            fontSize: 220,
            fontWeight: '700',
            color: 'white',
            letterSpacing: '-8px',
            lineHeight: 1,
          }}
        >
          IS
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
