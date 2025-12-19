# Scripts SQL - Sistema de Gestión de Incidentes

Esta carpeta contiene todos los scripts SQL necesarios para configurar la base de datos en Supabase.

## Orden de Ejecución

Ejecuta los scripts en el siguiente orden en el **SQL Editor de Supabase**:

### 1. `01_setup_database.sql`
**Propósito:** Crear tabla de usuarios y configurar Row Level Security (RLS)

**Crea:**
- Tabla `usuarios`
- Políticas de seguridad (RLS)
- Triggers para actualización de fechas
- Índices para mejor rendimiento

**Cuándo ejecutar:** Después de crear las tablas principales (clientes, tecnicos, etc.)

---

### 2. `02_setup_solicitudes.sql`
**Propósito:** Crear tabla de solicitudes de registro de técnicos

**Crea:**
- Tabla `solicitudes_registro`
- Políticas de seguridad para solicitudes
- Índices

**Cuándo ejecutar:** Después de ejecutar `01_setup_database.sql`

---

### 3. `03_crear_admin.sql`
**Propósito:** Documentación para crear el usuario administrador

**Notas:**
- Este es un archivo de referencia
- El usuario admin ya fue creado con el script de Node.js
- Email: `admin@isba.com`
- Password: `admin123`

---

### 4. `04_fix_rls_policies.sql`
**Propósito:** Arreglar políticas RLS para evitar recursión infinita

**Soluciona:**
- Error: "infinite recursion detected in policy for relation usuarios"
- Problema: Las políticas consultaban la tabla usuarios para verificar roles, causando loops

**Cambios:**
- Usa JWT metadata en lugar de consultar la tabla usuarios
- Las políticas ahora usan `(auth.jwt()->>'rol')::text = 'admin'`

**Cuándo ejecutar:** Si encuentras errores 500 al consultar la tabla usuarios

---

### 5. `05_insert_existing_users.sql`
**Propósito:** Insertar manualmente usuarios que existen en auth.users pero no en la tabla usuarios

**Inserta:**
- Usuario admin (id: 7739461e-ccbf-4b14-a827-c788eb12c347)
- Cliente 1 (id: 5e09f1d3-4fee-4176-8590-78cc185fdd5b)
- Cliente 2 (id: 85006822-70dd-4ad5-9b78-15ce363f50e0)

**También:**
- Actualiza raw_user_meta_data en auth.users para incluir el rol en JWT

**Cuándo ejecutar:** Solo una vez para backfill de usuarios existentes. No es necesario para nuevos usuarios (ver script 06).

**Nota:** Este script usa `ON CONFLICT (id) DO NOTHING` para ser seguro ejecutarlo múltiples veces.

---

### 6. `06_auto_create_user_trigger.sql` ⭐ **IMPORTANTE**
**Propósito:** Crear trigger automático para sincronizar auth.users con tabla usuarios

**Soluciona:** El problema de que usuarios no se registren automáticamente en la tabla usuarios al hacer signup.

**Crea:**
- Función `public.handle_new_user()` que se ejecuta automáticamente
- Trigger `on_auth_user_created` que se dispara AFTER INSERT en auth.users
- Política RLS actualizada para permitir el INSERT del trigger

**Funcionamiento:**
- Cuando un usuario se registra, el trigger extrae datos de `raw_user_meta_data`
- Crea automáticamente el registro en `public.usuarios`
- Usa valores por defecto: nombre='Usuario', apellido='Nuevo', rol='cliente'

**Cuándo ejecutar:** **OBLIGATORIO** - Ejecutar después de scripts 01-05 para que nuevos usuarios se registren correctamente.

**Verificación:**
```sql
-- Después de ejecutar el trigger, registra un usuario de prueba y verifica:
SELECT * FROM usuarios ORDER BY fecha_creacion DESC LIMIT 5;
```

---

## Cómo Ejecutar los Scripts

1. Ve a tu proyecto Supabase: https://app.supabase.com/project/yaggvkaerloxjjmfxnys
2. En el menú lateral, selecciona **SQL Editor**
3. Click en **New query**
4. Copia y pega el contenido del script
5. Click en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
6. Verifica que se ejecutó correctamente (mensaje de éxito)

## Estado Actual

- ✅ Script 01: `01_setup_database.sql` ejecutado
- ✅ Script 02: `02_setup_solicitudes.sql` ejecutado
- ✅ Script 03: Usuario admin creado (`admin@isba.com` / `admin123`)
- ✅ Script 04: `04_fix_rls_policies.sql` ejecutado (políticas RLS arregladas)
- ✅ Script 05: `05_insert_existing_users.sql` ejecutado (usuarios existentes insertados)
- ⚠️ **PENDIENTE:** Script 06: `06_auto_create_user_trigger.sql` - **CRÍTICO PARA NUEVOS REGISTROS**

## Verificación

Después de ejecutar los scripts, verifica que las tablas fueron creadas:

```sql
-- Ver todas las tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Verificar usuario admin
SELECT * FROM usuarios WHERE rol = 'admin';
```

## Notas Importantes

- Todos los scripts están diseñados para ser **idempotentes** (se pueden ejecutar múltiples veces sin causar errores)
- Usan `CREATE TABLE IF NOT EXISTS` para evitar errores
- Las políticas RLS se eliminan antes de crearse nuevamente si ya existen

## Troubleshooting

**Error: "relation already exists"**
- Es normal si ejecutas el script dos veces
- El script no causará problemas

**Error: "permission denied"**
- Asegúrate de estar usando el SQL Editor en el dashboard de Supabase
- Verifica que tienes permisos de admin en el proyecto

**Error: "column does not exist"**
- Asegúrate de que las tablas base (clientes, tecnicos, etc.) ya existen
- Ejecuta los scripts en orden
