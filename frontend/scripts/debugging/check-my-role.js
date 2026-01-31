#!/usr/bin/env node

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

async function checkUserRole() {
  console.log('🔍 Verificando usuarios admin...\n')

  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('id, nombre, apellido, rol')
    .order('fecha_creacion')

  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  console.log('📊 Todos los usuarios:\n')
  usuarios.forEach(u => {
    const badge = u.rol === 'admin' ? '👑' : u.rol === 'gestor' ? '📋' : u.rol === 'tecnico' ? '🔧' : '👤'
    console.log(`${badge} ${u.nombre} ${u.apellido} - Rol: ${u.rol}`)
  })

  const admins = usuarios.filter(u => u.rol === 'admin')
  console.log(`\n✅ Total de admins: ${admins.length}`)

  if (admins.length === 0) {
    console.log('\n⚠️  NO HAY USUARIOS ADMIN!')
    console.log('Para ver los clientes necesitas un usuario con rol="admin"\n')
    console.log('Opciones:')
    console.log('1. Crear un nuevo usuario admin desde /dashboard/usuarios')
    console.log('2. O actualiza tu usuario actual ejecutando:')
    console.log('   node scripts/make-me-admin.js')
  }
}

checkUserRole().catch(console.error)
