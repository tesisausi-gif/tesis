#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const email = process.argv[2]

if (!email) {
  console.log('❌ Debes proporcionar un email')
  console.log('\nUso: node scripts/make-user-admin.js <email>')
  console.log('Ejemplo: node scripts/make-user-admin.js usuario@ejemplo.com\n')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function makeAdmin() {
  console.log(`🔍 Buscando usuario con email: ${email}...\n`)

  // Buscar el usuario en auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error al buscar usuarios:', listError.message)
    return
  }

  const authUser = users.find(u => u.email === email)

  if (!authUser) {
    console.log(`❌ No se encontró usuario con email: ${email}`)
    return
  }

  console.log(`✅ Usuario encontrado: ${authUser.email}`)
  console.log(`   ID: ${authUser.id}\n`)

  // Actualizar rol a admin
  const { data, error } = await supabase
    .from('usuarios')
    .update({ rol: 'admin' })
    .eq('id', authUser.id)
    .select()

  if (error) {
    console.error('❌ Error al actualizar rol:', error.message)
    return
  }

  if (data && data.length > 0) {
    console.log('🎉 Usuario actualizado exitosamente!')
    console.log(`   ${data[0].nombre} ${data[0].apellido} ahora es ADMIN\n`)
    console.log('✅ Ahora puedes:')
    console.log('   1. Cerrar sesión')
    console.log('   2. Iniciar sesión nuevamente')
    console.log('   3. Ver todos los clientes en /dashboard/clientes\n')
  } else {
    console.log('⚠️  Usuario no encontrado en tabla usuarios')
  }
}

makeAdmin().catch(console.error)
