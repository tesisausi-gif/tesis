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

async function checkAuthUsers() {
  console.log('\n=== Verificando usuarios en auth.users ===\n')

  const { data: { users }, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`✅ Usuarios en auth.users: ${users?.length || 0}\n`)

  if (users && users.length > 0) {
    for (const user of users) {
      console.log(`Email: ${user.email}`)
      console.log(`ID: ${user.id}`)
      console.log(`Metadata:`, user.user_metadata)

      // Verificar rol en tabla usuarios
      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

      console.log(`Rol en tabla usuarios: ${userData?.rol || 'No encontrado'}`)
      console.log('---\n')
    }
  }
}

checkAuthUsers()
