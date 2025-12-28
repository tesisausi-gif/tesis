const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkUsers() {
  console.log('\n=== Verificando usuarios admin ===\n')

  const { data: users, error } = await supabase
    .from('usuarios')
    .select('id, rol, clientes(nombre, apellido), tecnicos(nombre, apellido)')
    .eq('rol', 'admin')

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`✅ Usuarios admin encontrados: ${users?.length || 0}\n`)

  if (users && users.length > 0) {
    users.forEach((u, i) => {
      const nombre = u.clientes?.nombre || u.tecnicos?.nombre || 'N/A'
      const apellido = u.clientes?.apellido || u.tecnicos?.apellido || 'N/A'
      console.log(`${i + 1}. ID: ${u.id}`)
      console.log(`   Nombre: ${nombre} ${apellido}`)
      console.log(`   Rol: ${u.rol}\n`)
    })
  } else {
    console.log('⚠️  No hay usuarios con rol admin')
  }

  // Mostrar TODOS los usuarios
  console.log('\n=== Todos los usuarios ===\n')
  const { data: allUsers } = await supabase
    .from('usuarios')
    .select('id, rol, clientes(nombre, apellido, correo_electronico), tecnicos(nombre, apellido, correo_electronico)')
    .order('rol')

  if (allUsers && allUsers.length > 0) {
    allUsers.forEach((u, i) => {
      const nombre = u.clientes?.nombre || u.tecnicos?.nombre || 'N/A'
      const apellido = u.clientes?.apellido || u.tecnicos?.apellido || 'N/A'
      const email = u.clientes?.correo_electronico || u.tecnicos?.correo_electronico || 'N/A'
      console.log(`${i + 1}. Rol: ${u.rol}`)
      console.log(`   Nombre: ${nombre} ${apellido}`)
      console.log(`   Email: ${email}`)
      console.log(`   ID: ${u.id}\n`)
    })
  }
}

checkUsers()
