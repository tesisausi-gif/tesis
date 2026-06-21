import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  const file = readFileSync(join(process.cwd(), 'public', 'icon-32.png'))
  return new Response(file, { headers: { 'Content-Type': 'image/png' } })
}
