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

async function fixRLS() {
  console.log('🔧 Configurando políticas RLS para tabla clientes...\n')

  const sql = `
    -- Eliminar políticas existentes
    DROP POLICY IF EXISTS "Admin y Gestor acceso total" ON public.clientes;
    DROP POLICY IF EXISTS "Clientes ver solo sus datos" ON public.clientes;
    DROP POLICY IF EXISTS "admin_gestor_all_clientes" ON public.clientes;
    DROP POLICY IF EXISTS "clientes_view_own" ON public.clientes;

    -- Habilitar RLS
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

    -- Política 1: Admin y Gestor tienen acceso total
    CREATE POLICY "admin_gestor_all_clientes"
    ON public.clientes
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.rol IN ('admin', 'gestor')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.rol IN ('admin', 'gestor')
      )
    );

    -- Política 2: Clientes solo pueden ver sus propios datos
    CREATE POLICY "clientes_view_own"
    ON public.clientes
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.id_cliente = clientes.id_cliente
      )
    );
  `

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single()

  if (error) {
    console.error('❌ Error al ejecutar SQL:', error)
    console.log('\n⚠️  Intentando enfoque alternativo...\n')

    // Enfoque alternativo: ejecutar cada statement por separado
    try {
      // Nota: Supabase JS no permite ejecutar SQL directamente por seguridad
      // Debemos usar la API REST o el dashboard
      console.log('📋 Por favor ejecuta este SQL en el dashboard de Supabase:\n')
      console.log(sql)
    } catch (e) {
      console.error('Error:', e)
    }
  } else {
    console.log('✅ Políticas RLS configuradas correctamente')
  }
}

fixRLS()
