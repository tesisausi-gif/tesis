const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debug() {
  console.log('\n=== Verificando solicitudes_registro ===\n')

  // Verificar si hay solicitudes
  const { data: solicitudes, error: solError } = await supabase
    .from('solicitudes_registro')
    .select('*')
    .order('fecha_solicitud', { ascending: false })

  if (solError) {
    console.error('❌ Error al obtener solicitudes:', solError)
  } else {
    console.log(`✅ Solicitudes encontradas: ${solicitudes?.length || 0}`)
    if (solicitudes && solicitudes.length > 0) {
      console.log('\nÚltimas 3 solicitudes:')
      solicitudes.slice(0, 3).forEach((s, i) => {
        console.log(`\n${i + 1}. ${s.nombre} ${s.apellido}`)
        console.log(`   Email: ${s.email}`)
        console.log(`   Estado: ${s.estado_solicitud}`)
        console.log(`   Fecha: ${s.fecha_solicitud}`)
      })
    }
  }

  // Verificar políticas RLS
  console.log('\n=== Verificando políticas RLS ===\n')
  const { data: policies, error: polError } = await supabase
    .rpc('exec_sql', {
      query: `SELECT schemaname, tablename, policyname, permissive, roles, cmd
              FROM pg_policies
              WHERE tablename = 'solicitudes_registro';`
    })
    .catch(async () => {
      // Si no funciona con RPC, usar una consulta directa
      return await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'solicitudes_registro')
    })

  if (!polError && policies) {
    console.log(`✅ Políticas encontradas: ${policies?.length || 0}`)
    console.log(policies)
  }

  console.log('\n')
}

debug()
