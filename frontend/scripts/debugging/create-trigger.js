#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

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

async function executeSql(sql) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    }
  )

  if (!response.ok) {
    // Intentar método alternativo usando el Management API
    const dbUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgresql://postgres:')}`
    throw new Error(`No se pudo ejecutar SQL. Status: ${response.status}`)
  }

  return response.json()
}

async function createTrigger() {
  console.log('📝 Creando trigger handle_new_user()...\n')

  const triggerSql = fs.readFileSync(
    path.join(__dirname, '../../scripts/07_trigger_crear_cliente_tecnico.sql'),
    'utf8'
  )

  // Dividir el SQL en statements individuales
  const statements = triggerSql
    .split('-- ============================================')
    .filter(s => s.trim() && !s.trim().startsWith('COMMENT ON'))
    .join('\n')

  console.log('Ejecutando SQL del trigger...\n')

  try {
    // Intentar usando supabase-js directamente
    const { data, error } = await supabase.rpc('exec', { sql: statements })

    if (error) {
      console.log('⚠️  No se pudo usar RPC, usando método alternativo...\n')

      // Ejecutar usando REST API directamente
      await executeSql(statements)
    }

    console.log('✅ Trigger creado exitosamente!\n')
  } catch (error) {
    console.error('❌ Error al crear trigger:', error.message)
    console.log('\n📋 SOLUCIÓN MANUAL:')
    console.log('1. Ve a Supabase Dashboard → SQL Editor')
    console.log('2. Abre el archivo: scripts/07_trigger_crear_cliente_tecnico.sql')
    console.log('3. Copia todo el contenido y pégalo en el SQL Editor')
    console.log('4. Ejecuta el script\n')
    process.exit(1)
  }
}

createTrigger().catch(console.error)
