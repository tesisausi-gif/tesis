# 🔴 SOLUCIÓN ERROR 500 AL REGISTRAR CLIENTE

## Problema
Error 500 (Internal Server Error) al intentar registrar un cliente desde `/register`.

## Causa
El trigger de base de datos no está funcionando correctamente o no existe.

---

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Diagnóstico

Ejecuta este script en Supabase SQL Editor:

**Archivo**: `/scripts/08_diagnostico_trigger.sql`

**Link**: https://app.supabase.com/project/yaggvkaerloxjjmfxnys/sql/new

Esto te mostrará:
- Si el trigger existe
- Si la función existe
- Qué usuarios hay en cada tabla

### Paso 2: Configurar Políticas RLS

**IMPORTANTE**: Las tablas `clientes` y `tecnicos` necesitan políticas RLS que permitan al trigger insertar.

Ejecuta este script:

**Archivo**: `/scripts/10_rls_clientes_tecnicos.sql`

Este script:
- ✅ Configura RLS en tabla `clientes`
- ✅ Configura RLS en tabla `tecnicos`
- ✅ Permite que el trigger (con SECURITY DEFINER) pueda insertar
- ✅ Permite que usuarios vean solo sus datos
- ✅ Permite que admins vean todo

### Paso 3: Instalar Trigger con Manejo de Errores

Ejecuta este script (reemplaza el anterior):

**Archivo**: `/scripts/09_trigger_con_logs.sql`

Este trigger:
- ✅ Tiene mejor manejo de errores
- ✅ Muestra mensajes de log (NOTICE y WARNING)
- ✅ No falla completamente si hay un error en clientes/tecnicos
- ✅ Siempre crea el registro en `usuarios`

### Paso 4: Verificar

Después de ejecutar los 3 scripts, verifica:

```sql
-- 1. Ver que el trigger existe
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 2. Ver que las políticas RLS existen
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('clientes', 'tecnicos');

-- 3. Debe haber al menos 5 políticas por tabla
```

### Paso 5: Probar Registro

1. Ve a `/register`
2. Tab "Cliente"
3. Completa el formulario:
   - Email: `test@test.com`
   - Contraseña: `test123`
   - Nombre: `Test`
   - Apellido: `Usuario`
4. Click en "Registrar"

Si funciona:
- ✅ No debe dar error 500
- ✅ Debe redirigir al login o dashboard
- ✅ Debe crear registros en:
  - `auth.users`
  - `usuarios`
  - `clientes`

### Paso 6: Verificar en BD

```sql
-- Ver el usuario recién creado
SELECT
  u.id,
  u.nombre,
  u.apellido,
  u.rol,
  u.id_cliente,
  c.nombre as nombre_cliente,
  c.correo_electronico
FROM usuarios u
LEFT JOIN clientes c ON u.id_cliente = c.id_cliente
WHERE u.rol = 'cliente'
ORDER BY u.fecha_creacion DESC
LIMIT 1;
```

Debe mostrar:
- ✅ Usuario en tabla `usuarios`
- ✅ `id_cliente` NO debe ser NULL
- ✅ Debe hacer JOIN correctamente con la tabla `clientes`

---

## 🔍 TROUBLESHOOTING

### Error persiste después de ejecutar scripts

**Verifica que ejecutaste EN ORDEN**:
1. Script 10 (RLS) - PRIMERO
2. Script 09 (Trigger) - SEGUNDO
3. Intenta registrar nuevamente

### Ver logs del trigger

Después de intentar registrar, ejecuta:

```sql
-- Ver logs recientes (solo funciona si tienes acceso a logs de Postgres)
-- En Supabase, ve a: Logs → Postgres Logs
```

Busca líneas que contengan:
- `Trigger ejecutado para usuario`
- `Cliente creado con ID`
- `Error al crear cliente`

### Error: "permission denied for table clientes"

**Solución**: El trigger necesita SECURITY DEFINER.

Verifica que la función tenga SECURITY DEFINER:

```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'handle_new_user';
-- prosecdef debe ser 't' (true)
```

Si es 'f' (false), ejecuta nuevamente el script 09.

### Error: "relation clientes does not exist"

**Problema**: La tabla clientes no existe en tu base de datos.

**Solución**: Necesitas crear las tablas base primero. Contacta para obtener los scripts de creación de tablas.

---

## 📋 CHECKLIST DE VERIFICACIÓN

Antes de intentar registrar, verifica:

- [ ] Script 10 ejecutado (Políticas RLS)
- [ ] Script 09 ejecutado (Trigger con logs)
- [ ] Trigger existe: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created'`
- [ ] Función existe: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user'`
- [ ] Políticas RLS existen: `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'clientes'` (debe ser >= 5)
- [ ] Tabla clientes existe: `SELECT * FROM clientes LIMIT 1`
- [ ] Tabla tecnicos existe: `SELECT * FROM tecnicos LIMIT 1`
- [ ] Tabla usuarios existe: `SELECT * FROM usuarios LIMIT 1`

---

## 🆘 SI TODO FALLA

Si después de seguir todos los pasos aún tienes error 500:

1. **Copia el error completo** de la consola del navegador (F12)
2. **Ejecuta el script de diagnóstico** (script 08)
3. **Copia los resultados** de cada consulta
4. **Verifica los logs** en Supabase Dashboard → Logs → Postgres Logs
5. Comparte esta información para diagnosticar el problema específico

---

## 📚 Scripts Creados

1. `08_diagnostico_trigger.sql` - Diagnóstico completo
2. `09_trigger_con_logs.sql` - Trigger con manejo de errores
3. `10_rls_clientes_tecnicos.sql` - Políticas RLS correctas

**Orden de ejecución**:
1. Script 10 (RLS) ← Primero
2. Script 09 (Trigger) ← Segundo
3. Script 08 (Diagnóstico) ← Para verificar
