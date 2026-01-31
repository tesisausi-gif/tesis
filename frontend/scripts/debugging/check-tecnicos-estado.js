const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTecnicos() {
  console.log('\n=== Verificando estado de técnicos ===\n')

  const { data: tecnicos, error } = await supabase
    .from('tecnicos')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`✅ Técnicos encontrados: ${tecnicos?.length || 0}\n`)

  if (tecnicos && tecnicos.length > 0) {
    tecnicos.forEach((t, i) => {
      console.log(`${i + 1}. ${t.nombre} ${t.apellido}`)
      console.log(`   ID: ${t.id_tecnico}`)
      console.log(`   Email: ${t.correo_electronico}`)
      console.log(`   Especialidad: ${t.especialidad}`)
      console.log(`   esta_activo: ${t.esta_activo}`)
      console.log(`   Tipo de esta_activo: ${typeof t.esta_activo}`)
      console.log(`   esta_activo === true: ${t.esta_activo === true}`)
      console.log(`   esta_activo === false: ${t.esta_activo === false}`)
      console.log(`   Booleano estricto: ${Boolean(t.esta_activo)}`)
      console.log('---\n')
    })
  }
}

checkTecnicos()
