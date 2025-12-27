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

async function createMissingClients() {
  console.log('🔧 Creando registros faltantes en tabla clientes...\n')

  // Obtener usuarios sin cliente
  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuarios')
    .select('id, nombre, apellido, rol, id_cliente')
    .eq('rol', 'cliente')
    .is('id_cliente', null)

  if (usuariosError) {
    console.error('❌ Error al obtener usuarios:', usuariosError.message)
    return
  }

  if (usuarios.length === 0) {
    console.log('✅ No hay usuarios sin cliente. Todo está en orden!')
    return
  }

  console.log(`📋 Encontrados ${usuarios.length} usuarios sin cliente:\n`)

  // Para cada usuario, necesitamos obtener el email de auth.users
  for (const usuario of usuarios) {
    console.log(`   Procesando: ${usuario.nombre} ${usuario.apellido}...`)

    // Obtener email del auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(usuario.id)

    if (authError || !authUser.user) {
      console.log(`   ⚠️  No se pudo obtener email para usuario ${usuario.id}`)
      continue
    }

    const email = authUser.user.email

    // Crear registro en clientes (probando con diferentes valores de tipo_cliente)
    let cliente, clienteError

    // Intentar con diferentes formatos de tipo_cliente
    const tiposAIntentar = ['Propietario', 'PROPIETARIO', 'propietario', 'Particular']

    for (const tipo of tiposAIntentar) {
      const result = await supabase
        .from('clientes')
        .insert({
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          correo_electronico: email,
          tipo_cliente: tipo
        })
        .select()
        .single()

      if (!result.error) {
        cliente = result.data
        clienteError = null
        break
      }
      clienteError = result.error
    }

    if (clienteError) {
      console.log(`   ❌ Error al crear cliente: ${clienteError.message}`)
      continue
    }

    // Actualizar usuario con id_cliente
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ id_cliente: cliente.id_cliente })
      .eq('id', usuario.id)

    if (updateError) {
      console.log(`   ⚠️  Cliente creado pero no se pudo actualizar usuario: ${updateError.message}`)
    } else {
      console.log(`   ✅ Cliente creado (ID: ${cliente.id_cliente})`)
    }
  }

  console.log('\n🎉 Proceso completado!\n')

  // Verificar resultado final
  const { data: verificacion } = await supabase
    .from('usuarios')
    .select('id, nombre, apellido, id_cliente')
    .eq('rol', 'cliente')
    .is('id_cliente', null)

  const { count } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Resumen:`)
  console.log(`   Total de clientes en BD: ${count}`)
  console.log(`   Usuarios sin cliente: ${verificacion?.length || 0}\n`)
}

createMissingClients().catch(console.error)
