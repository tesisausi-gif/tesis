const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSolicitudes() {
  console.log('Checking solicitudes_registro...\n')

  const { data, error } = await supabase
    .from('solicitudes_registro')
    .select('*')
    .order('fecha_solicitud', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${data?.length || 0} solicitudes:`)
  console.log(JSON.stringify(data, null, 2))
}

checkSolicitudes()
