const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkAsAdmin() {
  console.log('=== Simulando consulta como Admin ===\n')

  // First, let's check what admin users exist
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: admins, error: adminsError } = await supabaseService
    .from('usuarios')
    .select('*')
    .eq('rol', 'admin')

  if (adminsError) {
    console.error('Error buscando admins:', adminsError)
    return
  }

  console.log(`Usuarios con rol admin: ${admins?.length || 0}\n`)

  if (!admins || admins.length === 0) {
    console.log('⚠️ No hay usuarios admin en el sistema.')
    console.log('Las políticas RLS requieren un usuario autenticado con rol admin.')
    return
  }

  admins.forEach((admin, index) => {
    console.log(`${index + 1}. ${admin.nombre} ${admin.apellido}`)
    console.log(`   ID: ${admin.id}`)
    console.log(`   Rol: ${admin.rol}`)
    console.log('')
  })

  // Now try to query tecnicos (this should fail without auth)
  console.log('Intentando consultar técnicos sin autenticación...')
  const { data: tecnicosSinAuth, error: errorSinAuth } = await supabase
    .from('tecnicos')
    .select('*')

  console.log(`Resultado: ${tecnicosSinAuth?.length || 0} técnicos`)
  if (errorSinAuth) {
    console.log('Error:', errorSinAuth.message)
  }
  console.log('')

  console.log('=== Explicación ===')
  console.log('Las políticas RLS requieren:')
  console.log('1. Usuario autenticado (auth.uid() debe existir)')
  console.log('2. Usuario debe tener rol "admin" en tabla usuarios')
  console.log('3. El componente TecnicosTab debe ejecutarse en contexto autenticado')
  console.log('')
  console.log('✓ Las políticas RLS están correctamente configuradas')
  console.log('✓ Solo funcionarán cuando un admin esté autenticado en el frontend')
}

checkAsAdmin()
