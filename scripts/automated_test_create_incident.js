const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv(envPath) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\n/).filter(Boolean);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) {
      env[m[1].trim()] = m[2].trim();
    }
  }
  return env;
}

(async () => {
  try {
    const envPath = path.join(__dirname, '..', 'frontend', '.env.local');
    const env = loadEnv(envPath);
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      console.error('Missing SUPABASE env in', envPath);
      process.exit(2);
    }

    const supabase = createClient(supabaseUrl, anonKey);

    // Create a unique test incident
    const unique = 'test-' + Date.now();
    const descripcion = `Automated test incident ${unique}`;

    console.log('Inserting incident...');
    const { data: insertData, error: insertError } = await supabase
      .from('incidentes')
      .insert({
        id_propiedad: 1,
        id_cliente_reporta: 1,
        descripcion_problema: descripcion,
        categoria: null,
        estado_actual: 'pendiente',
        disponibilidad: 'Lunes 9-12 (test)'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      process.exit(3);
    }

    console.log('Inserted id_incidente=', insertData.id_incidente);

    // Read back the incident
    const { data: readData, error: readError } = await supabase
      .from('incidentes')
      .select('id_incidente, descripcion_problema, categoria, estado_actual')
      .eq('id_incidente', insertData.id_incidente)
      .single();

    if (readError) {
      console.error('Read error:', readError);
      process.exit(4);
    }

    console.log('Read incident:', readData);

    if (readData.categoria !== null) {
      console.error('Validation failed: categoria is not null:', readData.categoria);
      process.exit(5);
    }

    console.log('Validation OK: categoria is null');

    // Cleanup: delete the test incident
    const { error: delError } = await supabase
      .from('incidentes')
      .delete()
      .eq('id_incidente', insertData.id_incidente);

    if (delError) {
      console.error('Cleanup delete error:', delError);
      process.exit(6);
    }

    console.log('Cleanup done. Test succeeded.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();
