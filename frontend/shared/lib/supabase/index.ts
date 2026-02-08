/**
 * Supabase clients
 *
 * Usar el cliente correcto según el contexto:
 * - server.ts: Para Server Components y Server Actions
 * - client.ts: Para Client Components
 * - middleware.ts: Para el middleware de Next.js
 */

export { createClient as createServerClient } from './server'
export { createClient as createBrowserClient } from './client'
export { updateSession } from './middleware'
