/**
 * Script para crear el usuario administrador inicial
 * Ejecutar con: npx tsx scripts/create-admin.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function createAdminUser() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔧 Creando usuario administrador...')

  // Datos del admin
  const adminEmail = 'admin@isba.com'
  const adminPassword = 'admin123'

  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        nombre: 'Administrador',
        apellido: 'Sistema',
        rol: 'admin'
      }
    })

    if (authError) {
      console.error('❌ Error al crear usuario en Auth:', authError.message)
      return
    }

    console.log('✅ Usuario creado en Auth con ID:', authData.user.id)

    // 2. Crear registro en tabla usuarios
    const { error: userError } = await supabase
      .from('usuarios')
      .insert({
        id: authData.user.id,
        nombre: 'Administrador',
        apellido: 'Sistema',
        rol: 'admin',
        esta_activo: true
      })

    if (userError) {
      console.error('⚠️  Error al crear registro en tabla usuarios:', userError.message)
      console.log('ℹ️  El usuario fue creado en Auth pero no en la tabla usuarios.')
      console.log('ℹ️  Asegúrate de que la tabla usuarios existe.')
    } else {
      console.log('✅ Registro creado en tabla usuarios')
    }

    console.log('\n🎉 Usuario administrador creado exitosamente!')
    console.log('📧 Email: admin@isba.com')
    console.log('🔑 Password: admin123')
    console.log('\n⚠️  IMPORTANTE: Cambia esta contraseña después del primer login')

  } catch (error) {
    console.error('❌ Error inesperado:', error)
  }
}

createAdminUser()
