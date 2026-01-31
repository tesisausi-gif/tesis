const { createClient } = require('@supabase/supabase-js')
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

async function checkInmuebles() {
  console.log('🔍 Verificando tabla inmuebles...\n')

  // Intentar consultar la nueva tabla
  const { data: inmuebles, error } = await supabase
    .from('inmuebles')
    .select('*')
    .limit(5)

  if (error) {
    console.error('❌ Error al consultar inmuebles:', error.message)
    console.log('\n📋 La tabla aún se llama "propiedades". Necesitamos aplicar la migración.')
    return
  }

  console.log('✅ Tabla "inmuebles" existe!')
  console.log(`📊 Total encontrados: ${inmuebles?.length || 0}\n`)

  if (inmuebles && inmuebles.length > 0) {
    console.log('Ejemplo de inmueble:')
    console.log(inmuebles[0])
    console.log('\nColumnas:', Object.keys(inmuebles[0]))
  }
}

checkInmuebles()
