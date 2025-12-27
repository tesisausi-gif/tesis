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

async function checkStructure() {
  console.log('🔍 Verificando estructura de tablas...\n')

  // Obtener un cliente de ejemplo para ver la estructura
  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .limit(1)

  console.log('📊 Estructura tabla CLIENTES (ejemplo):')
  if (clientes && clientes[0]) {
    console.log(Object.keys(clientes[0]))
    console.log('\nDatos de ejemplo:')
    console.log(clientes[0])
  }
  console.log()

  // Obtener un usuario de ejemplo
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('*')
    .limit(1)

  console.log('📊 Estructura tabla USUARIOS (ejemplo):')
  if (usuarios && usuarios[0]) {
    console.log(Object.keys(usuarios[0]))
    console.log('\nDatos de ejemplo:')
    console.log(usuarios[0])
  }
  console.log()

  // Intentar insertar directamente en clientes para ver el error exacto
  console.log('🧪 Probando inserción directa en tabla clientes...\n')

  const { data: insertData, error: insertError } = await supabase
    .from('clientes')
    .insert({
      nombre: 'Test',
      apellido: 'Insert',
      correo_electronico: 'test_insert@example.com',
      telefono: '123456',
      dni: '12345678',
      esta_activo: true,
      fecha_creacion: new Date().toISOString(),
      fecha_modificacion: new Date().toISOString()
    })
    .select()

  if (insertError) {
    console.error('❌ Error al insertar en clientes:', insertError)
  } else {
    console.log('✅ Inserción directa exitosa:', insertData)
    // Limpiar
    if (insertData && insertData[0]) {
      await supabase.from('clientes').delete().eq('id_cliente', insertData[0].id_cliente)
      console.log('✓ Registro de prueba eliminado')
    }
  }
}

checkStructure()
