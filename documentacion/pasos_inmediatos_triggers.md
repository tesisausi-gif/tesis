# ⚠️ PASOS PENDIENTES - SISTEMA MULTI-ROL

## 🎯 Estado Actual del Proyecto

El sistema ahora tiene:
- ✅ Autenticación por roles (admin, gestor, cliente, técnico)
- ✅ Vistas separadas por rol
- ✅ Routing automático según rol
- ✅ Sincronización automática de tablas

## 📋 SIGUIENTE PASO CRÍTICO

### 🔴 Ejecutar Script de Trigger Mejorado

**Problema**: El sistema necesita crear automáticamente registros en `clientes` y `tecnicos` cuando se registra un usuario.

**Solución**: Ejecutar el nuevo trigger que maneja la creación completa.

---

## 1️⃣ EJECUTAR SCRIPT 07

### Ve a Supabase SQL Editor
🔗 https://app.supabase.com/project/yaggvkaerloxjjmfxnys/sql/new

### Copia el contenido del archivo:
📄 `/scripts/07_trigger_crear_cliente_tecnico.sql`

Este script reemplaza el trigger anterior con uno mejorado que:
- Crea registro en `usuarios` (siempre)
- Crea registro en `clientes` (cuando rol='cliente')
- Crea registro en `tecnicos` (cuando rol='tecnico')
- Vincula correctamente `id_cliente` e `id_tecnico` en `usuarios`

### Pega en el SQL Editor y ejecuta

### Verifica la ejecución

```sql
-- Verificar que la función actualizada existe
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Debe mostrar el código del trigger mejorado
```

---

## 2️⃣ PROBAR EL SISTEMA COMPLETO

### Prueba 1: Registro de Cliente

1. Ve a `/register`
2. Tab "Cliente"
3. Completa:
   - Email: `cliente.test@mail.com`
   - Contraseña: `test123`
   - Nombre: `Cliente`
   - Apellido: `Prueba`
4. Registrar
5. Login con esas credenciales
6. **Verifica**: Debe redirigir a `/cliente`
7. **Verifica en DB**:
   ```sql
   -- Debe existir en auth.users
   SELECT id, email FROM auth.users WHERE email = 'cliente.test@mail.com';

   -- Debe existir en clientes
   SELECT * FROM clientes WHERE correo_electronico = 'cliente.test@mail.com';

   -- Debe existir en usuarios con id_cliente vinculado
   SELECT u.*, c.nombre as cliente_nombre
   FROM usuarios u
   LEFT JOIN clientes c ON u.id_cliente = c.id_cliente
   WHERE u.rol = 'cliente'
   ORDER BY u.fecha_creacion DESC LIMIT 1;
   ```

### Prueba 2: Solicitud de Técnico

1. Ve a `/register`
2. Tab "Técnico"
3. Completa todos los campos:
   - Email: `tecnico.test@mail.com`
   - Nombre: `Técnico`
   - Apellido: `Prueba`
   - Teléfono: `1234567890`
   - DNI: `12345678`
   - Dirección: `Calle Falsa 123`
   - Especialidad: `plomería`
4. Enviar solicitud
5. **Login como admin** (`admin@isba.com` / `admin123`)
6. Ve a `/dashboard/solicitudes`
7. Aprueba la solicitud con contraseña: `test123`
8. **Logout y login como técnico** (`tecnico.test@mail.com` / `test123`)
9. **Verifica**: Debe redirigir a `/tecnico`
10. **Verifica en DB**:
    ```sql
    -- Debe existir en tecnicos
    SELECT * FROM tecnicos WHERE correo_electronico = 'tecnico.test@mail.com';

    -- Debe existir en usuarios con id_tecnico vinculado
    SELECT u.*, t.nombre as tecnico_nombre, t.especialidad
    FROM usuarios u
    LEFT JOIN tecnicos t ON u.id_tecnico = t.id_tecnico
    WHERE u.rol = 'tecnico'
    ORDER BY u.fecha_creacion DESC LIMIT 1;
    ```

### Prueba 3: Vistas por Rol

**Vista de Cliente** (`/cliente`):
- Dashboard con estadísticas
- Mis Incidentes
- Mis Propiedades
- Mi Perfil
- Navegación responsive (desktop + mobile)

**Vista de Técnico** (`/tecnico`):
- Dashboard mobile-optimized
- Mis Trabajos
- Mi Perfil
- Bottom navigation bar

**Vista de Admin** (`/dashboard`):
- Panel completo de administración
- Sidebar de navegación
- Vista de escritorio

---

## 3️⃣ SI HAY PROBLEMAS

### Problema: Login no redirige correctamente

**Solución**: Verifica que el usuario existe en la tabla `usuarios`:
```sql
SELECT * FROM usuarios WHERE id = 'UUID_DEL_USUARIO';
```

Si no existe, ejecuta el script 05 para backfill de usuarios existentes.

### Problema: Error al registrar cliente

**Solución**: Verifica que el trigger está activo:
```sql
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- tgenabled debe ser 'O' (enabled)
```

### Problema: No se crea en tabla clientes/tecnicos

**Solución**:
1. Verifica que el metadata se está pasando correctamente
2. Revisa los logs del trigger:
   ```sql
   -- Ver últimos registros en usuarios
   SELECT * FROM usuarios ORDER BY fecha_creacion DESC LIMIT 5;

   -- Ver últimos registros en clientes
   SELECT * FROM clientes ORDER BY fecha_creacion DESC LIMIT 5;
   ```

---

## 📚 Documentación

### Documentos Clave

1. **Sistema de vistas por rol**: `/documentacion/vistas_por_rol.md`
   - Explica cada vista
   - Flujos de usuario
   - Componentes y archivos

2. **Sincronización de usuarios**: `/documentacion/sincronizacion_usuarios.md`
   - Cómo funciona el trigger
   - Troubleshooting

3. **Guía de scripts SQL**: `/documentacion/guia_scripts_sql.md`
   - Orden de ejecución
   - Qué hace cada script

4. **Manejo de errores**: `/documentacion/manejo_errores.md`
   - Mensajes de error en español
   - Cómo agregar nuevos errores

### Scripts SQL (en orden)

1. ✅ `01_setup_database.sql` - Crear tabla usuarios
2. ✅ `02_setup_solicitudes.sql` - Crear tabla solicitudes
3. ✅ `03_crear_admin.sql` - Referencia admin
4. ✅ `04_fix_rls_policies.sql` - Fix RLS recursión
5. ✅ `05_insert_existing_users.sql` - Backfill usuarios existentes
6. ⚠️ `06_auto_create_user_trigger.sql` - Trigger básico (será reemplazado)
7. **🔴 `07_trigger_crear_cliente_tecnico.sql`** - **EJECUTAR ESTE AHORA**

---

## ✅ Checklist Final

- [ ] Script 07 ejecutado en Supabase
- [ ] Registro de cliente funciona
- [ ] Cliente ve vista `/cliente` después de login
- [ ] Solicitud de técnico funciona
- [ ] Admin puede aprobar técnicos
- [ ] Técnico ve vista `/tecnico` después de login
- [ ] Trigger crea registros en todas las tablas correctamente
- [ ] Relaciones id_cliente e id_tecnico están vinculadas

---

## 🎉 Después de Completar

Una vez que todo funciona:

1. Puedes eliminar este archivo
2. El sistema está listo para desarrollo de funcionalidades
3. Próximos pasos sugeridos:
   - Implementar creación de incidentes desde vista cliente
   - Implementar actualización de estado de trabajos desde vista técnico
   - Agregar sistema de notificaciones
   - Implementar carga de imágenes para inspecciones

---

**¿Problemas? Revisa la documentación en `/documentacion/`**
