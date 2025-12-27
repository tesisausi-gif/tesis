#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Cliente con SERVICE ROLE (ve todo, sin RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Cliente con ANON KEY (respeta RLS, como el navegador)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugRLS() {
  console.log('🔍 Verificando políticas RLS...\n')

  // 1. Verificar con SERVICE ROLE (debe ver todos)
  console.log('1️⃣ Query con SERVICE ROLE KEY (sin RLS):')
  const { data: adminData, error: adminError } = await supabaseAdmin
    .from('clientes')
    .select('*')

  if (adminError) {
    console.log('   ❌ Error:', adminError.message)
  } else {
    console.log(`   ✅ Encontrados ${adminData.length} clientes\n`)
  }

  // 2. Verificar con ANON KEY sin autenticar (no debe ver nada)
  console.log('2️⃣ Query con ANON KEY sin autenticar (con RLS):')
  const { data: anonData, error: anonError } = await supabaseAnon
    .from('clientes')
    .select('*')

  if (anonError) {
    console.log('   ❌ Error:', anonError.message)
  } else {
    console.log(`   ⚠️  Encontrados ${anonData.length} clientes (debería ser 0)\n`)
  }

  // 3. Buscar el usuario admin
  console.log('3️⃣ Buscando usuario admin...')
  const { data: adminUser } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('rol', 'admin')
    .limit(1)
    .single()

  if (adminUser) {
    console.log(`   ✅ Admin encontrado: ${adminUser.nombre} ${adminUser.apellido}`)
    console.log(`   ID: ${adminUser.id}\n`)

    // 4. Verificar políticas RLS
    console.log('4️⃣ Verificando si RLS está habilitado en clientes...')
    const { data: rlsCheck } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        SELECT relrowsecurity as rls_enabled
        FROM pg_class
        WHERE relname = 'clientes';
      `
    }).catch(() => ({ data: null }))

    if (rlsCheck) {
      console.log('   RLS Info:', rlsCheck)
    }

    console.log('\n5️⃣ Listando políticas RLS en tabla clientes:')
    const { data: policies } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
        FROM pg_policies
        WHERE tablename = 'clientes';
      `
    }).catch(() => ({ data: null }))

    if (policies) {
      console.log(policies)
    } else {
      console.log('   No se pudo obtener info de políticas vía RPC')
    }
  }

  console.log('\n📋 RESUMEN:')
  console.log(`   - Clientes en BD (service role): ${adminData?.length || 0}`)
  console.log(`   - Clientes visibles (anon key): ${anonData?.length || 0}`)
  console.log('\n💡 SOLUCIÓN:')
  console.log('   Si ves clientes con service role pero no con anon key,')
  console.log('   el problema son las políticas RLS.')
  console.log('   Abre la consola del navegador en /dashboard/clientes')
  console.log('   y revisa si hay errores en la consola.\n')
}

debugRLS().catch(console.error)
