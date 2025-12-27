# Instrucciones para Solucionar el Problema de Registro de Clientes

## Problema Identificado

Los clientes que se registran desde `/register` no se están agregando a la tabla `clientes` en Supabase.

## Causas Posibles

1. El trigger `on_auth_user_created` no está activo en Supabase
2. La función `handle_new_user()` no está creada
3. El trigger existe pero tiene algún error

## Solución Implementada

Se han realizado los siguientes cambios:

### 1. Actualización del Formulario de Registro

Se actualizó `/app/(auth)/register/page.tsx` para capturar más datos del cliente:
- Teléfono
- DNI
- Tipo de cliente (particular, empresa, propietario, inquilino)

Estos datos ahora se envían en los metadatos del usuario para que el trigger los use al crear el registro en la tabla `clientes`.

### 2. Página de Clientes

Se creó `/app/(admin)/dashboard/clientes/page.tsx` donde puedes:
- Ver todos los clientes registrados
- Crear nuevos clientes manualmente desde el admin
- Ver detalles completos de cada cliente

## Pasos para Verificar y Solucionar

### Paso 1: Verificar el Trigger en Supabase

1. Abre tu proyecto en Supabase
2. Ve a **SQL Editor**
3. Ejecuta el archivo `scripts/verificar_trigger.sql`
4. Revisa los resultados de cada query

### Paso 2: Si el Trigger NO Existe

Si las primeras queries del script de verificación no muestran resultados:

1. Ve a **SQL Editor** en Supabase
2. Ejecuta el script: `scripts/07_trigger_crear_cliente_tecnico.sql`
3. Verifica que se ejecutó sin errores
4. Vuelve a ejecutar `scripts/verificar_trigger.sql` para confirmar

### Paso 3: Crear Registros Faltantes (Si hay usuarios sin cliente)

Si ya tienes usuarios con rol='cliente' pero no tienen registro en la tabla `clientes`:

1. En Supabase SQL Editor
2. Copia y ejecuta la sección #6 del archivo `scripts/verificar_trigger.sql`
3. Este script creará automáticamente los registros de clientes para todos los usuarios existentes

### Paso 4: Probar el Registro

1. Abre tu aplicación en el navegador
2. Ve a `/register`
3. Regístrate como nuevo cliente con todos los datos
4. Verifica en Supabase:
   - Tabla `auth.users` - debe tener el nuevo usuario
   - Tabla `usuarios` - debe tener el nuevo usuario con rol='cliente' y un `id_cliente`
   - Tabla `clientes` - debe tener el nuevo cliente con todos los datos

## Verificación en el Dashboard

1. Inicia sesión como admin
2. Ve a `/dashboard/clientes`
3. Deberías ver todos los clientes registrados

## Estructura del Sistema

```
Registro de Cliente (/register)
    ↓
Crea usuario en auth.users con metadatos
    ↓
TRIGGER: on_auth_user_created
    ↓
FUNCIÓN: handle_new_user()
    ↓
    ├─→ Crea registro en tabla 'clientes'
    └─→ Crea registro en tabla 'usuarios' vinculado al cliente
```

## Archivos Modificados

- ✅ `/app/(auth)/register/page.tsx` - Formulario actualizado
- ✅ `/app/(admin)/dashboard/clientes/page.tsx` - Nueva página de clientes
- ✅ `scripts/verificar_trigger.sql` - Script de verificación
- ✅ `scripts/07_trigger_crear_cliente_tecnico.sql` - Script del trigger (ya existía)

## Próximos Pasos

1. Ejecuta el script de verificación en Supabase
2. Si el trigger no está activo, ejecuta el script del trigger
3. Crea registros faltantes si es necesario
4. Prueba creando un nuevo cliente desde `/register`
5. Verifica en `/dashboard/clientes` que aparece el nuevo cliente

## Soporte

Si después de seguir estos pasos el problema persiste:
- Revisa los logs en Supabase (Authentication → Logs)
- Verifica que las tablas `clientes` y `tecnicos` existan
- Confirma que el Service Role Key está configurado en `.env.local`
