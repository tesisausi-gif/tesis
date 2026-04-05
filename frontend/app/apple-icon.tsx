import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#2563eb',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '36px',
          gap: '4px',
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: '700',
            color: 'white',
            letterSpacing: '-2px',
            lineHeight: 1,
          }}
        >
          ISBA
        </span>
        <span
          style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.8)',
            fontWeight: '400',
            letterSpacing: '1px',
          }}
        >
          INCIDENTES
        </span>
      </div>
    ),
    {
      ...size,
    }
  )
}
