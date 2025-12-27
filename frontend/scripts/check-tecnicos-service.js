const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

// Try with service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('=== Verificando configuración ===')
console.log('URL:', supabaseUrl ? '✓ Configurado' : '✗ No configurado')
console.log('Service Key:', serviceKey ? '✓ Configurado' : '✗ No configurado')
console.log('Anon Key:', anonKey ? '✓ Configurado' : '✗ No configurado')
console.log('')

async function checkWithKey(keyType, key) {
  console.log(`\n=== Consultando con ${keyType} ===\n`)

  const supabase = createClient(supabaseUrl, key)

  const { data, error, count } = await supabase
    .from('tecnicos')
    .select('*', { count: 'exact' })
    .order('fecha_creacion', { ascending: false })

  if (error) {
    console.error(`Error con ${keyType}:`, error)
    return
  }

  console.log(`Total de técnicos encontrados: ${data?.length || 0}`)
  console.log(`Count: ${count}`)

  if (data && data.length > 0) {
    console.log('\nTécnicos:')
    data.forEach((tecnico, index) => {
      console.log(`\n${index + 1}. ${tecnico.nombre} ${tecnico.apellido}`)
      console.log(`   ID: ${tecnico.id_tecnico}`)
      console.log(`   Email: ${tecnico.correo_electronico}`)
      console.log(`   Activo: ${tecnico.esta_activo}`)
      console.log(`   Especialidad: ${tecnico.especialidad || 'N/A'}`)
    })
  } else {
    console.log('No se encontraron técnicos.')
  }
}

async function run() {
  // Try with anon key first
  await checkWithKey('ANON KEY', anonKey)

  // Try with service role key if available
  if (serviceKey) {
    await checkWithKey('SERVICE ROLE KEY', serviceKey)
  }
}

run()
