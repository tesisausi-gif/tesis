const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkUsuariosTecnicos() {
  console.log('Verificando usuarios con rol técnico...\n')

  // Check usuarios table
  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('rol', 'tecnico')

  if (usuariosError) {
    console.error('Error checking usuarios:', usuariosError)
    return
  }

  console.log(`Usuarios con rol 'tecnico': ${usuarios?.length || 0}\n`)

  if (usuarios && usuarios.length > 0) {
    for (const usuario of usuarios) {
      console.log(`Usuario: ${usuario.nombre} ${usuario.apellido}`)
      console.log(`  ID Auth: ${usuario.id}`)
      console.log(`  ID Técnico: ${usuario.id_tecnico}`)
      console.log(`  Activo: ${usuario.esta_activo}`)

      // Check if corresponding tecnico exists
      if (usuario.id_tecnico) {
        const { data: tecnico, error: tecnicoError } = await supabase
          .from('tecnicos')
          .select('*')
          .eq('id_tecnico', usuario.id_tecnico)
          .single()

        if (tecnicoError) {
          console.log(`  ⚠️ PROBLEMA: No existe registro en tabla tecnicos`)
        } else if (tecnico) {
          console.log(`  ✓ Registro en tecnicos existe`)
        }
      } else {
        console.log(`  ⚠️ PROBLEMA: No tiene id_tecnico asignado`)
      }
      console.log('')
    }
  }

  // Check tecnicos table
  console.log('\nVerificando tabla tecnicos...\n')
  const { data: tecnicos, error: tecnicosError } = await supabase
    .from('tecnicos')
    .select('*')

  if (tecnicosError) {
    console.error('Error checking tecnicos:', tecnicosError)
    return
  }

  console.log(`Total técnicos en tabla tecnicos: ${tecnicos?.length || 0}`)
}

checkUsuariosTecnicos()
