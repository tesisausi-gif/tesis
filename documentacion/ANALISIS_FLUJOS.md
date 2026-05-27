# Análisis Completo de Flujos — Sistema de Gestión de Incidentes ISBA

> **Fecha de actualización:** 2026-05-25
> **Cobertura:** Auditoría exhaustiva del código fuente: features, services, pages, middleware, migrations.

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Modelo de Datos](#2-modelo-de-datos)
3. [Roles y Permisos](#3-roles-y-permisos)
4. [Flujos de Autenticación](#4-flujos-de-autenticación)
5. [Máquinas de Estado](#5-máquinas-de-estado)
6. [Flujos por Rol](#6-flujos-por-rol)
7. [Inventario de Features (Services)](#7-inventario-de-features-services)
8. [Sistema de Notificaciones](#8-sistema-de-notificaciones)
9. [Componentes Clave](#9-componentes-clave)
10. [Rutas Completas](#10-rutas-completas)
11. [Cambios desde Febrero 2026](#11-cambios-desde-febrero-2026)

---

## 1. Arquitectura General

### Stack Tecnológico

- **Frontend:** Next.js 14 App Router (TypeScript)
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **UI:** shadcn/ui + Tailwind CSS v4
- **Animaciones:** framer-motion
- **Calendario:** react-day-picker + date-fns
- **Email transaccional:** Brevo REST API
- **Email credenciales:** Nodemailer / Gmail SMTP
- **Deploy:** Vercel (`https://tesis-three-drab.vercel.app`)

### Principios Arquitecturales

**No existen rutas API.** Toda escritura pasa por Server Actions con la directiva `'use server'`. Las páginas (`page.tsx`) obtienen datos iniciales mediante SSR llamando directamente a funciones de service. Los componentes cliente (`.client.tsx`) llaman a funciones de service directamente como Server Actions.

**Tres clientes Supabase:**
- `shared/lib/supabase/server.ts` — para servicios y SSR (respeta RLS)
- `shared/lib/supabase/admin.ts` — bypass de RLS (solo cuando necesario)
- `shared/lib/supabase/client.ts` — exclusivo para `supabase.auth.*` (login/logout/register) y suscripciones Realtime

**Organización feature-based:** cada feature en `features/{nombre}/{nombre}.service.ts` + `{nombre}.types.ts`.

### Diagrama de Capas

```
┌──────────────────────────────────────────────────────────┐
│                    BROWSER / CLIENT                       │
│  page.tsx (SSR)   ──►  .client.tsx (interactividad)      │
└─────────────────────────────┬────────────────────────────┘
                              │ Server Actions / fetch SSR
┌─────────────────────────────▼────────────────────────────┐
│                 NEXT.JS APP ROUTER (Server)               │
│  middleware.ts (auth guard + debe_cambiar_password)       │
│  features/*/service.ts (lógica de negocio + DB)          │
└─────────────────────────────┬────────────────────────────┘
                              │ Supabase JS client
┌─────────────────────────────▼────────────────────────────┐
│                    SUPABASE                               │
│  PostgreSQL + Auth + Storage + Realtime                   │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Modelo de Datos

### Tabla: `usuarios`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | = Supabase Auth UID |
| `nombre` | TEXT | |
| `apellido` | TEXT | |
| `rol` | TEXT | `'admin'`, `'gestor'`, `'tecnico'`, `'cliente'` |
| `id_cliente` | INT FK | → `clientes.id_cliente` (nullable) |
| `id_tecnico` | INT FK | → `tecnicos.id_tecnico` (nullable) |
| `esta_activo` | BOOL | |
| `debe_cambiar_password` | BOOL | `true` en técnicos recién aprobados |
| `fecha_creacion` | TIMESTAMPTZ | |

### Tabla: `clientes`

| Columna | Tipo | Notas |
|---|---|---|
| `id_cliente` | INT PK | |
| `nombre` | TEXT | |
| `apellido` | TEXT | |
| `correo_electronico` | TEXT | |
| `telefono` | TEXT | |
| `tipo_cliente` | TEXT | `'Propietario'`, `'Inquilino'`, `'Tercero'` |
| `direccion` | TEXT | |

### Tabla: `tecnicos`

| Columna | Tipo | Notas |
|---|---|---|
| `id_tecnico` | INT PK | |
| `nombre` | TEXT | |
| `apellido` | TEXT | |
| `correo_electronico` | TEXT | |
| `telefono` | TEXT | |
| `especialidad` | TEXT | campo legacy |
| `especialidades` | TEXT[] | array (campo preferido) |
| `calificacion_promedio` | NUMERIC | recalculado en cada calificación |
| `cantidad_trabajos_realizados` | INT | recalculado en cada calificación |

### Tabla: `inmuebles`

| Columna | Tipo | Notas |
|---|---|---|
| `id_inmueble` | INT PK | |
| `id_cliente` | INT FK | → `clientes` |
| `calle` | TEXT | |
| `altura` | TEXT | |
| `piso` | TEXT | nullable |
| `dpto` | TEXT | nullable |
| `barrio` | TEXT | nullable |
| `localidad` | TEXT | |
| `tipo_propiedad` | TEXT | `'Departamento'`, `'Casa'`, `'Local'`, `'Oficina'` |

### Tabla: `incidentes`

| Columna | Tipo | Notas |
|---|---|---|
| `id_incidente` | INT PK | |
| `id_cliente_reporta` | INT FK | → `clientes` |
| `id_inmueble` | INT FK | → `inmuebles` |
| `descripcion_problema` | TEXT | |
| `categoria` | TEXT | `CategoriaIncidente` enum |
| `nivel_prioridad` | TEXT | `'Baja'`, `'Media'`, `'Alta'`, `'Urgente'` |
| `estado_actual` | TEXT | ver máquina de estados |
| `fue_resuelto` | INT | 0/1 |
| `fecha_cierre` | TIMESTAMPTZ | |
| `calificacion_admin` | NUMERIC | |
| `comentario_admin` | TEXT | |
| `fecha_creacion` | TIMESTAMPTZ | |

**Estados válidos de `estado_actual`:**
```
pendiente → asignacion_solicitada → en_proceso → finalizado (terminal)
                                              → resuelto   (terminal, legacy)
```

### Tabla: `franjas_disponibilidad` (nueva)

| Columna | Tipo | Notas |
|---|---|---|
| `id_franja` | INT PK | |
| `id_incidente` | INT FK | → `incidentes` |
| `fecha` | DATE | `'YYYY-MM-DD'` |
| `hora_inicio` | TIME | `'HH:MM'` |
| `hora_fin` | TIME | `'HH:MM'` |

Múltiples franjas por incidente. El cliente las define al reportar o editar el incidente. El técnico las ve en su agenda.

### Tabla: `asignaciones_tecnico`

| Columna | Tipo | Notas |
|---|---|---|
| `id_asignacion` | INT PK | |
| `id_incidente` | INT FK | → `incidentes` |
| `id_tecnico` | INT FK | → `tecnicos` |
| `estado_asignacion` | TEXT | ver estados |
| `fecha_asignacion` | TIMESTAMPTZ | |
| `fecha_aceptacion` | TIMESTAMPTZ | |
| `fecha_rechazo` | TIMESTAMPTZ | |
| `fecha_completado` | TIMESTAMPTZ | |
| `observaciones` | TEXT | |
| `fecha_visita_programada` | TIMESTAMPTZ | fecha + hora_inicio de la visita |
| `hora_fin_programada` | TIME | hora_fin estimada de la visita |

**Estados válidos de `estado_asignacion`:**
```
pendiente → aceptada → en_curso → completada
          → rechazada
          → cancelada  (técnico cancela una asignación ya aceptada, con penalización)
```

### Tabla: `inspecciones`

| Columna | Tipo | Notas |
|---|---|---|
| `id_inspeccion` | INT PK | |
| `id_incidente` | INT FK | → `incidentes` |
| `id_tecnico` | INT FK | → `tecnicos` |
| `descripcion` | TEXT | |
| `esta_anulada` | BOOL | se anula si el presupuesto es rechazado por admin |
| `fecha_inspeccion` | TIMESTAMPTZ | |

### Tabla: `presupuestos`

| Columna | Tipo | Notas |
|---|---|---|
| `id_presupuesto` | INT PK | |
| `id_incidente` | INT FK | → `incidentes` |
| `id_inspeccion` | INT FK | → `inspecciones` (nullable) |
| `descripcion_detallada` | TEXT | |
| `costo_materiales` | NUMERIC | |
| `costo_mano_obra` | NUMERIC | |
| `gastos_administrativos` | NUMERIC | comisión ISBA, agregada por admin en aprobación |
| `costo_total` | NUMERIC | materiales + mano_obra + gastos_administrativos |
| `estado_presupuesto` | TEXT | ver estados |
| `fecha_creacion` | TIMESTAMPTZ | |
| `fecha_modificacion` | TIMESTAMPTZ | |
| `fecha_aprobacion` | TIMESTAMPTZ | |
| `alternativas_reparacion` | TEXT | |
| `nota_rechazo_cliente` | TEXT | |
| `decision_cliente` | TEXT | `'nuevo_tecnico'` o `'otra_oportunidad'` |
| `decision_tecnico` | TEXT | `'acepta'` o `'rechaza'` |

**Estados válidos:**
```
enviado → aprobado_admin → aprobado  (terminal positivo)
        → rechazado                  (terminal negativo)
        → vencido                    (terminal negativo, admin)
```

### Tabla: `conformidades`

| Columna | Tipo | Notas |
|---|---|---|
| `id_conformidad` | INT PK | |
| `id_incidente` | INT FK | → `incidentes` |
| `id_cliente` | INT FK | → `clientes` |
| `tipo_conformidad` | TEXT | `'final'` o `'intermedia'` |
| `esta_firmada` | INT | 0/1 (aprobada por admin) |
| `esta_rechazada` | BOOL | marcada cuando admin rechaza (registro conservado) |
| `url_documento` | TEXT | foto de la conformidad física firmada |
| `url_comprobante_compras` | TEXT | comprobante de compras de materiales |
| `fecha_conformidad` | TIMESTAMPTZ | |
| `fecha_rechazo` | TIMESTAMPTZ | |
| `observaciones` | TEXT | |
| `fecha_creacion` | TIMESTAMPTZ | |

### Tabla: `calificaciones`

| Columna | Tipo | Notas |
|---|---|---|
| `id_calificacion` | INT PK | |
| `id_incidente` | INT FK | |
| `id_tecnico` | INT FK | |
| `puntuacion` | NUMERIC | 1–5 |
| `comentarios` | TEXT | |
| `resolvio_problema` | INT | 0/1 |
| `fecha_calificacion` | TIMESTAMPTZ | |

Se genera en dos escenarios: (a) aprobación de conformidad por admin, (b) cancelación de asignación aceptada por técnico (penalización automática de 1 estrella).

### Tabla: `notificaciones`

| Columna | Tipo | Notas |
|---|---|---|
| `id_notificacion` | INT PK | |
| `id_tecnico` | INT FK | nullable |
| `id_cliente` | INT FK | nullable |
| `para_admin` | BOOL | `true` → notificación del panel admin |
| `tipo` | TEXT | ver tipos |
| `titulo` | TEXT | |
| `mensaje` | TEXT | |
| `leida` | BOOL | |
| `id_incidente` | INT FK | nullable |
| `id_presupuesto` | INT FK | nullable |
| `fecha_creacion` | TIMESTAMPTZ | |

### Tabla: `pagos_tecnicos`

| Columna | Tipo | Notas |
|---|---|---|
| `id_pago_tecnico` | INT PK | |
| `id_incidente` | INT FK | |
| `id_tecnico` | INT FK | |
| `id_presupuesto` | INT FK | |
| `monto` | NUMERIC | = materiales + mano_obra (sin comisión) |
| `fecha_pago` | TIMESTAMPTZ | |
| `marcado_por_email` | TEXT | |
| `marcado_por_nombre` | TEXT | |
| `metodo_pago` | TEXT | |
| `observaciones` | TEXT | |

### Tabla: `cobros_clientes`

| Columna | Tipo | Notas |
|---|---|---|
| `id_cobro` | INT PK | |
| `id_incidente` | INT FK | |
| `id_cliente` | INT FK | |
| `id_presupuesto` | INT FK | |
| `monto` | NUMERIC | = `costo_total` (incluye comisión ISBA) |
| `fecha_cobro` | TIMESTAMPTZ | |
| `marcado_por_email` | TEXT | |
| `marcado_por_nombre` | TEXT | |
| `metodo_pago` | TEXT | |
| `observaciones` | TEXT | |

### Tabla: `solicitudes_tecnico`

| Columna | Tipo | Notas |
|---|---|---|
| `id_solicitud` | INT PK | |
| `nombre` | TEXT | |
| `apellido` | TEXT | |
| `correo_electronico` | TEXT | |
| `telefono` | TEXT | |
| `especialidades` | TEXT[] | |
| `estado` | TEXT | `'pendiente'`, `'aprobada'`, `'rechazada'` |
| `fecha_solicitud` | TIMESTAMPTZ | |

### Tabla: `pagos` (legacy)

Tabla de pagos genéricos. Su uso principal migró a `pagos_tecnicos` y `cobros_clientes`. Sigue siendo consultada por `getTimelineIncidente`.

| Columna | Tipo | Notas |
|---|---|---|
| `id_pago` | INT PK | |
| `id_incidente` | INT FK | |
| `tipo_pago` | TEXT | `'adelanto'`, `'parcial'`, `'total'`, `'reembolso'` |
| `monto` | NUMERIC | |
| `metodo_pago` | TEXT | |
| `fecha_pago` | TIMESTAMPTZ | |

---

## 3. Roles y Permisos

### Roles del sistema

| Rol | Acceso | Descripción |
|---|---|---|
| `admin` | `/dashboard/*` | Administrador completo |
| `gestor` | `/dashboard/*` | Igual que admin en rutas y permisos de service |
| `tecnico` | `/tecnico/*` | Técnico de campo |
| `cliente` | `/cliente/*` | Cliente/propietario |

`isAdmin()` y `requireAdmin()` en `auth.service.ts` retornan `true` para `admin` y `gestor`. El middleware (`middleware.ts`) permite acceso a ambos roles en `/dashboard/*`.

### Protección de ruta `debe_cambiar_password`

Si un usuario tiene `debe_cambiar_password = true` en la tabla `usuarios`, el middleware redirige **toda** solicitud autenticada a `/cambiar-password` (excepto `/login`, `/register`, y la propia ruta). Una vez cambiada la contraseña, el flag se limpia y el usuario es redirigido a su dashboard.

### Matriz de acceso por ruta

| Ruta | Admin/Gestor | Cliente | Técnico | Anónimo |
|---|:---:|:---:|:---:|:---:|
| `/` | ✓ | ✓ | ✓ | ✓ |
| `/login` | redirige | redirige | redirige | ✓ |
| `/register` | ✓ | ✓ | ✓ | ✓ |
| `/cambiar-password` | ✓ | ✓ | ✓ | → `/login` |
| `/dashboard/*` | ✓ | ✗ | ✗ | → `/login` |
| `/cliente/*` | ✗ | ✓ | ✗ | → `/login` |
| `/tecnico/*` | ✗ | ✗ | ✓ | → `/login` |
| `/inmueble/[id]` | ✓ | ✓ | ✗ | → `/login` |

---

## 4. Flujos de Autenticación

### 4.1 Login estándar

```
/login
  → supabase.auth.signInWithPassword(email, password)
  → middleware consulta usuarios.rol + debe_cambiar_password
  → si debe_cambiar_password: redirect /cambiar-password
  → si no: redirect según rol
      admin/gestor → /dashboard
      tecnico      → /tecnico
      cliente      → /cliente
```

### 4.2 Registro de cliente

```
/register
  → supabase.auth.signUp(email, password)
  → DB trigger crea fila en usuarios (rol: 'cliente')
  → usuario completa datos en perfil
  → redirect /cliente
```

### 4.3 Aprobación de técnico (registro indirecto)

```
TECNICO: Completa formulario en /register (pestaña técnico)
         → INSERT en solicitudes_tecnico (estado='pendiente')
         → Espera aprobación (no puede loguearse aún)

ADMIN: Ve solicitud en /dashboard/solicitudes
       → aprobarSolicitudTecnico(idSolicitud):
           1. Lee datos de solicitudes_tecnico
           2. Genera contraseña temporal aleatoria
           3. supabase.auth.admin.createUser(email, password)
           4. INSERT en tecnicos
           5. UPDATE usuarios: rol='tecnico', debe_cambiar_password=true
           6. UPDATE solicitudes_tecnico: estado='aprobada'
           7. enviarCredencialesTecnico(email, nombre, passwordTemp)
              (Nodemailer/Gmail SMTP)
```

### 4.4 Primer acceso del técnico

```
TECNICO: Login con credenciales temporales recibidas por email
         → middleware detecta debe_cambiar_password=true
         → redirect /cambiar-password

/cambiar-password:
  → técnico define su contraseña definitiva
  → supabase.auth.updateUser(newPassword)
  → UPDATE usuarios: debe_cambiar_password=false
  → redirect /tecnico
```

---

## 5. Máquinas de Estado

### 5.1 Estado de Incidente

```
pendiente
    │
    │ admin crea asignación (crearAsignacion)
    ▼
asignacion_solicitada
    │
    ├── técnico rechaza → asignacion_solicitada (admin puede reasignar)
    │
    │ técnico acepta (aceptarAsignacion)
    ▼
en_proceso
    │
    ├── técnico cancela asignación → pendiente (penalización 1★)
    │
    │ (trabajo: inspección → presupuesto → conformidad)
    │
    │ admin aprueba conformidad (aprobarConformidad)
    ▼
finalizado  ◄─── terminal positivo
            + fue_resuelto=1, fecha_cierre=now()
```

Transiciones especiales:
- `rechazarPresupuesto` (admin, 1er presupuesto) → incidente vuelve a `pendiente`
- `rechazarPresupuestoConDecision(decision='nuevo_tecnico')` → `pendiente`
- `responderOportunidadTecnico(false)` → `pendiente`
- `resuelto` — estado terminal legacy, no generado por nuevos flujos

### 5.2 Estado de Asignación

```
pendiente
    │
    ├── técnico rechaza → rechazada
    │
    │ técnico acepta (aceptarAsignacion)
    ▼
aceptada
    │
    ├── técnico cancela (penalización 1★) → cancelada
    │
    │ admin o técnico inicia trabajo
    ▼
en_curso
    │
    │ técnico finaliza trabajo
    ▼
completada
```

### 5.3 Estado de Presupuesto

```
[técnico crea presupuesto]
       ▼
    enviado  ←── estado inicial (no existe borrador en el flujo actual)
       │
       ├── admin rechaza → rechazado (terminal)
       │
       ├── admin marca vencido → vencido (terminal)
       │
       │ admin aprueba (+ agrega gastos_administrativos)
       ▼
  aprobado_admin
       │
       ├── cliente rechaza (+ decision) → rechazado (terminal)
       │
       │ cliente aprueba
       ▼
    aprobado  ←── terminal positivo
```

**Presupuesto adicional:** si ya existe un presupuesto `aprobado` y se rechaza uno nuevo, el técnico no es desvinculado y el trabajo continúa.

**Flujo `otra_oportunidad`:** cliente rechaza con decisión `'otra_oportunidad'` → técnico recibe notificación → acepta re-presupuestar (puede enviar nuevo presupuesto) o rechaza (incidente vuelve a `pendiente`).

### 5.4 Estado de Conformidad

```
[técnico sube foto]
  crearConformidadPorTecnico:
    esta_firmada=0, url_documento=<url>, url_comprobante_compras=<url>

[admin revisa foto]
  aprobarConformidad:
    esta_firmada=1
    → incidente.estado_actual = 'finalizado'
    → crea calificacion + recalcula promedio técnico
    → notifica cliente (in-app + email)

  rechazarConformidad:
    esta_rechazada=true (registro conservado para historial)
    → técnico puede volver a subir nueva foto
```

### 5.5 Sub-estados de "en_proceso"

El estado `en_proceso` de un incidente se subdivide en 7 sub-estados que se **calculan dinámicamente** — no hay un campo único en la DB. Se derivan de la combinación de `estado_asignacion` (asignación activa), `estado_presupuesto` (presupuesto si existe), inspecciones cargadas y el estado de la conformidad.

**Funciones que los calculan:**
- Admin: `getAccionPendiente()` en `components/admin/incidentes-content.client.tsx`
- Técnico: `getStatusKey()` en `components/tecnico/trabajos-content.client.tsx`
- Cliente: lógica inline de `grupos` en `components/cliente/incidentes-content.client.tsx`

**Fuente canónica del type y config visual:** `shared/utils/colors.ts` → `SubEstadoEnProceso` y `SUB_ESTADO_EN_PROCESO_CONFIG`

---

#### Orden cronológico y lógico del flujo

| # | Key | labelBadge | Condición de activación | Admin | Técnico | Cliente |
|---|-----|-----------|------------------------|-------|---------|---------|
| 1 | `pendiente_inspeccion` | Pend. inspección | `estado_asignacion = 'aceptada'` + sin inspecciones en DB | Visible (disabled) | Visible (→ tab inspecciones) | NO (aparece como "En curso") |
| 2 | `aceptada` | Pend. presupuesto | `estado_asignacion = 'aceptada'` + inspección cargada + sin presupuesto aprobado | Visible (disabled) | Visible (→ cargar presupuesto) | NO (aparece como "En curso") |
| 3 | `presupuesto_enviado` | Presup. enviado | `estado_presupuesto = 'enviado'` | Visible (→ evaluar presup.) | Visible (disabled) | NO (aparece como "En curso") |
| 4 | `presupuesto_cliente` | Esp. cliente | `estado_presupuesto = 'aprobado_admin'` | Visible (disabled) | Visible (disabled) | Visible (→ aprobar presup.) |
| 5 | `en_curso` | En curso | `estado_presupuesto = 'aprobado'` | Fallback general | Condición explícita | Residual (engloba #1-#3) |
| 6 | `completada_pendiente` | Conf. subida | Conformidad con `url_documento && !esta_firmada && !esta_rechazada` | Visible (→ ver conform.) | `estado_asignacion = 'completada'` | Visible |
| 7 | `conformidad_rechazada` | Conf. rechazada | `conformidad.esta_rechazada = true` | Primera condición evaluada | `estado_asignacion = 'completada'` + rechazada | NO |

---

#### Descripción de cada sub-estado

**1. `pendiente_inspeccion` — Pend. inspección**
Técnico aceptó la asignación pero todavía no realizó la inspección del inmueble. Nadie puede avanzar hasta que el técnico suba la inspección. El admin y el cliente no pueden hacer nada; solo el técnico tiene acción (ir al tab de inspecciones).

**2. `aceptada` — Pend. presupuesto**
Inspección ya cargada. El técnico debe elaborar y enviar el presupuesto. El admin observa; no hay acción posible hasta que el técnico actúe.

**3. `presupuesto_enviado` — Presup. enviado**
Técnico envió el presupuesto al sistema. El admin debe revisarlo: puede aprobarlo (→ `aprobado_admin`) o rechazarlo. Si lo rechaza sin decidir un nuevo técnico, el incidente vuelve a `pendiente`.

**4. `presupuesto_cliente` — Esp. cliente**
Admin aprobó el presupuesto internamente. Ahora el cliente debe dar el ok. Nadie puede avanzar hasta que el cliente decida. Si rechaza con `nueva_oportunidad`, el técnico puede reenviar presupuesto. Si rechaza con `nuevo_tecnico`, el incidente vuelve a `pendiente`.

**5. `en_curso` — En curso**
Cliente aprobó el presupuesto y el trabajo está activo. El técnico está ejecutando. No hay acción pendiente para el admin. El cliente ve este sub-estado para todos los incidentes que no tienen presupuesto pendiente ni conformidad subida (incluye los sub-estados #1–#3 que el cliente no puede distinguir).

**6. `completada_pendiente` — Conf. subida**
Técnico marcó la asignación como completada y subió la foto de la conformidad firmada. El admin debe revisar la foto y aprobar o rechazar. Banner violeta en la card del admin.

**7. `conformidad_rechazada` — Conf. rechazada**
Admin rechazó la foto de conformidad (ilegible, incompleta, etc.). El técnico debe subir una nueva foto. Banner rojo. Este sub-estado tiene la **máxima prioridad** en la función del admin: se evalúa antes que todos los demás.

---

#### Visibilidad por rol

El cliente solo ve 3 de los 7 sub-estados:
- `presupuesto_cliente` → "Aguarda aprobación del cliente" (debe aprobar el presupuesto)
- `en_curso` → "Trabajo en progreso" (engloba también #1, #2 y #3)
- `completada_pendiente` → "Conformidad para revisar"

Los sub-estados `pendiente_inspeccion`, `aceptada` y `presupuesto_enviado` son invisibles para el cliente: aparecen todos agrupados como "En curso". El sub-estado `conformidad_rechazada` tampoco es visible para el cliente en la vista de lista (solo en el timeline del incidente).

---

## 6. Flujos por Rol

### 6.1 Flujo del Cliente

**Reportar incidente** (`/cliente/incidentes/nuevo`):
1. Selecciona inmueble activo
2. Describe el problema (categoría, prioridad, descripción)
3. Define franjas de disponibilidad usando `CalendarioDisponibilidad` (fecha + hora_inicio + hora_fin)
4. Submit: INSERT en `incidentes` + `guardarFranjasDisponibilidad`
5. Crea notificación al admin

**Aprobar/Rechazar presupuesto** (`/cliente/presupuestos`):
- Ve presupuestos en estado `aprobado_admin`
- Puede aprobar → estado `aprobado`
- Puede rechazar con decisión: `nuevo_tecnico` o `otra_oportunidad`

**Ver conformidades** (`/cliente/conformidades`):
- Ve el estado de conformidades de sus incidentes

**Ver cobros** (`/cliente/pagos`):
- Ve registros en `cobros_clientes` con fecha y monto

### 6.2 Flujo del Técnico

**Dashboard** (`/tecnico`):
- Contadores de incidentes por estado
- `AgendaTecnico`: calendario visual con franjas de disponibilidad del cliente para incidentes activos
- Alertas de trabajos listos para subir conformidad

**Aceptar/Rechazar asignación** (`/tecnico/disponibles`):
- Lista de asignaciones en estado `pendiente`
- Ver detalles del incidente + disponibilidad del cliente
- Aceptar: asignacion=`aceptada`, incidente=`en_proceso`
- Rechazar: asignacion=`rechazada`, incidente=`asignacion_solicitada`

**Gestionar trabajos** (`/tecnico/trabajos`):
- Asignaciones `aceptada`/`en_curso`/`completada`
- Crear/editar presupuesto
- Programar visita (`guardarCompromisoTecnico`)
- Completar trabajo
- Cancelar asignación aceptada (penalización 1★)

**Subir conformidad** (`/tecnico/conformidades`):
- Selecciona incidente con asignación `completada`
- Sube foto de conformidad física firmada + comprobante de compras
- Admin revisa y aprueba o rechaza

**Ver pagos** (`/tecnico/pagos`):
- Ve registros en `pagos_tecnicos`

### 6.3 Flujo del Admin / Gestor

**Gestionar incidentes** (`/dashboard/incidentes`):
- Lista completa con filtros
- Modal "Gestionar incidente" con stepper (detalle, asignación, presupuesto, conformidad, pagos)
- Ve franjas de disponibilidad del cliente por incidente

**Asignar técnico** (`/dashboard/asignaciones`):
- Crea asignación seleccionando incidente + técnico
- Ve disponibilidad del cliente + conflictos de horario entre técnicos

**Revisar presupuestos** (`/dashboard/presupuestos`):
- Ve presupuestos en estado `enviado`
- Aprueba (define `gastos_administrativos`) o rechaza

**Revisar conformidades** (`/dashboard/conformidades`):
- Ve fotos subidas por técnicos
- Aprueba con puntuación (1-5) + comentarios
- Rechaza (técnico puede volver a subir)

**Registrar pagos** (`/dashboard/pagos`):
- Registra pagos a técnicos (`pagos_tecnicos`)
- Registra cobros a clientes (`cobros_clientes`)

**Aprobar técnicos** (`/dashboard/solicitudes`):
- Aprueba o rechaza solicitudes de registro

**Ver reportes** (`/dashboard/reportes`):
- 13 reportes analíticos

---

## 7. Inventario de Features (Services)

### `features/auth/auth.service.ts`
- `getCurrentUser()` — usuario actual con rol y IDs de rol
- `requireUser()` — lanza error si no autenticado
- `isAdmin()` — true para `admin` y `gestor`
- `requireAdmin()` — lanza error si no es admin/gestor
- `requireClienteId()` / `requireTecnicoId()` — retornan IDs de rol específico

### `features/incidentes/incidentes.service.ts`
- `getIncidentesForAdmin()` — todos los incidentes con join de cliente/inmueble
- `getIncidentesForCliente(idCliente)` — incidentes propios
- `getIncidenteById(id)` — con detalles completos
- `actualizarIncidente(id, updates)` — bloquea cambio manual a `finalizado`/`resuelto`
- `getDashboardStats()` — contadores por estado
- `getTimelineIncidente(idIncidente)` — historial completo
- `calificarIncidenteAdmin(id, puntuacion, comentario)` — guarda en `incidentes.calificacion_admin`

### `features/asignaciones/asignaciones.service.ts`
- `getAsignacionesForAdmin()` — todas las asignaciones
- `getAsignacionesPendientes()` — pendientes del técnico actual
- `getAsignacionesActivas()` — aceptadas/en_curso/completadas del técnico actual
- `crearAsignacion(dto)` — crea asignación, cancela pendientes anteriores, notifica técnico
- `aceptarAsignacion(idAsignacion, idIncidente)` — asignacion=`aceptada`, incidente=`en_proceso`
- `rechazarAsignacion(idAsignacion, idIncidente)` — asignacion=`rechazada`, incidente=`asignacion_solicitada`
- `cancelarAsignacionAceptada(idAsignacion, idIncidente)` — asignacion=`cancelada`, incidente=`pendiente`, penalización 1★
- `completarAsignacion(idAsignacion)` — asignacion=`completada`

### `features/presupuestos/presupuestos.service.ts`
- `getPresupuestosForAdmin()` — todos los presupuestos
- `getPresupuestosDelIncidente(idIncidente)` — presupuestos de un incidente
- `getPresupuestosDeTecnico()` — presupuestos del técnico actual
- `crearPresupuesto(dto)` — crea en estado `enviado`
- `actualizarPresupuesto(id, updates)` — solo en estado `enviado`
- `aprobarPresupuesto(id, gastosAdministrativos)` — admin: `aprobado_admin`, recalcula total
- `rechazarPresupuesto(id)` — admin: `rechazado`, desvincula técnico si es el primer presupuesto
- `aprobarPresupuestoCliente(id)` — cliente: `aprobado`, incidente=`en_proceso`
- `rechazarPresupuestoConDecision(id, decision, nota)` — con `nuevo_tecnico` o `otra_oportunidad`
- `responderOportunidadTecnico(id, aceptar)` — técnico acepta o rechaza re-presupuestar
- `marcarPresupuestoVencido(id)` — admin

### `features/conformidades/conformidades.service.ts`
- `getConformidadesPendientes()` — con foto subida, no aprobadas, no rechazadas
- `getConformidadesHistorial()` — aprobadas (`esta_firmada=1`)
- `crearConformidadPorTecnico(idIncidente, fotoUrl, comprobanteUrl)` — flujo actual
- `aprobarConformidad(id, puntuacion, comentarios, resolvioPrblema)` — aprueba, crea calificación, incidente=`finalizado`
- `rechazarConformidad(id)` — marca `esta_rechazada=true`

### `features/disponibilidad/disponibilidad.service.ts`
- `guardarFranjasDisponibilidad(idIncidente, franjas)` — reemplaza todas las franjas del incidente
- `getFranjasDisponibilidad(idIncidente)` — franjas de un incidente
- `getFranjasParaIncidentes(ids)` — franjas agrupadas por incidente
- `getFranjasAgendaTecnico(idTecnico)` — franjas de incidentes activos del técnico (con detalle)
- `guardarCompromisoTecnico(idAsignacion, idIncidente, idTecnico, fecha, horaInicio, horaFin)` — escribe en `asignaciones_tecnico`
- `getCompromisoDeAsignacion(idAsignacion)` — lee compromiso desde `asignaciones_tecnico`
- `liberarCompromisoDeIncidente(idIncidente)` — nullifica `fecha_visita_programada` y `hora_fin_programada`
- `getConflictosTecnicos(idIncidente)` — detecta técnicos con horarios superpuestos

### `features/notificaciones/notificaciones-inapp.service.ts`
- `crearNotificacion(dto)` — notificación para técnico
- `crearNotificacionAdmin(dto)` — notificación con `para_admin=true`
- `crearNotificacionCliente(dto)` — notificación con `id_cliente`
- `getNotificacionesAdmin()` / `getNotificacionesTecnico()` / `getNotificacionesCliente()`
- `marcarTodasLeidas(rol)` — marca leídas según rol

### `features/notificaciones/notificaciones.service.ts` (email via Brevo)
11 eventos de email (fire-and-forget), cubriendo el ciclo completo del incidente: nueva asignación, presupuesto creado, presupuesto aprobado/rechazado (admin y cliente), incidente resuelto, nuevo avance, pago registrado, conformidad para firmar/rechazada.

### `features/notificaciones/badge-counts.service.ts`
- `getAdminBadgeCounts()` — incidentes pendientes, conformidades, presupuestos, pagos, solicitudes, notificaciones
- `getClienteBadgeCounts()` — presupuestos para aprobar, cobros, notificaciones
- `getTecnicoBadgeCounts()` — asignaciones disponibles, trabajos para subir conformidad, pagos, notificaciones

### `features/email/email.service.ts` (Nodemailer)
- `enviarCredencialesTecnico(correo, nombre, password)` — único uso al aprobar solicitud de técnico
- Usa `GMAIL_USER` + `GMAIL_APP_PASSWORD` env vars
- URL de la app: `https://tesis-three-drab.vercel.app`

### `features/pagos/pagos-tecnicos.service.ts`
- `getPendientesPagoTecnico()` — presupuestos `aprobado` para incidentes `finalizado` sin pago
- `getPagosTecnicosRealizados()` — historial
- `registrarPagoTecnico(dto)` — crea `pago_tecnico`

### `features/pagos/cobros-clientes.service.ts`
- `getPendientesCobroCliente()` — presupuestos `aprobado` para incidentes `finalizado` sin cobro
- `getCobrosClientesRealizados()` — historial
- `registrarCobroCliente(dto)` — crea `cobro_cliente`
- `getMisCobrosComoCliente()` — cobros del cliente actual

### `features/usuarios/usuarios.service.ts`
- `getUsuariosForAdmin()` — lista de usuarios
- `getTecnicosActivos()` — técnicos para selector de asignación
- `aprobarSolicitudTecnico(idSolicitud)` — flujo de 6 pasos
- `rechazarSolicitudTecnico(idSolicitud)` — marca como rechazada
- `getSolicitudesTecnico()` — solicitudes pendientes

### `features/inspecciones/inspecciones.service.ts`
- `getInspeccionesForAdmin()` / `getInspeccionesDelTecnico()`
- `crearInspeccion(dto)` — bloquea si ya existe presupuesto para el incidente
- `getInspeccionDelIncidente(idIncidente)`

### `features/reportes/reportes.service.ts`
13 reportes: rendimiento de técnicos, embudo de conversión, aging de incidentes, estado financiero, presupuestos por estado, incidentes por tipo de inmueble, satisfacción del cliente, KPIs administrativos, tiempo de resolución por categoría, reincidencia por propiedad, rentabilidad de técnicos, cobro promedio por técnico, trabajos por categoría.

### `features/inmuebles/inmuebles.service.ts`
- CRUD de inmuebles del cliente
- `getInmueblesDelCliente(idCliente)`

### `features/avances/avances.service.ts`
- Avances de trabajo registrados por el técnico
- Notifica al cliente por email y in-app al crear un avance

---

## 8. Sistema de Notificaciones

### 8.1 Notificaciones In-App

**Tabla:** `notificaciones`

Tres canales de destino:
- Admin: `para_admin = true`
- Técnico: `id_tecnico = <id>`
- Cliente: `id_cliente = <id>`

**Tipos de notificación:**
```
nueva_asignacion              presupuesto_enviado_admin
asignacion_aceptada           presupuesto_aprobado_admin
asignacion_rechazada          presupuesto_aprobado_cliente
asignacion_cancelada          presupuesto_rechazado
trabajo_completado            presupuesto_rechazado_cliente
nueva_conformidad             presupuesto_rechazado_oportunidad
conformidad_rechazada         presupuesto_adicional_rechazado
incidente_resuelto            presupuesto_adicional_rechazado_cliente
visita_programada             tecnico_rechaza_represupuestar
```

### 8.2 Realtime

`NotificacionesPanel` suscribe a cambios en la tabla `notificaciones` mediante `supabase.channel('notificaciones-panel-{rol}')`. El panel se actualiza en tiempo real sin necesidad de recargar.

- Admin: agrupa por `id_incidente`, máx 5 grupos
- Técnico/Cliente: agrupa en "Hoy" / "Anteriores", máx 8 ítems

### 8.3 Email Transaccional (Brevo)

- API REST de Brevo (`features/notificaciones/notificaciones.service.ts`)
- Fire-and-forget (nunca bloquea la operación principal)
- 11 eventos cubriendo el ciclo completo del incidente

### 8.4 Email Credenciales (Nodemailer/Gmail)

- Gmail SMTP (`features/email/email.service.ts`)
- Solo se usa en `aprobarSolicitudTecnico` para enviar contraseña temporal
- Variables: `GMAIL_USER`, `GMAIL_APP_PASSWORD`

### 8.5 Badge Counts

Cada rol tiene su propio `getBadgeCounts()` que carga contadores para badges de navegación. Se cargan en el dashboard de cada rol.

---

## 9. Componentes Clave

### `components/tecnico/agenda-tecnico.client.tsx`

Calendario de disponibilidad del cliente para los incidentes activos del técnico.

- Recibe `franjas: FranjaAgenda[]` como prop (cargadas en SSR)
- Muestra `DayPicker` con días marcados en azul donde hay franjas
- Al hacer click en un día filtra la lista (días sin franjas muestran estado vacío)
- Cada `FranjaCard` muestra horario, categoría, descripción, dirección
- Click en tarjeta abre `IncidenteDetailModal`
- Prop `embedded: boolean` — `true` para usar dentro de modales (sin Card wrapper)
- Prop `rol: 'tecnico' | 'admin'`

### `components/shared/agenda-tecnico-modal.client.tsx`

Modal que contiene `AgendaTecnico` con `embedded={true}`. Usado en `/tecnico/trabajos` ("Ver Mi Agenda") y en el panel admin de tecnicos.

### `components/shared/notificaciones-panel.client.tsx`

Panel in-app con Realtime. `TIPO_CATEGORIA` mapea tipos → colores e íconos. Navega a URLs específicas según tipo y rol al hacer click.

### `components/incidentes/incidente-detail-modal.tsx`

Modal de detalle de incidente reutilizable. Acepta `incidenteId`, `open`, `onOpenChange`, `rol`.

### `components/ui/calendario-disponibilidad.tsx`

Selector de franjas de disponibilidad usado en creación/edición de incidentes (vista cliente). Permite seleccionar múltiples combinaciones fecha + hora_inicio + hora_fin.

---

## 10. Rutas Completas

### Rutas públicas

| Ruta | Descripción |
|---|---|
| `/` | Landing page |
| `/login` | Login |
| `/register` | Registro de cliente o solicitud de técnico |
| `/cambiar-password` | Cambio de contraseña de primer acceso |

### Rutas cliente `/cliente/*`

| Ruta | Descripción |
|---|---|
| `/cliente` | Dashboard con contadores y notificaciones |
| `/cliente/incidentes` | Lista de incidentes |
| `/cliente/incidentes/nuevo` | Reportar nuevo incidente |
| `/cliente/incidentes/[id]` | Detalle de incidente |
| `/cliente/presupuestos` | Presupuestos para aprobar |
| `/cliente/conformidades` | Estado de conformidades |
| `/cliente/pagos` | Cobros del cliente |
| `/cliente/perfil` | Perfil |
| `/inmueble/*` | Gestión de inmuebles (compartida con admin) |

### Rutas técnico `/tecnico/*`

| Ruta | Descripción |
|---|---|
| `/tecnico` | Dashboard con agenda y contadores |
| `/tecnico/disponibles` | Asignaciones pendientes |
| `/tecnico/trabajos` | Trabajos activos |
| `/tecnico/presupuestos` | Presupuestos del técnico |
| `/tecnico/conformidades` | Subir fotos de conformidad |
| `/tecnico/pagos` | Pagos recibidos |
| `/tecnico/perfil` | Perfil |

### Rutas admin `/dashboard/*`

| Ruta | Descripción |
|---|---|
| `/dashboard` | Panel principal con KPIs |
| `/dashboard/incidentes` | Gestión de incidentes |
| `/dashboard/asignaciones` | Gestión de asignaciones |
| `/dashboard/tecnicos` | Lista y detalle de técnicos |
| `/dashboard/solicitudes` | Solicitudes de registro |
| `/dashboard/presupuestos` | Revisión de presupuestos |
| `/dashboard/conformidades` | Revisión de conformidades |
| `/dashboard/pagos` | Registro de pagos y cobros |
| `/dashboard/clientes` | Lista de clientes |
| `/dashboard/inspecciones` | Inspecciones |
| `/dashboard/reportes` | 13 reportes analíticos |

---

## 11. Cambios desde Febrero 2026

### Correcciones a errores documentados previamente

**Estados de incidente incorrectos:** La documentación anterior mencionaba estados `asignado` y `reportado` que nunca existieron en la DB. Los estados correctos son:
- `pendiente` (no `reportado`)
- `asignacion_solicitada` (no `asignado`) — estado intermedio: admin asignó, técnico aún no aceptó

**Bug del gestor en middleware:** El middleware bloqueaba a gestores en `/dashboard/*`. Corregido en `middleware.ts`. Ahora la condición es `userRole !== 'admin' && userRole !== 'gestor'`.

### Nuevas funcionalidades

**Disponibilidad del cliente (`franjas_disponibilidad`):**
- Nueva tabla en DB (reemplazó el campo `disponibilidad` texto libre en `incidentes`)
- Al reportar un incidente el cliente define franjas con fecha + hora_inicio + hora_fin
- El técnico ve estas franjas en su agenda (dashboard + modal)
- El admin ve disponibilidad al gestionar asignaciones
- Detección de conflictos de horario entre técnicos (`getConflictosTecnicos`)

**Tabla `compromisos_tecnico` eliminada:**
- Los compromisos de visita ahora se almacenan en `asignaciones_tecnico`:
  - `fecha_visita_programada` TIMESTAMPTZ
  - `hora_fin_programada` TIME

**Estado `cancelada` en asignaciones:**
- Técnico puede cancelar una asignación ya aceptada
- Consecuencias: asignacion=`cancelada`, incidente=`pendiente`, penalización 1★ automática

**Flujo de conformidad rediseñado:**
- Antes: admin creaba conformidad vacía → cliente firmaba digitalmente
- Ahora: técnico sube foto de conformidad física firmada por el cliente
- Admin revisa la foto y aprueba (con calificación) o rechaza
- Al rechazar: registro marcado como `esta_rechazada=true`, técnico puede volver a subir

**Primer acceso de técnicos (`debe_cambiar_password`):**
- Al aprobar una solicitud se establece `debe_cambiar_password=true`
- El middleware intercepta y redirige a `/cambiar-password`
- El técnico recibe contraseña temporal por email

**Dos sistemas de email:**
- Brevo REST API: notificaciones transaccionales (11 eventos)
- Nodemailer/Gmail SMTP: exclusivamente para credenciales de nuevo técnico

**Pagos separados por destinatario:**
- `pagos_tecnicos`: pago a técnico (monto = materiales + mano_obra, sin comisión)
- `cobros_clientes`: cobro al cliente (monto = costo_total con comisión incluida)

**Presupuesto adicional:**
- Si ya existe un presupuesto `aprobado` y se rechaza uno nuevo, el técnico no es desvinculado

**Flujo `otra_oportunidad`:**
- El cliente puede rechazar con decisión `'otra_oportunidad'`
- El técnico responde si acepta re-presupuestar
- Si rechaza: incidente vuelve a `pendiente`

**Reportes ampliados:**
- `reportes.service.ts` ahora incluye 13 reportes analíticos

---

## Archivos Esenciales de Referencia

```
frontend/
├── shared/
│   ├── lib/supabase/
│   │   ├── middleware.ts              — protección de rutas + debe_cambiar_password
│   │   ├── server.ts                  — cliente Supabase para SSR/services
│   │   ├── admin.ts                   — cliente admin (bypass RLS)
│   │   └── client.ts                  — cliente browser (auth + realtime)
│   └── types/
│       └── enums.ts                   — estados válidos (fuente de verdad)
├── features/
│   ├── auth/auth.service.ts
│   ├── incidentes/incidentes.service.ts
│   ├── asignaciones/asignaciones.service.ts
│   ├── presupuestos/presupuestos.service.ts
│   ├── conformidades/conformidades.service.ts
│   ├── disponibilidad/disponibilidad.service.ts
│   ├── notificaciones/
│   │   ├── notificaciones-inapp.service.ts
│   │   ├── notificaciones.service.ts   — email via Brevo
│   │   └── badge-counts.service.ts
│   ├── email/email.service.ts          — Nodemailer/Gmail para credenciales
│   ├── pagos/
│   │   ├── pagos-tecnicos.service.ts
│   │   └── cobros-clientes.service.ts
│   ├── reportes/reportes.service.ts
│   └── usuarios/usuarios.service.ts
├── components/
│   ├── tecnico/agenda-tecnico.client.tsx
│   ├── shared/agenda-tecnico-modal.client.tsx
│   ├── shared/notificaciones-panel.client.tsx
│   └── incidentes/incidente-detail-modal.tsx
└── app/
    ├── (cliente)/cliente/incidentes/nuevo/page.tsx
    ├── (tecnico)/tecnico/page.tsx
    ├── (admin)/dashboard/pagos/page.tsx
    └── cambiar-password/
```
