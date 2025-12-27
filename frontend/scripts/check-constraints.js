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

async function checkConstraints() {
  console.log('🔍 Verificando constraints y relaciones...\n')

  // Ver la estructura de la tabla usuarios
  const { data: usuarios_info, error: e1 } = await supabase
    .from('usuarios')
    .select('*')
    .limit(1)

  console.log('📊 Estructura tabla usuarios:', usuarios_info?.[0])
  console.log()

  // Intentar ver las foreign keys usando una query
  console.log('📋 Revisando relaciones entre tablas...\n')
  console.log('Necesitamos verificar:')
  console.log('1. ¿usuarios.id_cliente -> clientes.id_cliente tiene ON DELETE?')
  console.log('2. ¿usuarios.id -> auth.users.id tiene ON DELETE CASCADE?')
  console.log()

  // Probar eliminación con un cliente de prueba
  console.log('Para verificar el comportamiento actual, vamos a revisar qué pasa al eliminar...')
}

checkConstraints()
