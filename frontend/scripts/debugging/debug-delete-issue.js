const { createClient } = require('@supabase/supabase-js')

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

async function debugDeleteIssue() {
  console.log('🔍 Verificando relación entre clientes y usuarios...\n')

  // Obtener todos los clientes
  const { data: clientes, error: clientesError } = await supabase
    .from('clientes')
    .select('id_cliente, nombre, apellido')

  if (clientesError) {
    console.error('❌ Error al obtener clientes:', clientesError)
    return
  }

  console.log(`📊 Total de clientes: ${clientes?.length || 0}\n`)

  // Para cada cliente, buscar su usuario asociado
  for (const cliente of clientes || []) {
    console.log(`Cliente: ${cliente.nombre} ${cliente.apellido} (ID: ${cliente.id_cliente})`)

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, rol, id_cliente')
      .eq('id_cliente', cliente.id_cliente)
      .single()

    if (usuarioError) {
      console.log(`  ❌ Error: ${usuarioError.message}`)
    } else if (usuario) {
      console.log(`  ✅ Usuario encontrado: ${usuario.nombre} ${usuario.apellido} (rol: ${usuario.rol})`)
      console.log(`     UUID: ${usuario.id}`)
    } else {
      console.log(`  ⚠️  No se encontró usuario asociado`)
    }
    console.log()
  }
}

debugDeleteIssue()
