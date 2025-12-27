#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function verifyRLS() {
  console.log('🔍 Verificación Final de RLS...\n')

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. Verificar que hay clientes
  const { data: clientes, error: clientesError } = await supabaseAdmin
    .from('clientes')
    .select('*')

  console.log(`1️⃣ Clientes en BD: ${clientes?.length || 0}`)
  if (clientesError) {
    console.log('   ❌ Error:', clientesError.message)
  }

  // 2. Verificar usuarios admin
  const { data: admins, error: adminsError } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, apellido, rol')
    .eq('rol', 'admin')

  console.log(`\n2️⃣ Usuarios Admin: ${admins?.length || 0}`)
  if (admins && admins.length > 0) {
    admins.forEach(a => console.log(`   👑 ${a.nombre} ${a.apellido} (${a.id})`))
  }

  // 3. Simular autenticación como admin
  if (admins && admins.length > 0) {
    const adminId = admins[0].id

    console.log(`\n3️⃣ Simulando query como usuario admin (${admins[0].nombre})...`)

    // Crear un cliente simulando ser el admin
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Intentar obtener clientes sin autenticación
    const { data: sinAuth, error: errorSinAuth } = await supabaseUser
      .from('clientes')
      .select('*')

    console.log(`   Sin auth: ${sinAuth?.length || 0} clientes`)
    if (errorSinAuth) {
      console.log(`   Error: ${errorSinAuth.message}`)
    }
  }

  console.log('\n📋 RESUMEN:')
  console.log(`   ✅ Clientes en BD: ${clientes?.length || 0}`)
  console.log(`   ✅ Admins en BD: ${admins?.length || 0}`)
  console.log('\n💡 IMPORTANTE:')
  console.log('   Para ver los clientes necesitas:')
  console.log('   1. Estar autenticado como admin')
  console.log('   2. Las políticas RLS deben permitir acceso a admin')
  console.log('   3. Verifica la consola del navegador en /dashboard/clientes\n')
}

verifyRLS().catch(console.error)
