/**
 * Utilidad para la verificación en navegador: crea/elimina un ADMIN temporal
 * (auth.users + public.usuarios) para poder loguear en la app durante pruebas.
 *
 *   npx tsx tests/e2e-usuario-admin-temporal.ts crear
 *   npx tsx tests/e2e-usuario-admin-temporal.ts borrar
 *   npx tsx tests/e2e-usuario-admin-temporal.ts borrar <email-extra>  (borra también ese usuario de prueba)
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: new URL('../.env.local', import.meta.url).pathname, quiet: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const EMAIL = 'e2e.admin.temporal@prueba.com'
const PASSWORD = 'E2eAdmin!2026'

async function borrarPorEmail(email: string) {
  const { data: fila } = await supabase.from('usuarios').select('id, id_cliente, id_tecnico').eq('correo_electronico', email).maybeSingle()
  if (fila) {
    await supabase.from('usuarios').delete().eq('id', fila.id)
    if (fila.id_cliente) await supabase.from('clientes').delete().eq('id_cliente', fila.id_cliente)
    if (fila.id_tecnico) await supabase.from('tecnicos').delete().eq('id_tecnico', fila.id_tecnico)
    try { await supabase.auth.admin.deleteUser(fila.id) } catch { /* puede no existir */ }
    console.log(`🗑️  Usuario ${email} eliminado (auth + tablas públicas)`)
  } else {
    // Por si quedó solo en auth
    const { data: lista } = await supabase.auth.admin.listUsers({ perPage: 200 })
    const u = lista?.users.find(x => x.email === email)
    if (u) { await supabase.auth.admin.deleteUser(u.id); console.log(`🗑️  ${email} eliminado (solo auth)`) }
    else console.log(`(no existe ${email})`)
  }
}

async function main() {
  const accion = process.argv[2]
  if (accion === 'crear') {
    await borrarPorEmail(EMAIL) // idempotente
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL, password: PASSWORD, email_confirm: true,
      user_metadata: { nombre: 'E2E', apellido: 'Admin', rol: 'admin' },
    })
    if (error || !data.user) { console.error('Error creando auth user:', error); process.exit(1) }
    // En la DB actual el trigger AFTER INSERT legacy puede haber creado ya la
    // fila (misma situación que cubre el fix W1): upsert-like.
    const { data: existente } = await supabase.from('usuarios').select('id').eq('id', data.user.id).maybeSingle()
    const { error: e2 } = existente
      ? await supabase.from('usuarios').update({ rol: 'admin', esta_activo: true }).eq('id', data.user.id)
      : await supabase.from('usuarios').insert({
          id: data.user.id, nombre: 'E2E', apellido: 'Admin',
          correo_electronico: EMAIL, rol: 'admin', esta_activo: true,
          fecha_creacion: new Date().toISOString(), fecha_modificacion: new Date().toISOString(),
        })
    if (e2) { console.error('Error creando fila usuarios:', e2); await supabase.auth.admin.deleteUser(data.user.id); process.exit(1) }
    console.log(`✅ Admin temporal listo → ${EMAIL} / ${PASSWORD} (trigger legacy ${existente ? 'ACTIVO en esta DB' : 'ausente'})`)
  } else if (accion === 'borrar') {
    await borrarPorEmail(EMAIL)
    const extra = process.argv[3]
    if (extra) await borrarPorEmail(extra)
  } else {
    console.log('Uso: tsx tests/e2e-usuario-admin-temporal.ts crear|borrar [email-extra]')
    process.exit(1)
  }
}

main()
