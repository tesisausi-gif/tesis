# Cambios — 21 Mar 2026

## Qué se hizo

| # | Cambio | Archivos clave |
|---|--------|----------------|
| 1 | Sidebar de 11 → 9 items (quitamos Inmuebles y Asignaciones) | `admin-sidebar.tsx` |
| 2 | Página `/dashboard/asignaciones` eliminada | — |
| 3 | Página `/dashboard/propiedades` eliminada | — |
| 4 | Columna "Dirección" → "Inmueble" con link a `/inmueble/[id]` | `incidentes-content.client.tsx` |
| 5 | Columna "Técnico" en tab En Proceso | `incidentes-content.client.tsx`, `incidentes.service.ts` |
| 6 | Presupuestos: página unificada con tabs "Por aprobar" / "Todos" | `presupuestos-admin-content.client.tsx`, `presupuestos/page.tsx` |
| 7 | Dashboard: click en incidente reciente → navega a la tabla con foco animado | `dashboard-content.client.tsx`, `incidentes-content.client.tsx` |
| 8 | Eliminación de "Prioridad" de toda la UI | múltiples componentes |
| 9 | Bandeja Pendientes: tabla simplificada + modal wizard "Gestionar" | `gestionar-pendiente-modal.tsx`, `incidentes-content.client.tsx` |
| 10 | Nuevo estado `asignacion_solicitada` + bandeja intermedia | `enums.ts`, `colors.ts`, `asignaciones.service.ts`, DB migration |
| 11 | Modal Gestionar: muestra disponibilidad del cliente, renombra paso 2 a "Solicitud de asignación" | `gestionar-pendiente-modal.tsx` |
| 12 | Realtime en bandeja de incidentes: se actualiza automáticamente | `incidentes-content.client.tsx` |
| 13 | Dashboard: badge "Re-asignaciones" cuando técnico rechaza | `badge-counts.service.ts`, `dashboard-content.client.tsx` |

---

## Detalle de cada cambio

### 1–3. Simplificación del sidebar y páginas eliminadas
Quitamos Inmuebles y Asignaciones del menú. Las páginas `/dashboard/propiedades` y `/dashboard/asignaciones` dan 404. El acceso al inmueble quedó como link en la tabla de incidentes.

### 4–5. Mejoras en la tabla de incidentes
- Columna "Dirección" → "Inmueble" con ícono `ExternalLink` que navega a `/inmueble/[id]`.
- Tab "En Proceso" muestra una columna extra "Técnico" con el nombre del técnico asignado (busca asignación con `estado_asignacion = 'aceptada'`).

### 6. Presupuestos unificados
Reemplazamos la página vieja (client-side, `select('*')`) y la subpágina `/presupuestos/aprobar` por una sola página server-side con dos tabs:
- **Por aprobar**: presupuestos en estado `enviado`. Aprobar abre modal con campo de gastos administrativos opcionales.
- **Todos**: vista completa.

### 7. Navegación desde dashboard con foco animado
Los incidentes en "Actividad Reciente" del dashboard son ahora clickeables (hover azul sutil). Al hacer click navegan a `/dashboard/incidentes?highlight={id}`. La tabla de incidentes lee el param, cambia al tab correcto, hace scroll al row y dispara un fade de fondo ámbar que se desvanece en ~2 segundos.

### 8. Eliminación de "Prioridad"
Campo `nivel_prioridad` removido de: tabla admin, modal de detalle, selector del tab Gestión, modal asignar técnico, vistas del técnico (disponibles y trabajos), vista del cliente, y sección de métricas.

### 9. Bandeja Pendientes: gestión guiada
La tabla de pendientes quedó con solo 4 columnas: **ID**, **Cliente**, **Fecha Ingreso**, **[Gestionar]**.

El botón Gestionar abre un modal wizard de 3 pasos con stepper visual:
1. **Categorización** — select obligatorio. Si ya tiene categoría la pre-rellena y avisa. Solo escribe en DB si cambió.
2. **Asignación de técnico** — lista filtrada por categoría, ordenada por calificación. Si no hay técnicos para la categoría → empty state con "Cambiar categoría".
3. **Confirmación** — card verde con resumen: técnico notificado, incidente movido a En Proceso, recordatorio de que el técnico debe aceptar.

Al cerrar el paso 3 llama `router.refresh()` → el row desaparece de Pendientes sin recargar la página completa.

---

## Cómo probar

### Sidebar y páginas eliminadas
- Menú debe tener 9 items (sin Inmuebles, sin Asignaciones).
- `/dashboard/propiedades` y `/dashboard/asignaciones` → 404.

### Foco desde dashboard
1. Dashboard → hacer click en un incidente de "Actividad Reciente".
2. Navega a Incidentes, tab correcto activo, row con fondo ámbar que se desvanece.

### Gestionar pendiente
1. Ir a **Incidentes** → tab **Pendientes**.
2. Verificar: solo columnas ID, Cliente, Fecha Ingreso, Gestionar.
3. Click **Gestionar** → abre modal con stepper.
4. Paso 1: seleccionar categoría → Continuar.
5. Paso 2: seleccionar técnico → Confirmar asignación.
6. Paso 3: leer confirmación → Cerrar → el row desaparece.

### Presupuestos
1. **Presupuestos** → tabs "Por aprobar" y "Todos".
2. Click Aprobar → modal con gastos administrativos opcionales.
3. Click rechazar (ícono rojo) → estado cambia a rechazado.

### Sin prioridad
- Ninguna tabla, modal ni vista debe mostrar campo de prioridad.

---

## Cambios 10–13: Estado `asignacion_solicitada` y realtime

### 10. Nuevo estado `asignacion_solicitada`
Máquina de estados: `pendiente → asignacion_solicitada → en_proceso → resuelto`.

- **DB migration**: actualiza el CHECK constraint para incluir el nuevo valor.
- Al asignar técnico (modal Gestionar), el incidente pasa a `asignacion_solicitada` (antes pasaba directo a `en_proceso`).
- Si el técnico **acepta** → pasa a `en_proceso` (sin cambios en `aceptarAsignacion`).
- Si el técnico **rechaza** → incidente *queda* en `asignacion_solicitada` (antes volvía a `pendiente`). El admin puede re-asignar desde la nueva bandeja.

### 11. Modal Gestionar mejorado
- **Paso 1** muestra la disponibilidad horaria que el cliente dejó al reportar el incidente (si la hay).
- El stepper renombra el paso 2 de "Asignación" → **"Solicitud de asignación"**.
- El texto de confirmación (paso 3) refleja que el incidente pasa a "Asignación Solicitada", no a "En Proceso".

### 12. Realtime en bandeja de incidentes
La tabla de incidentes del admin tiene ahora una suscripción Supabase Realtime sobre las tablas `incidentes` y `asignaciones_tecnico`. Cuando el técnico acepta o rechaza, la tabla se actualiza automáticamente (vía `router.refresh()`) sin que el admin deba refrescar manualmente.

La nueva bandeja **"Asig. Solicitada"** muestra:
- ID, Cliente, Inmueble, Técnico solicitado, Estado de la solicitud (badge naranja = esperando, badge rojo = rechazada), Fecha.
- Si la solicitud fue **rechazada**, el row se tinta en rojo suave y aparece el botón **Re-asignar** (naranja) que abre el modal Gestionar de nuevo.

### 13. Badge de re-asignaciones en dashboard
En la sección "Requieren atención" del dashboard, aparece una nueva tarjeta roja **"Re-asignaciones"** cuando hay técnicos que rechazaron. Hace click → navega a la bandeja correspondiente. El conteo usa `badge-counts.service.ts` que cruza `asignaciones_tecnico.estado = 'rechazada'` + `incidentes.estado = 'asignacion_solicitada'`.

---

## Cómo probar los cambios 10–13

### Nueva bandeja
1. Ir a **Incidentes** → verificar que hay 4 tabs: Pendientes / Asig. Solicitada / En Proceso / Resueltos.
2. Gestionar un incidente pendiente → Paso 3: confirmación dice "Asignación Solicitada".
3. El incidente desaparece de Pendientes y aparece en **Asig. Solicitada** con badge naranja "Esperando respuesta".

### Técnico rechaza
1. Loguearse como técnico → rechazar la asignación recibida.
2. Sin recargar la página del admin, el row del incidente en **Asig. Solicitada** cambia a fondo rojo con badge "Rechazada" y botón "Re-asignar".
3. En el dashboard aparece la tarjeta roja "Re-asignaciones".

### Técnico acepta
1. Loguearse como técnico → aceptar la asignación.
2. Sin recargar la página del admin, el incidente desaparece de **Asig. Solicitada** y aparece en **En Proceso**.

### Disponibilidad en modal
1. Reportar un incidente con comentario de disponibilidad.
2. Admin → Gestionar → Paso 1: debe aparecer el comentario de disponibilidad en cursiva dentro de la card azul.
