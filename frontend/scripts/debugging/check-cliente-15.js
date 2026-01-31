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

async function checkCliente15() {
  console.log('🔍 Verificando cliente ID 15...\n')

  // Buscar cliente 15
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('*')
    .eq('id_cliente', 15)
    .single()

  if (clienteError) {
    console.error('❌ Error al buscar cliente:', clienteError)
    return
  }

  console.log('📊 Cliente encontrado:')
  console.log(cliente)
  console.log()

  // Buscar usuario asociado
  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id_cliente', 15)
    .single()

  if (usuarioError) {
    console.error('❌ Error al buscar usuario:', usuarioError.message)
    console.log('\n⚠️  NO existe usuario asociado al cliente 15')

    // Buscar todos los usuarios para ver cuáles tienen id_cliente
    const { data: todosUsuarios } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, rol, id_cliente')
      .order('fecha_creacion', { ascending: false })

    console.log('\n📋 Relaciones cliente-usuario existentes:')
    todosUsuarios?.forEach(u => {
      if (u.id_cliente) {
        console.log(`  Usuario ${u.nombre} ${u.apellido} (${u.rol}) -> Cliente ID: ${u.id_cliente}`)
      }
    })
  } else {
    console.log('✅ Usuario encontrado:')
    console.log(usuario)
  }
}

checkCliente15()
