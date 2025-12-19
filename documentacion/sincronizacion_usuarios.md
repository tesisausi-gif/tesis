# Sincronización Automática de Usuarios

## Problema Original

Al registrarse un usuario en el sistema, se creaba correctamente en la tabla `auth.users` (manejada por Supabase Auth), pero **NO** se creaba automáticamente en la tabla `public.usuarios` (nuestra tabla personalizada).

### Síntomas:
- Usuario podía hacer login exitosamente
- Usuario aparecía en Authentication > Users en Supabase Dashboard
- Usuario NO aparecía en la tabla `usuarios` al hacer `SELECT * FROM usuarios`
- Panel de administración mostraba 0 usuarios registrados
- Errores al intentar acceder a datos del usuario (relaciones rotas)

### Causas:
1. Supabase Auth maneja `auth.users` automáticamente
2. Nuestra tabla `public.usuarios` requiere INSERT manual
3. El código frontend hacía signup en auth pero no insertaba en usuarios
4. Las políticas RLS bloqueaban algunos INSERT

## Solución: Trigger de Base de Datos

En lugar de manejar esto desde el código frontend (que puede fallar), implementamos un **trigger a nivel de base de datos** que garantiza la sincronización.

### Archivo: `/scripts/06_auto_create_user_trigger.sql`

Este script crea:

#### 1. Función Trigger: `handle_new_user()`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (
    id,
    nombre,
    apellido,
    rol,
    esta_activo,
    fecha_creacion,
    fecha_modificacion
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente'),
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**¿Qué hace?**
- Se ejecuta automáticamente cada vez que se inserta un registro en `auth.users`
- Extrae datos de `raw_user_meta_data` (donde Supabase guarda el metadata del signup)
- Usa valores por defecto si los datos no existen:
  - `nombre`: 'Usuario' (si no se proporcionó)
  - `apellido`: 'Nuevo' (si no se proporcionó)
  - `rol`: 'cliente' (si no se proporcionó)
- `SECURITY DEFINER`: Ejecuta con permisos del creador, evitando problemas de RLS

#### 2. Trigger: `on_auth_user_created`

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**¿Qué hace?**
- Se dispara DESPUÉS de cada INSERT en `auth.users`
- Ejecuta la función `handle_new_user()` para cada fila nueva
- Es automático, transparente, y garantizado

#### 3. Política RLS Actualizada

```sql
CREATE POLICY "usuarios_insert_policy" ON public.usuarios
  FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    (auth.jwt()->>'rol')::text = 'admin'
  );
```

**¿Qué hace?**
- Permite que el usuario inserte su propio registro (`auth.uid() = id`)
- Permite que admins inserten cualquier registro
- El trigger usa `SECURITY DEFINER` por lo que evita esta verificación

## Flujo de Registro Ahora

### 1. Cliente se registra (Frontend):

```typescript
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      nombre: nombre,
      apellido: apellido,
      rol: 'cliente'
    }
  }
})
```

### 2. Supabase Auth:
- Crea usuario en `auth.users`
- Guarda metadata en `raw_user_meta_data`: `{ nombre, apellido, rol }`

### 3. Trigger se dispara automáticamente:
- Detecta el nuevo INSERT en `auth.users`
- Extrae datos de `raw_user_meta_data`
- Inserta registro correspondiente en `public.usuarios`

### 4. Resultado:
- ✅ Usuario existe en `auth.users`
- ✅ Usuario existe en `public.usuarios`
- ✅ Sincronización garantizada
- ✅ Sin necesidad de scripts manuales

## Backfill de Usuarios Existentes

Para usuarios que ya existían ANTES de implementar el trigger, usa el script:

**`/scripts/05_insert_existing_users.sql`**

Este script:
- Inserta manualmente los 3 usuarios existentes
- Actualiza su `raw_user_meta_data` para incluir el rol en JWT
- Usa `ON CONFLICT DO NOTHING` para ser seguro

## Verificación

### Después de ejecutar el trigger:

```sql
-- 1. Verificar que el trigger existe
SELECT tgname, tgrelid::regclass, tgfoid::regproc
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 2. Verificar que la función existe
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. Registrar un usuario de prueba y verificar
SELECT * FROM usuarios ORDER BY fecha_creacion DESC LIMIT 5;

-- 4. Comparar conteos (deben ser iguales)
SELECT COUNT(*) as auth_users FROM auth.users;
SELECT COUNT(*) as public_users FROM usuarios;
```

## Ventajas de Esta Solución

1. **Automática**: No requiere intervención manual
2. **Garantizada**: A nivel de base de datos, no puede fallar
3. **Transparente**: El código frontend no necesita cambios
4. **Segura**: Usa `SECURITY DEFINER` para evitar problemas de permisos
5. **Mantenible**: Todo centralizado en la base de datos
6. **Resiliente**: Si falla, falla el signup completo (no usuarios huérfanos)

## Troubleshooting

### Problema: Usuario no aparece en tabla usuarios

**Verificar trigger:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Si no existe, ejecuta `/scripts/06_auto_create_user_trigger.sql`

### Problema: Error al registrarse

**Ver logs de la función:**
```sql
-- Verificar que la función no tiene errores de sintaxis
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

### Problema: Usuarios antiguos no aparecen

Ejecuta una sola vez:
```sql
-- Ver en /scripts/05_insert_existing_users.sql
```

## Resumen

| Aspecto | Antes | Después |
|---------|-------|---------|
| Sincronización | Manual / Frontend | Automática / Database |
| Confiabilidad | Puede fallar | Garantizada |
| Mantenimiento | Requiere scripts manuales | Sin intervención |
| Seguridad | Depende de políticas RLS | SECURITY DEFINER bypass |
| Usuarios existentes | Huérfanos | Backfill script disponible |

## Referencias

- **Script del trigger**: `/scripts/06_auto_create_user_trigger.sql`
- **Script de backfill**: `/scripts/05_insert_existing_users.sql`
- **Políticas RLS**: `/scripts/04_fix_rls_policies.sql`
- **Guía de ejecución**: `/documentacion/guia_scripts_sql.md`
