const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkTecnicos() {
  console.log('Verificando técnicos en la base de datos...\n')

  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Total de técnicos encontrados: ${data?.length || 0}\n`)

  if (data && data.length > 0) {
    data.forEach((tecnico, index) => {
      console.log(`${index + 1}. ${tecnico.nombre} ${tecnico.apellido}`)
      console.log(`   ID: ${tecnico.id_tecnico}`)
      console.log(`   Email: ${tecnico.correo_electronico}`)
      console.log(`   Activo: ${tecnico.esta_activo}`)
      console.log(`   Especialidad: ${tecnico.especialidad || 'N/A'}`)
      console.log('')
    })
  } else {
    console.log('No se encontraron técnicos en la base de datos.')
  }
}

checkTecnicos()
