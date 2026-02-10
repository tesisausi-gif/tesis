# Tareas Pendientes - Sistema de Gestion de Incidentes ISBA

> **Ultima actualizacion:** 2026-02-09
> **Completitud general: ~52%**
>
> Este archivo se actualiza en cada sesion de trabajo.
> Para entender los flujos del sistema ver → [ANALISIS_FLUJOS.md](./ANALISIS_FLUJOS.md)

---

## Indice

1. [Bugs Criticos](#1-bugs-criticos)
2. [Estado de Implementacion por Modulo](#2-estado-de-implementacion-por-modulo)
3. [Flujos Faltantes](#3-flujos-faltantes)
4. [Roadmap](#4-roadmap)
5. [Historial de Cambios](#5-historial-de-cambios)

---

## 1. Bugs Criticos

### BUG 1: Estados invalidos en asignaciones.service.ts

```
SEVERIDAD: CRITICA                                          ESTADO: [ ] PENDIENTE
UBICACION: asignaciones.service.ts

PROBLEMA:
  - aceptarAsignacion() escribe 'asignado' en incidentes.estado_actual
  - rechazarAsignacion() escribe 'reportado' en incidentes.estado_actual
  - La DB solo permite: 'pendiente', 'en_proceso', 'resuelto'
  - Causa error PostgreSQL CHECK constraint violation en runtime

FIX:
  - aceptarAsignacion: NO cambiar estado incidente (ya esta en 'en_proceso')
  - rechazarAsignacion: cambiar a 'pendiente' si no quedan asignaciones activas
```

### BUG 2: Middleware bloquea gestor

```
SEVERIDAD: MEDIA                                            ESTADO: [ ] PENDIENTE
UBICACION: middleware.ts lineas 95-96

PROBLEMA:
  El middleware solo permite rol === 'admin' para /dashboard/*
  Pero isAdmin() y requireAdmin() aceptan 'gestor' tambien

FIX:
  Cambiar condicion: userRole !== 'admin' && userRole !== 'gestor'
```

### BUG 3: Enums desincronizados

```
SEVERIDAD: MEDIA                                            ESTADO: [ ] PENDIENTE
UBICACION: shared/types/enums.ts

PROBLEMA:
  EstadoIncidente tiene 10 valores PascalCase
  La DB solo permite 3 valores lowercase (pendiente, en_proceso, resuelto)
  Los color maps no sirven con los estados reales

FIX:
  Reescribir enums para que coincidan con los CHECK constraints de la DB
```

### BUG 4: database.types.ts desactualizado

```
SEVERIDAD: MEDIA                                            ESTADO: [ ] PENDIENTE

PROBLEMA:
  - Incluye tipo_cliente en clientes (columna eliminada)
  - No incluye tablas: usuarios, solicitudes_registro, especialidades, avances_reparacion
  - No refleja los CHECK constraints simplificados

FIX:
  Regenerar con: npx supabase gen types typescript
```

---

## 2. Estado de Implementacion por Modulo

### Leyenda

```
  OK  = Implementado via service (patron correcto)
  DIR = Implementado con acceso directo a Supabase (sin service)
  NO  = No implementado
  BUG = Implementado con bugs
```

### 2.1 Incidentes

| Funcionalidad | Admin | Cliente | Tecnico | Estado |
|--------------|:-----:|:-------:|:-------:|--------|
| Listar | OK | OK | via asignaciones | OK |
| Ver detalle | OK | OK | via asignaciones | OK |
| Crear | NO | DIR | NO | **Falta service** |
| Actualizar estado | OK | NO | NO | OK |
| Timeline | DIR | DIR | NO | **Falta service** |
| Buscar/filtrar | OK | OK | NO | OK |

### 2.2 Asignaciones

| Funcionalidad | Admin | Cliente | Tecnico | Estado |
|--------------|:-----:|:-------:|:-------:|--------|
| Listar | DIR | NO | OK | **Admin falta service** |
| Crear | DIR | NO | NO | OK |
| Aceptar | NO | NO | BUG | **Bug estado** |
| Rechazar | NO | NO | BUG | **Bug estado** |
| Trabajos activos | NO | NO | OK | OK |
| Realtime badge | NO | NO | OK | OK |

### 2.3 Inmuebles

| Funcionalidad | Admin | Cliente | Tecnico | Estado |
|--------------|:-----:|:-------:|:-------:|--------|
| Listar | DIR | OK | NO | **Admin falta service** |
| Crear | NO | OK | NO | OK |
| Editar | NO | OK | NO | OK |
| Toggle activo | NO | OK | NO | OK |
| Ver detalle | DIR | DIR | NO | **Falta service** |

### 2.4 Presupuestos

| Funcionalidad | Admin | Cliente | Tecnico | Estado |
|--------------|:-----:|:-------:|:-------:|--------|
| Listar | DIR | DIR | DIR | **Sin service** |
| Crear | DIR | NO | DIR | **Sin service** |
| Aprobar (admin) | DIR | NO | NO | **Sin service** |
| Aprobar (cliente) | NO | NO | NO | **No implementado** |
| Rechazar | NO | NO | NO | **No implementado** |

### 2.5 Pagos

| Funcionalidad | Admin | Cliente | Tecnico | Estado |
|--------------|:-----:|:-------:|:-------:|--------|
| Listar | DIR | DIR | NO | **Sin service** |
| Registrar | DIR | NO | NO | **Sin service** |

### 2.6 Usuarios/Personas

| Funcionalidad | Estado |
|--------------|--------|
| Listar usuarios/empleados/clientes/tecnicos | OK |
| CRUD empleados | OK |
| CRUD clientes (toggle/editar) | OK |
| CRUD tecnicos (toggle/editar) | OK |
| Eliminar usuario | OK |
| Solicitudes registro (listar/aprobar/rechazar) | OK |
| Especialidades CRUD | OK |
| Calificaciones tecnico (lectura) | OK |

### 2.7 Modulos SIN implementacion

| Tabla DB | Service | UI | RLS | Estado |
|---------|---------|----|----|--------|
| `inspecciones` | NO | Solo lectura en modal | NO | **Sin implementar** |
| `conformidades` | NO | NO | NO | **Solo existe tabla** |
| `calificaciones` | Solo lectura | NO escritura | NO | **Parcial** |
| `documentos` | NO | NO | NO | **Solo existe tabla** |
| `avances_reparacion` | NO | NO | NO | **Solo existe tabla** |

---

## 3. Flujos Faltantes

### 3.1 Criticos (necesarios para completar el ciclo de vida)

```
  PRIORIDAD       FLUJO                                         ESFUERZO   ESTADO
  ────────────────────────────────────────────────────────────────────────────────
  [CRITICO]   1. Crear incidente via service                    Bajo       [ ]
  [CRITICO]   2. Flujo de inspecciones (CRUD completo)          Medio      [ ]
  [ALTO]      3. Presupuestos service (CRUD + estados)          Medio-Alto [ ]
  [CRITICO]   4. Cliente aprueba/rechaza presupuesto            Medio      [ ]
  [ALTO]      5. Avances de reparacion                          Medio      [ ]
  [ALTO]      6. Pagos service (CRUD completo)                  Medio      [ ]
  [MEDIO]     7. Conformidades (flujo completo de firma)        Alto       [ ]
```

**Detalle:**

1. **Crear incidente via service** — Mover logica de `/cliente/incidentes/nuevo` (client.ts directo) a `crearIncidente()` en `incidentes.service.ts`
2. **Inspecciones** — Crear `inspecciones.service.ts` + `inspecciones.types.ts` + UI para que el tecnico registre inspecciones
3. **Presupuestos service** — Crear `presupuestos.service.ts` + `presupuestos.types.ts`, migrar todas las paginas de presupuestos
4. **Cliente aprueba presupuesto** — UI + service para aprobar/rechazar desde `/cliente/presupuestos`
5. **Avances de reparacion** — Service + types + UI para que el tecnico reporte progreso (tabla `avances_reparacion` existe pero no se usa)
6. **Pagos service** — Crear `pagos.service.ts` + `pagos.types.ts`, migrar paginas de pagos
7. **Conformidades** — Todo: service + types + UI + RLS para firma de conformidad del cliente

### 3.2 Mejoras (no bloquean pero mejoran UX)

| # | Flujo | Descripcion | Esfuerzo | Estado |
|---|-------|-------------|----------|--------|
| 8 | Recuperar contrasena | `/forgot-password` + email de reset | Medio | [ ] |
| 9 | Configuracion admin | Pagina `/dashboard/configuracion` (da 404) | Bajo | [ ] |
| 10 | Calificaciones escritura | Cliente califica tecnico post-resolucion | Medio | [ ] |
| 11 | Documentos/Fotos | Subir fotos del incidente/inmueble/trabajo | Alto | [ ] |
| 12 | Notificaciones | Email/push al cambiar estado | Alto | [ ] |
| 13 | Realtime en admin | Live updates en dashboard admin | Medio | [ ] |
| 14 | Historial de cambios | Log de cambios por usuario | Medio | [ ] |
| 15 | Dashboard metricas | Graficos, tiempos promedio, ranking tecnicos | Medio | [ ] |
| 16 | RLS faltantes | Policies para inspecciones, conformidades, calificaciones, documentos | Bajo | [ ] |
| 17 | Exportar reportes | PDF/Excel de incidentes, pagos | Medio | [ ] |

---

## 4. Roadmap

### Porcentaje de Avance por Area

```
AUTENTICACION       ████████████████████░░░░  80%
INCIDENTES          ██████████████████░░░░░░  72%
ASIGNACIONES        ████████████████░░░░░░░░  64%
INMUEBLES           ██████████████████████░░  88%
USUARIOS/PERSONAS   ████████████████████████  96%
PRESUPUESTOS        ██████████░░░░░░░░░░░░░░  40%
PAGOS               ████████░░░░░░░░░░░░░░░░  32%
INSPECCIONES        ████░░░░░░░░░░░░░░░░░░░░  16%
CONFORMIDADES       ░░░░░░░░░░░░░░░░░░░░░░░░   0%
CALIFICACIONES      ████░░░░░░░░░░░░░░░░░░░░  16%
DOCUMENTOS          ░░░░░░░░░░░░░░░░░░░░░░░░   0%
AVANCES REPARACION  ░░░░░░░░░░░░░░░░░░░░░░░░   0%
RLS POLICIES        ██████████████░░░░░░░░░░  56%
```

### Fases de Desarrollo

```
  FASE 1: BUGS CRITICOS (2-3 dias)
  ─────────────────────────────────
  [ ] Fix estados asignaciones.service
  [ ] Fix middleware gestor
  [ ] Sincronizar enums con DB
  [ ] Regenerar database.types.ts

  FASE 2: SERVICES FALTANTES (8-10 dias)
  ───────────────────────────────────────
  [ ] presupuestos.service + types .................. 3 dias
  [ ] pagos.service + types ......................... 2 dias
  [ ] inspecciones.service + types .................. 2 dias
  [ ] crearIncidente en incidentes.service .......... 1 dia

  FASE 3: FLUJOS CRITICOS (7 dias)
  ─────────────────────────────────
  [ ] Cliente aprueba/rechaza presupuesto ........... 2 dias
  [ ] Tecnico registra inspeccion (UI) .............. 3 dias
  [ ] Avances de reparacion (service + UI) .......... 2 dias

  FASE 4: CIERRE DEL CICLO (6 dias)
  ──────────────────────────────────
  [ ] Conformidades service + UI .................... 3 dias
  [ ] Calificaciones escritura ...................... 2 dias
  [ ] RLS policies faltantes ........................ 1 dia

  FASE 5: MEJORAS (10+ dias)
  ──────────────────────────
  [ ] Documentos/Fotos .............................. 4 dias
  [ ] Recuperar contrasena .......................... 2 dias
  [ ] Notificaciones ................................ 3 dias
  [ ] Dashboard configuracion ....................... 1 dia
```

### Top 5 Prioridades Inmediatas

| # | Tarea | Por que | Esfuerzo |
|---|-------|---------|---------:|
| 1 | **Fix bugs de estados en asignaciones** | Error en runtime, bloquea flujo tecnico | 1-2 hs |
| 2 | **Fix middleware para gestor** | Rol inutilizable | 15 min |
| 3 | **Crear `presupuestos.service.ts`** | Modulo mas usado sin service layer | 1-2 dias |
| 4 | **Cliente aprueba/rechaza presupuesto** | Flujo no avanza sin esto | 1 dia |
| 5 | **Crear `inspecciones.service.ts`** | Tecnico no puede registrar inspecciones | 1 dia |

---

## 5. Historial de Cambios

| Fecha | Sesion | Cambios |
|-------|--------|---------|
| 2026-02-09 | Analisis inicial | Creacion del documento. Analisis completo de 16 tablas, 48 funciones, 30+ paginas. Detectados 4 bugs criticos, 7 flujos faltantes criticos, 10 mejoras. Completitud: ~52% |
