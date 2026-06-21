import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  const file = readFileSync(join(process.cwd(), 'public', 'icon-180.png'))
  return new Response(file, { headers: { 'Content-Type': 'image/png' } })
}
