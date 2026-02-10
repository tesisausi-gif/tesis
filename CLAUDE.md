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

### 2. Gestion de Tareas via Azure DevOps (OBLIGATORIO)

Las tareas del proyecto se gestionan en Azure DevOps:
- **Organizacion:** https://dev.azure.com/fauspieroni
- **Proyecto:** Tesis

**Al INICIO de cada sesion:**
- Consultar los work items activos en Azure DevOps para entender el estado actual

**Al FINAL de cada sesion (antes del ultimo commit):**
- Actualizar work items en Azure DevOps reflejando:
  - Bugs corregidos (cerrar el Bug correspondiente)
  - Features completadas (mover a Done/Closed)
  - Nuevos bugs descubiertos (crear nuevo Bug)
  - Progreso parcial (agregar comentario al work item)

**Estructura en Azure DevOps:**
- **Epics** = Fases del roadmap (Fase 1: Bugs, Fase 2: Services, etc.)
- **Features** = Tareas concretas vinculadas a su Epic
- **Bugs** = Bugs detectados con severidad y pasos de reproduccion

### 3. Documentacion de Referencia

- `documentacion/ANALISIS_FLUJOS.md` — Arquitectura, modelo de datos, roles, flujos por rol
