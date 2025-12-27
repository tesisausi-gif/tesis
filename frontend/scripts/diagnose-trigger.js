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

async function diagnose() {
  console.log('🔍 Diagnosticando problema de registro...\n')

  // Intentar crear un usuario de prueba usando service role
  console.log('Intentando crear usuario de prueba directamente...\n')

  const testEmail = `test_${Date.now()}@example.com`

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'test123456',
      email_confirm: true,
      user_metadata: {
        nombre: 'Test',
        apellido: 'Usuario',
        rol: 'cliente',
        telefono: '123456',
        dni: '12345678'
      }
    })

    if (error) {
      console.error('❌ Error al crear usuario:', error)
      console.error('Código:', error.code)
      console.error('Mensaje:', error.message)
      console.error('Detalles:', error.details)
      console.error('Hint:', error.hint)
    } else {
      console.log('✅ Usuario creado exitosamente:', data.user.id)

      // Verificar si se creó en clientes
      const { data: cliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('correo_electronico', testEmail)
        .single()

      if (cliente) {
        console.log('✅ Cliente creado:', cliente.id_cliente)
      } else {
        console.log('❌ Cliente NO fue creado (el trigger no funcionó)')
      }

      // Verificar si se creó en usuarios
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (usuario) {
        console.log('✅ Usuario creado en tabla usuarios:', usuario.id)
      } else {
        console.log('❌ Usuario NO fue creado en tabla usuarios')
      }

      // Limpiar usuario de prueba
      console.log('\nLimpiando usuario de prueba...')
      await supabase.auth.admin.deleteUser(data.user.id)
      if (cliente) {
        await supabase.from('clientes').delete().eq('id_cliente', cliente.id_cliente)
      }
      console.log('✓ Usuario de prueba eliminado')
    }
  } catch (err) {
    console.error('❌ Error inesperado:', err)
  }
}

diagnose()
