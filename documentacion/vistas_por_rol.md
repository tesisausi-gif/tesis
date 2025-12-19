# Vistas por Rol - Sistema Multi-Rol

## Resumen

El sistema ahora cuenta con vistas completamente separadas y optimizadas para cada tipo de usuario:

- **Admin/Gestor**: Vista de escritorio completa para gestión
- **Cliente**: Vista responsive para seguimiento de incidentes
- **Técnico**: Vista mobile-optimized para trabajo en campo

---

## 1. Vista de Admin/Gestor

**Ruta**: `/dashboard/*`

**Características**:
- Panel de administración completo
- Gestión de usuarios, incidentes, propiedades
- Aprobación de técnicos
- Vista optimizada para escritorio
- Sidebar de navegación

**Acceso**: Solo usuarios con rol `admin` o `gestor`

**Páginas**:
- `/dashboard` - Dashboard principal
- `/dashboard/usuarios` - Gestión de usuarios
- `/dashboard/solicitudes` - Aprobación de técnicos
- `/dashboard/incidentes` - Gestión de incidentes
- `/dashboard/propiedades` - Gestión de propiedades
- Y más...

---

## 2. Vista de Cliente

**Ruta**: `/cliente/*`

**Características**:
- Interfaz responsive (desktop y mobile)
- Vista simplificada y clara
- Enfocada en consulta de información
- Navegación horizontal en desktop
- Menú hamburguesa en mobile

**Acceso**: Solo usuarios con rol `cliente`

**Páginas**:

### `/cliente` - Dashboard
- Estadísticas personales
  - Total de incidentes
  - Incidentes abiertos
  - Incidentes resueltos
  - Total de propiedades
- Acciones rápidas
- Información de contacto

### `/cliente/incidentes` - Mis Incidentes
- Lista de todos los incidentes reportados
- Filtros por estado y prioridad
- Detalles de cada incidente:
  - Descripción
  - Estado actual
  - Nivel de prioridad
  - Categoría
  - Fechas (reporte y cierre)
  - Dirección de la propiedad

### `/cliente/propiedades` - Mis Propiedades
- Lista de propiedades (como propietario o inquilino)
- Información de cada propiedad:
  - Tipo de propiedad
  - Dirección completa
  - Descripción
  - Estado (activa/inactiva)

### `/cliente/perfil` - Mi Perfil
- Información personal:
  - Nombre completo
  - Email
  - Teléfono
  - DNI
  - Tipo de cliente
- Información de cuenta

**Componentes**:
- `ClienteNav` - Navegación responsive con menú hamburguesa

---

## 3. Vista de Técnico

**Ruta**: `/tecnico/*`

**Características**:
- Interfaz mobile-first
- Bottom navigation bar (siempre visible)
- Top bar con título y logout
- Optimizada para uso en campo
- Tarjetas con información concisa

**Acceso**: Solo usuarios con rol `tecnico`

**Páginas**:

### `/tecnico` - Dashboard
- Bienvenida personalizada
- Estadísticas del técnico:
  - Trabajos activos
  - Trabajos completados
  - Total de trabajos
  - Calificación promedio
- Trabajos recientes (últimos 3)
- Acciones rápidas

### `/tecnico/trabajos` - Mis Trabajos
- Lista completa de asignaciones
- Información de cada trabajo:
  - Número de incidente
  - Estado de la asignación
  - Prioridad
  - Dirección de la propiedad
  - Descripción del problema
  - Fecha de asignación
  - Fecha de visita programada
  - Observaciones
  - Categoría
- Badges de colores para estado y prioridad

### `/tecnico/perfil` - Mi Perfil
- Información personal:
  - Nombre completo
  - Email
  - Teléfono
  - DNI
  - Dirección
- Información profesional:
  - Especialidad
  - Trabajos realizados
  - Calificación promedio
- Estado de cuenta

**Componentes**:
- `TecnicoNav` - Bottom navigation bar + Top bar

---

## Sistema de Routing Automático

### Login Inteligente

El sistema ahora redirige automáticamente después del login según el rol:

```typescript
// En /app/(auth)/login/page.tsx
switch (rol) {
  case 'admin':
  case 'gestor':
    router.push('/dashboard')
    break
  case 'cliente':
    router.push('/cliente')
    break
  case 'tecnico':
    router.push('/tecnico')
    break
}
```

### Protección de Rutas

Cada layout verifica que el usuario tenga el rol correcto:

**Layout de Cliente** (`/app/(cliente)/layout.tsx`):
```typescript
// Verifica que el usuario sea cliente
const { data: usuario } = await supabase
  .from('usuarios')
  .select('rol')
  .eq('id', user.id)
  .single()

if (!usuario || usuario.rol !== 'cliente') {
  redirect('/login')
}
```

**Layout de Técnico** (`/app/(tecnico)/layout.tsx`):
```typescript
// Verifica que el usuario sea técnico
const { data: usuario } = await supabase
  .from('usuarios')
  .select('rol')
  .eq('id', user.id)
  .single()

if (!usuario || usuario.rol !== 'tecnico') {
  redirect('/login')
}
```

**Layout de Admin** (`/app/(admin)/layout.tsx`):
```typescript
// Verifica que el usuario sea admin o gestor
if (!usuario || (usuario.rol !== 'admin' && usuario.rol !== 'gestor')) {
  redirect('/login')
}
```

---

## Flujo de Usuario Completo

### Cliente se Registra

1. Va a `/register`
2. Selecciona tab "Cliente"
3. Completa formulario con:
   - Email
   - Contraseña
   - Nombre
   - Apellido
4. Al hacer submit:
   - Se crea usuario en `auth.users`
   - Trigger automático crea registro en `clientes`
   - Trigger automático crea registro en `usuarios` con `id_cliente` vinculado
5. Usuario hace login
6. Sistema detecta rol='cliente'
7. Redirige a `/cliente`
8. Ve su dashboard personalizado

### Técnico Solicita Registro

1. Va a `/register`
2. Selecciona tab "Técnico"
3. Completa formulario con:
   - Email
   - Nombre, Apellido
   - Teléfono, DNI
   - Dirección
   - Especialidad
4. Al hacer submit:
   - Se crea registro en `solicitudes_registro`
   - Estado: 'pendiente'
5. Admin/Gestor aprueba desde `/dashboard/solicitudes`
6. Sistema:
   - Crea usuario en `auth.users` con metadata completo
   - Trigger automático crea registro en `tecnicos`
   - Trigger automático crea registro en `usuarios` con `id_tecnico` vinculado
   - Actualiza solicitud a 'aprobada'
7. Técnico hace login
8. Sistema detecta rol='tecnico'
9. Redirige a `/tecnico`
10. Ve su dashboard mobile-optimized

### Admin Crea Usuario

1. Va a `/dashboard/usuarios`
2. Click en "Crear Usuario"
3. Completa formulario:
   - Email, Contraseña
   - Nombre, Apellido
   - Rol (admin/gestor/cliente/tecnico)
   - Campos adicionales opcionales
4. Al hacer submit:
   - Se crea usuario en `auth.users` con metadata
   - Trigger automático crea en `usuarios`
   - Si rol='cliente': crea en `clientes`
   - Si rol='tecnico': crea en `tecnicos`
5. Usuario puede hacer login
6. Redirige según su rol

---

## Diferencias Clave Entre Vistas

| Aspecto | Admin/Gestor | Cliente | Técnico |
|---------|-------------|---------|---------|
| **Optimización** | Desktop | Desktop + Mobile | Mobile-First |
| **Navegación** | Sidebar fijo | Top bar responsive | Bottom bar + Top bar |
| **Enfoque** | Gestión completa | Consulta | Trabajo en campo |
| **Acciones** | CRUD completo | Solo lectura | Actualizar estado |
| **Diseño** | Complejo, muchas opciones | Limpio, simple | Minimalista, touch-friendly |
| **Datos** | Todos los registros | Solo sus datos | Solo trabajos asignados |

---

## Archivos Clave

### Layouts
- `/app/(admin)/layout.tsx` - Layout de admin
- `/app/(cliente)/layout.tsx` - Layout de cliente
- `/app/(tecnico)/layout.tsx` - Layout de técnico

### Componentes de Navegación
- `/components/admin/admin-sidebar.tsx` - Sidebar admin
- `/components/cliente/cliente-nav.tsx` - Nav responsive cliente
- `/components/tecnico/tecnico-nav.tsx` - Bottom nav técnico

### Páginas de Cliente
- `/app/(cliente)/cliente/page.tsx` - Dashboard
- `/app/(cliente)/cliente/incidentes/page.tsx` - Incidentes
- `/app/(cliente)/cliente/propiedades/page.tsx` - Propiedades
- `/app/(cliente)/cliente/perfil/page.tsx` - Perfil

### Páginas de Técnico
- `/app/(tecnico)/tecnico/page.tsx` - Dashboard
- `/app/(tecnico)/tecnico/trabajos/page.tsx` - Trabajos
- `/app/(tecnico)/tecnico/perfil/page.tsx` - Perfil

### Lógica de Routing
- `/app/(auth)/login/page.tsx` - Login con redirección por rol

---

## Próximas Mejoras Posibles

1. **Para Clientes**:
   - Crear nuevo incidente desde la app
   - Chat con gestores
   - Notificaciones de cambios de estado
   - Ver presupuestos y pagos

2. **Para Técnicos**:
   - Crear inspecciones desde móvil
   - Subir fotos de trabajos
   - Actualizar estado de trabajos
   - Ver presupuestos asignados
   - Registrar tiempo de trabajo

3. **Generales**:
   - Notificaciones push
   - Modo offline
   - Geolocalización para técnicos
   - Historial de cambios

---

## Testing

Para probar cada vista:

1. **Vista de Admin**:
   ```
   Email: admin@isba.com
   Password: admin123
   ```

2. **Vista de Cliente**:
   - Registrar nuevo cliente desde `/register`
   - Tab "Cliente"
   - Login y verificar redirección a `/cliente`

3. **Vista de Técnico**:
   - Solicitar registro desde `/register`
   - Tab "Técnico"
   - Aprobar desde admin
   - Login y verificar redirección a `/tecnico`
