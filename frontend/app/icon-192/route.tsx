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
          borderRadius: '44px',
        }}
      >
        <span
          style={{
            fontSize: 86,
            fontWeight: '700',
            color: 'white',
            letterSpacing: '-3px',
            lineHeight: 1,
          }}
        >
          IS
        </span>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
