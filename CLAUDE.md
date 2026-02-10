# CLAUDE.md - Sistema de Gestion de Incidentes ISBA

## Reglas Criticas

### 1. Arquitectura Feature-Based (OBLIGATORIO)

Toda funcionalidad se organiza en `features/{nombre}/` con exactamente 2 archivos:
- `types.ts` — Tipos e interfaces del modulo
- `service.ts` — Funciones con `'use server'` para todas las operaciones de DB

**Reglas:**
- Los services usan `createClient()` de `lib/supabase/server.ts` para operaciones de datos
- Los services usan `createAdminClient()` de `lib/supabase/admin.ts` SOLO para bypass de RLS (crear/eliminar usuarios)
- `lib/supabase/client.ts` se usa UNICAMENTE para `supabase.auth.*` (login/register/signOut) y suscripciones realtime
- Las funciones de escritura retornan `Promise<ActionResult>` con try/catch
- Los componentes `.client.tsx` llaman a funciones de service directamente como Server Actions
- Los `page.tsx` llaman a funciones de service para datos iniciales (SSR)
- NO crear rutas API (`app/api/`), todo va por services

### 2. Gestion de Tareas por Sesion (OBLIGATORIO)

**Al INICIO de cada sesion:**
- Leer `documentacion/TAREAS_PENDIENTES.md` para entender el estado actual del proyecto

**Al FINAL de cada sesion (antes del ultimo commit):**
- Actualizar `documentacion/TAREAS_PENDIENTES.md` reflejando:
  - Bugs corregidos (marcar con [x])
  - Funcionalidades implementadas (actualizar tablas de estado)
  - Nuevos bugs descubiertos
  - Cambios en porcentajes de avance
  - Entrada en el Historial de Cambios con fecha y resumen

### 3. Documentacion de Referencia

- `documentacion/ANALISIS_FLUJOS.md` — Arquitectura, modelo de datos, roles, flujos por rol
- `documentacion/TAREAS_PENDIENTES.md` — Bugs, estado de implementacion, flujos faltantes, roadmap
