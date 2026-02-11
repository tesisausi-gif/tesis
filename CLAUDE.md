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

### 3. Metodologia de Desarrollo (OBLIGATORIO)

**Antes de implementar cualquier feature o cambio significativo:**
1. Usar el agente `code-explorer` para analizar el codigo existente relacionado
2. Usar el agente `code-architect` para diseñar la solucion antes de escribir codigo
3. Seguir los patrones existentes en features ya implementadas (ej: `usuarios/`, `incidentes/`)

**Durante la implementacion:**
- Usar el skill `feature-dev` para desarrollo guiado de features nuevas
- Usar el skill `next-best-practices` al crear componentes, pages o routes de Next.js
- Usar el skill `supabase-postgres-best-practices` al escribir queries o modificar schema
- Usar el skill `frontend-design` para UI de calidad cuando se creen componentes visuales

**Despues de implementar:**
- Usar el agente `code-reviewer` para revisar el codigo escrito
- Usar el agente `code-simplifier` para simplificar si quedo complejo
- Verificar que no se rompio nada existente

**Reglas de calidad:**
- NO escribir codigo sin antes leer y entender el codigo existente del modulo
- NO inventar patrones nuevos — copiar de features ya implementadas
- Ante la duda, usar `EnterPlanMode` para planificar antes de ejecutar

### 4. Documentacion de Referencia

- `documentacion/ANALISIS_FLUJOS.md` — Arquitectura, modelo de datos, roles, flujos por rol
