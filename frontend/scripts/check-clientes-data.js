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

async function checkClientes() {
  console.log('🔍 Verificando clientes en la base de datos...\n')

  // Obtener todos los clientes usando service role (sin RLS)
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`📊 Total de clientes: ${clientes?.length || 0}\n`)

  if (clientes && clientes.length > 0) {
    clientes.forEach(c => {
      console.log(`${c.nombre} ${c.apellido}`)
      console.log(`  ID Cliente: ${c.id_cliente}`)
      console.log(`  Email: ${c.correo_electronico}`)
      console.log(`  Activo: ${c.esta_activo}`)
      console.log()
    })
  } else {
    console.log('⚠️  No hay clientes en la base de datos')
  }
}

checkClientes()
