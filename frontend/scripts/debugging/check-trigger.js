#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTrigger() {
  console.log('🔍 Verificando si el trigger existe...\n')

  // Query para verificar el trigger
  const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_timing
      FROM information_schema.triggers
      WHERE trigger_name = 'on_auth_user_created';
    `
  })

  if (triggerError) {
    console.log('⚠️  No se pudo ejecutar la query directamente.')
    console.log('Intentando método alternativo...\n')

    // Verificar usuarios sin cliente
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, rol, id_cliente')
      .eq('rol', 'cliente')
      .order('fecha_creacion', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error:', error.message)
      return
    }

    console.log('📊 Últimos 10 usuarios con rol="cliente":\n')

    const sinCliente = usuarios.filter(u => !u.id_cliente)
    const conCliente = usuarios.filter(u => u.id_cliente)

    console.log(`✅ Con registro en clientes: ${conCliente.length}`)
    console.log(`❌ Sin registro en clientes: ${sinCliente.length}\n`)

    if (sinCliente.length > 0) {
      console.log('⚠️  PROBLEMA DETECTADO:')
      console.log(`   Hay ${sinCliente.length} usuarios con rol="cliente" que NO tienen registro en la tabla clientes.`)
      console.log('   Esto significa que el trigger NO se está ejecutando.\n')

      console.log('📋 Usuarios sin cliente:')
      sinCliente.forEach(u => {
        console.log(`   - ${u.nombre} ${u.apellido} (ID: ${u.id})`)
      })
    } else {
      console.log('✅ Todos los usuarios clientes tienen registro en la tabla clientes.')
    }

    // Verificar total de clientes
    const { count } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })

    console.log(`\n📊 Total de registros en tabla clientes: ${count}`)
  } else {
    console.log('✅ Trigger encontrado:')
    console.log(triggers)
  }
}

checkTrigger().catch(console.error)
