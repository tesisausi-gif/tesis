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

async function checkAdminRole() {
  console.log('🔍 Verificando usuarios administradores...\n')

  // Obtener todos los usuarios
  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('id, nombre, apellido, rol')
    .order('fecha_creacion', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log('📊 Usuarios en el sistema:\n')
  usuarios?.forEach(u => {
    console.log(`${u.nombre} ${u.apellido}`)
    console.log(`  ID: ${u.id}`)
    console.log(`  Rol: ${u.rol}`)
    console.log()
  })

  const admins = usuarios?.filter(u => u.rol === 'admin')
  console.log(`\n✅ Total de administradores: ${admins?.length || 0}`)
}

checkAdminRole()
