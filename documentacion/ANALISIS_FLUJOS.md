# Analisis Completo de Flujos - Sistema de Gestion de Incidentes ISBA

> **Fecha de analisis:** 2026-02-09
> **Cobertura del analisis:** 16 tablas DB, 48 funciones de servicio, 30+ paginas, 5 componentes client
>
> Para tareas pendientes, bugs y roadmap ver → [TAREAS_PENDIENTES.md](./TAREAS_PENDIENTES.md)

---

## Indice

1. [Arquitectura General](#1-arquitectura-general)
2. [Modelo de Datos](#2-modelo-de-datos)
3. [Roles y Permisos](#3-roles-y-permisos)
4. [Flujo de Autenticacion](#4-flujo-de-autenticacion)
5. [Flujo Principal: Ciclo de Vida del Incidente](#5-flujo-principal-ciclo-de-vida-del-incidente)
6. [Flujos por Rol](#6-flujos-por-rol)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15)                    │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  (auth)  │  │ (admin)  │  │(cliente) │  │  (tecnico)   │   │
│  │ /login   │  │/dashboard│  │ /cliente  │  │  /tecnico    │   │
│  │/register │  │   /*     │  │    /*     │  │     /*       │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │             │               │            │
│  ┌────▼──────────────▼─────────────▼───────────────▼────────┐  │
│  │                   MIDDLEWARE (supabase)                    │  │
│  │            Proteccion de rutas por ROL                    │  │
│  └────┬──────────────┬─────────────┬───────────────┬────────┘  │
│       │              │             │               │            │
│  ┌────▼──────────────▼─────────────▼───────────────▼────────┐  │
│  │                 FEATURES (services + types)               │  │
│  │  auth │ incidentes │ asignaciones │ inmuebles │ usuarios  │  │
│  └────┬──────────────┬─────────────┬───────────────┬────────┘  │
│       │              │             │               │            │
│  ┌────▼──────────────▼─────────────▼───────────────▼────────┐  │
│  │              SUPABASE CLIENTS                             │  │
│  │  server.ts (services)  │  admin.ts (bypass RLS)          │  │
│  │  client.ts (auth + realtime + pages que NO migraron)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS (PostgREST)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Backend)                         │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   Auth   │  │PostgreSQL│  │   RLS    │  │  Realtime     │   │
│  │  (JWT)   │  │ 16 tablas│  │ Policies │  │ (1 channel)   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                 │
│  Trigger: on_auth_user_created -> handle_new_user()            │
│  (Crea automaticamente usuarios + clientes/tecnicos)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Modelo de Datos

### Diagrama Entidad-Relacion

```
  ┌──────────────┐         ┌──────────────┐
  │  AUTH.USERS  │─trigger─▶│   USUARIOS   │
  └──────────────┘         └──────┬───┬───┘
                                  │   │
                    id_cliente?   │   │  id_tecnico?
                         ┌────────┘   └────────┐
                         ▼                      ▼
                  ┌──────────────┐       ┌──────────────┐
                  │   CLIENTES   │       │   TECNICOS   │
                  └──┬───┬───┬──┘       └──┬───┬───┬──┘
                     │   │   │              │   │   │
          posee──────┘   │   └──reporta     │   │   └──recibe
               │         │         │        │   │         │
               ▼         │         ▼        │   │         ▼
        ┌────────────┐   │  ┌────────────┐  │   │  ┌────────────────┐
        │ INMUEBLES  │   │  │CONFORMIDAD.│  │   │  │ CALIFICACIONES │
        └──┬─────┬───┘   │  └────────────┘  │   │  └────────────────┘
           │     │        │                  │   │
   tipo────┘  ubicado     │                  │   └──realiza
        │       │         │                  │         │
        ▼       ▼         │                  │         ▼
  ┌───────────┐           │                  │  ┌──────────────┐
  │TIPOS_INM. │ ┌─────────────────┐          │  │ INSPECCIONES │
  └───────────┘ │   INCIDENTES    │◀─────────┘  └──────┬───────┘
                └──┬──┬──┬──┬──┬──┘                     │
                   │  │  │  │  │                  basado en?
                   │  │  │  │  │                        │
      asignado─────┘  │  │  │  └──documentado    ┌──────▼───────┐
          │            │  │  │         │          │PRESUPUESTOS  │
          ▼            │  │  │         ▼          └──────┬───────┘
  ┌────────────────┐   │  │  │  ┌────────────┐          │
  │ ASIGNACIONES   │   │  │  │  │ DOCUMENTOS │    pagado via
  │    TECNICO     │   │  │  │  └────────────┘          │
  └────────────────┘   │  │  │                          ▼
                       │  │  └──avances          ┌──────────────┐
            calificado─┘  │        │             │    PAGOS     │
                          │        ▼             └──────────────┘
                          │  ┌────────────┐
               pagado─────┘  │  AVANCES   │
                             │ REPARACION │
                             └────────────┘

  ┌──────────────────┐                    ┌──────────────────┐
  │   SOLICITUDES    │──se convierte en──▶│    TECNICOS      │
  │    REGISTRO      │                    └──────────────────┘
  └──────────────────┘
  ┌──────────────────┐                    ┌──────────────────┐
  │  ESPECIALIDADES  │· · · ref string · ·│    TECNICOS      │
  └──────────────────┘    (sin FK real)   └──────────────────┘
```

### Tablas y Estados

| Tabla | Registros Clave | Estados Posibles |
|-------|----------------|------------------|
| `incidentes` | id_incidente | `pendiente` → `en_proceso` → `resuelto` |
| `asignaciones_tecnico` | id_asignacion | `pendiente` → `aceptada` / `rechazada` → `en_curso` → `completada` |
| `presupuestos` | id_presupuesto | `borrador` → `enviado` → `aprobado_admin` → `aprobado` / `rechazado` / `vencido` |
| `pagos` | id_pago | Tipo: `adelanto` / `parcial` / `total` / `reembolso` |
| `solicitudes_registro` | id_solicitud | `pendiente` → `aprobada` / `rechazada` |
| `conformidades` | id_conformidad | `esta_firmada`: true/false |

---

## 3. Roles y Permisos

### Roles del Sistema

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │                        ROLES DEL SISTEMA                           │
  │                                                                     │
  │  [ADMIN]  ──────▶  /dashboard/*    Gestion completa del sistema    │
  │  [GESTOR] ──────▶  /dashboard/*    Mismos permisos que Admin       │
  │  [CLIENTE] ─────▶  /cliente/*      Sus incidentes e inmuebles      │
  │  [TECNICO] ─────▶  /tecnico/*      Sus asignaciones y trabajos     │
  └─────────────────────────────────────────────────────────────────────┘
```

### Permisos por Tabla (RLS)

```
                    incidentes  asignaciones  presupuestos  pagos  inmuebles
                    ──────────  ────────────  ────────────  ─────  ─────────
  Admin/Gestor      CRUD        CRUD          CRUD          CRUD   CRUD
  Cliente           SELECT+INS  ---           SELECT        SELECT CRUD (propios)
  Tecnico           SELECT+UPD  SELECT+UPD    INS+UPD(borr) SELECT SELECT (asignados)
                    (asignados) (propias)     (propios)
```

### Matriz de Acceso por Ruta

| Ruta | Admin | Gestor | Cliente | Tecnico | Anonimo |
|------|:-----:|:------:|:-------:|:-------:|:-------:|
| `/` (landing) | SI | SI | SI | SI | SI |
| `/login` | redirige | redirige | redirige | redirige | SI |
| `/register` | SI | SI | SI | SI | SI |
| `/dashboard/*` | SI | **BLOQUEADO** | NO | NO | NO → `/login` |
| `/cliente/*` | NO | NO | SI | NO | NO → `/login` |
| `/tecnico/*` | NO | NO | NO | SI | NO → `/login` |
| `/inmueble/[id]` | SI | NO | SI | NO | NO → `/login` |

> **BUG:** El middleware bloquea `gestor` en `/dashboard` aunque el servicio lo trata como admin.

---

## 4. Flujo de Autenticacion

### 4.1 Registro de Cliente

```
  CLIENTE                /register              Supabase Auth         DB Trigger           PostgreSQL
    │                    (Tab Cliente)           (client.ts)                                   │
    │                        │                       │                    │                    │
    │── Completa form ──────▶│                       │                    │                    │
    │   (nombre, apellido,   │                       │                    │                    │
    │    email, pass, tel)   │                       │                    │                    │
    │                        │── signUp(email, ─────▶│                    │                    │
    │                        │   pass, metadata)     │                    │                    │
    │                        │                       │── INSERT ─────────▶│                    │
    │                        │                       │   auth.users       │── INSERT clientes ▶│
    │                        │                       │                    │── INSERT usuarios ─▶│
    │                        │                       │                    │   (rol='cliente')   │
    │                        │◀── Session creada ────│                    │                    │
    │◀── push('/cliente') ──│                       │                    │                    │
```

### 4.2 Registro de Tecnico (Solicitud)

```
  TECNICO               /register            usuarios.service          PostgreSQL
    │                   (Tab Tecnico)              │                       │
    │                       │                      │                       │
    │── Completa form ─────▶│                      │                       │
    │   (nombre, apellido,  │                      │                       │
    │    email, especialidad)│                      │                       │
    │                       │── crearSolicitud ───▶│                       │
    │                       │   Registro(data)     │── INSERT solicitudes ▶│
    │                       │                      │   (estado='pendiente') │
    │                       │◀── ActionResult ─────│                       │
    │◀── "Solicitud         │                      │                       │
    │    enviada, espere     │                      │                       │
    │    aprobacion"         │                      │                       │
    │                       │                      │                       │
    │   (!) El tecnico NO puede loguearse aun.                            │
    │       Debe esperar aprobacion del admin.                             │
```

### 4.3 Aprobacion de Tecnico por Admin

```
  ADMIN              /dashboard/tecnicos     usuarios.service      Admin Client       DB Trigger        PostgreSQL
    │                      │                      │                     │                 │                │
    │── Ve solicitud ─────▶│                      │                     │                 │                │
    │   pendiente,          │                      │                     │                 │                │
    │   genera password     │                      │                     │                 │                │
    │                      │── aprobarSolicitud ─▶│                     │                 │                │
    │                      │   Tecnico(id, pass)  │── admin.createUser ▶│                 │                │
    │                      │                      │   (email, pass,     │── INSERT ──────▶│                │
    │                      │                      │    metadata)        │   auth.users    │── INSERT tecn.▶│
    │                      │                      │                     │                 │── INSERT usua.▶│
    │                      │                      │── UPDATE solicitudes───────────────────────────────────▶│
    │                      │                      │   (estado='aprobada')                                  │
    │                      │◀── ActionResult ─────│                     │                 │                │
```

### 4.4 Login y Redireccion

```
  USUARIO                 /login              Supabase Auth          Middleware
    │                       │                      │                    │
    │── email + password ──▶│                      │                    │
    │                       │── signInWithPass ───▶│                    │
    │                       │◀── Session + rol ────│                    │
    │                       │                      │                    │
    │   Si rol = admin/gestor  ──▶  push('/dashboard')                 │
    │   Si rol = tecnico       ──▶  push('/tecnico')                   │
    │   Si rol = cliente       ──▶  push('/cliente')                   │
    │                       │                      │                    │
    │── Navega a ruta ──────┼──────────────────────┼───────────────────▶│
    │   protegida           │                      │                    │
    │                       │                      │      Verifica session
    │                       │                      │      + consulta rol
    │                       │                      │                    │
    │   Si rol no coincide con ruta ◀── Redirect a /login ─────────────│
    │   Si OK               ◀── Permite acceso ────────────────────────│
```

### 4.5 Estado de Flujos de Auth

```
  IMPLEMENTADO                          │  NO IMPLEMENTADO
  ──────────────────────────────────────│──────────────────────────────────
  [OK] Login con email/password         │  [  ] Recuperar contrasena
  [OK] Registro cliente                 │  [  ] Cambiar contrasena (perfil)
  [OK] Solicitud registro tecnico       │  [  ] Verificacion de email
  [OK] Aprobacion tecnico (admin)       │  [  ] Cerrar sesion en todos
  [OK] Crear empleado (admin)           │       los dispositivos
  [OK] Cerrar sesion                    │  [  ] Desactivar cuenta propia
```

---

## 5. Flujo Principal: Ciclo de Vida del Incidente

Este es el flujo core del sistema. Conecta todos los roles y la mayoria de las tablas.

### 5.1 Vista General (Macro)

```
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║                    CICLO DE VIDA DEL INCIDENTE                         ║
  ╚══════════════════════════════════════════════════════════════════════════╝

  FASE 1: REGISTRO
  ─────────────────
    Cliente crea incidente ──────────────▶ Estado: PENDIENTE
                                                │
  FASE 2: ASIGNACION                            │
  ──────────────────                            ▼
    Admin revisa incidente ──▶ Admin asigna tecnico ──▶ Estado: EN_PROCESO
                                                              │
                                                    Tecnico responde
                                                     /            \
                                                Acepta          Rechaza
                                                  │                │
                                          Asignacion:         Asignacion:
                                          ACEPTADA            RECHAZADA
                                                  │                │
                                                  │     Admin reasigna ──┐
                                                  │                      │
  FASE 3: INSPECCION                              │         (vuelve a    │
  ──────────────────                              ▼          asignar) ◀──┘
    Tecnico visita inmueble
    Registra inspeccion
    Determina causas y danos
                │
  FASE 4: PRESUPUESTO
  ────────────────────
    Tecnico crea presupuesto ──▶ Estado: BORRADOR
    Envia a admin ─────────────▶ Estado: ENVIADO
                                       │
                              Admin revisa
                               /          \
                          Aprueba       Rechaza
                            │              │
                     APROBADO_ADMIN    RECHAZADO
                            │
                     Cliente revisa
                      /          \
                 Aprueba       Rechaza
                   │              │
                APROBADO       RECHAZADO
                   │
  FASE 5: EJECUCION
  ──────────────────
    Asignacion: EN_CURSO
    Tecnico registra avances
    Tecnico completa trabajo ──▶ Asignacion: COMPLETADA
                                       │
  FASE 6: CIERRE                       │
  ───────────────                      ▼
    Admin registra pagos
    Cliente firma conformidad
    Cliente califica tecnico
    Estado incidente: RESUELTO ──────▶ FIN
```

### 5.2 Maquina de Estados: Incidente

```
                    Cliente crea incidente
                            │
                            ▼
                    ┌───────────────┐
                    │   PENDIENTE   │  Incidente recien creado.
                    │               │  Esperando que admin lo revise
                    └───────┬───────┘  y asigne un tecnico.
                            │
                    Admin crea asignacion
                            │
                            ▼
                    ┌───────────────┐
               ┌───▶│  EN_PROCESO   │  Al menos una asignacion creada.
               │    │               │  Aqui ocurre TODO el trabajo:
               │    └───────┬───────┘  - Aceptar/rechazar asignacion
               │            │          - Inspecciones
               └────────────┘          - Presupuestos
              Reasignaciones,          - Pagos
              inspecciones,            - Avances
              presupuestos
                            │
                    Admin marca como resuelto
                            │
                            ▼
                    ┌───────────────┐
                    │   RESUELTO    │  Trabajo completado.
                    │               │  Conformidad firmada.
                    └───────────────┘  Calificacion registrada.
```

### 5.3 Maquina de Estados: Asignacion

```
                    Admin crea asignacion
                            │
                            ▼
                    ┌───────────────┐
                    │  PENDIENTE    │
                    └───┬───────┬───┘
                        │       │
                   Acepta     Rechaza
                        │       │
                        ▼       ▼
              ┌──────────┐    ┌──────────┐
              │ ACEPTADA │    │RECHAZADA │──▶ Admin puede crear
              └────┬─────┘    └──────────┘    nueva asignacion
                   │
              Inicia trabajo
                   │
                   ▼
              ┌──────────┐
              │ EN_CURSO │
              └────┬─────┘
                   │
              Finaliza
                   │
                   ▼
              ┌──────────┐
              │COMPLETADA│
              └──────────┘
```

### 5.4 Maquina de Estados: Presupuesto

```
                    Tecnico crea
                        │
                        ▼
                  ┌──────────┐
                  │ BORRADOR │
                  └────┬─────┘
                       │
                  Tecnico envia
                       │
                       ▼
                  ┌──────────┐
              ┌───│ ENVIADO  │───┐
              │   └──────────┘   │
              │                  │
         Admin aprueba      Admin rechaza ──────┐
              │                                 │
              ▼                                 │
       ┌──────────────┐                         │
   ┌───│APROBADO_ADMIN│───┐        Tiempo       │
   │   └──────────────┘   │       expira        │
   │                      │         │            │
Cliente               Cliente       │            │
aprueba               rechaza       │            │
   │                      │         ▼            │
   ▼                      │    ┌─────────┐       │
┌──────────┐              │    │ VENCIDO │       │
│ APROBADO │              │    └─────────┘       │
└──────────┘              │                      │
Habilita inicio           ▼                      ▼
de trabajo           ┌──────────┐          ┌──────────┐
                     │RECHAZADO │          │RECHAZADO │
                     └──────────┘          └──────────┘
```

---

## 6. Flujos por Rol

### 6.1 Flujos del Cliente

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    PANEL DEL CLIENTE                             │
  │                                                                 │
  │  /cliente                   /cliente/incidentes                 │
  │  ┌───────────────┐         ┌───────────────────────────┐       │
  │  │ Inicio        │         │ Ver mis incidentes        │       │
  │  │ (estadisticas)│         │   ├── Crear incidente     │       │
  │  └───────────────┘         │   ├── Ver detalle+timeline│       │
  │                            │   └── Buscar/filtrar      │       │
  │  /cliente/propiedades      └───────────────────────────┘       │
  │  ┌───────────────────────┐                                     │
  │  │ Ver mis inmuebles     │  /cliente/presupuestos              │
  │  │   ├── Crear inmueble  │  ┌───────────────────────────┐     │
  │  │   ├── Editar inmueble │  │ Ver presupuestos de       │     │
  │  │   └── Activar/Desact. │  │ mis incidentes            │     │
  │  └───────────────────────┘  │                           │     │
  │                             │ (!) Aprobar/Rechazar      │     │
  │  /cliente/pagos             │     NO IMPLEMENTADO       │     │
  │  ┌───────────────────────┐  └───────────────────────────┘     │
  │  │ Ver pagos de mis      │                                     │
  │  │ incidentes             │  /cliente/perfil                   │
  │  └───────────────────────┘  ┌───────────────────────┐         │
  │                             │ Ver/Editar datos      │         │
  │                             └───────────────────────┘         │
  └─────────────────────────────────────────────────────────────────┘
```

#### Detalle: Crear Incidente

```
  CLIENTE           /cliente/incidentes/nuevo    Supabase Client     PostgreSQL
    │                       │                    (DIRECTO!)              │
    │── Abre formulario ───▶│                        │                  │
    │                       │── Carga inmuebles ────▶│                  │
    │                       │   activos del cliente  │──── SELECT ─────▶│
    │                       │◀── Lista inmuebles ────│◀──── rows ───────│
    │                       │                        │                  │
    │── Selecciona inmueble▶│                        │                  │
    │── Describe problema ─▶│                        │                  │
    │── Disponibilidad ────▶│                        │                  │
    │                       │── INSERT incidentes ──▶│                  │
    │                       │   (estado='pendiente') │──── INSERT ─────▶│
    │                       │◀── Exito ─────────────│◀──── OK ─────────│
    │◀── push('/cliente/ ───│                        │                  │
    │    incidentes')        │                        │                  │
    │                       │                        │                  │
    │   (!) Este flujo NO usa service. Hace INSERT directo via client.ts│
```

### 6.2 Flujos del Admin

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    PANEL DEL ADMIN                               │
  │                                                                 │
  │  /dashboard                  /dashboard/incidentes              │
  │  ┌──────────────────┐       ┌───────────────────────────┐      │
  │  │ Panel general     │       │ Ver TODOS los incidentes  │      │
  │  │ (estadisticas)    │       │   ├── Filtrar estado/prio.│      │
  │  └──────────────────┘       │   ├── Ver detalle modal   │      │
  │                              │   └── Cambiar estado/prio.│      │
  │  /dashboard/asignaciones     └───────────────────────────┘      │
  │  ┌───────────────────────┐                                      │
  │  │ Ver TODAS asignaciones│   /dashboard/presupuestos            │
  │  │   └── Crear nueva     │   ┌───────────────────────────┐     │
  │  │       (tecnico+incid.)│   │ Ver todos                 │     │
  │  └───────────────────────┘   │   ├── Crear presupuesto   │     │
  │                              │   └── Aprobar presupuesto  │     │
  │  /dashboard/pagos            └───────────────────────────┘     │
  │  ┌───────────────────────┐                                      │
  │  │ Ver todos los pagos   │   GESTION DE PERSONAS                │
  │  │   └── Registrar nuevo │   ┌───────────────────────────┐     │
  │  └───────────────────────┘   │ /dashboard/clientes       │     │
  │                              │ /dashboard/tecnicos       │     │
  │  /dashboard/propiedades      │ /dashboard/usuarios       │     │
  │  ┌───────────────────────┐   └───────────────────────────┘     │
  │  │ Ver TODOS inmuebles   │                                      │
  │  └───────────────────────┘   /dashboard/configuracion           │
  │                              ┌───────────────────────────┐     │
  │                              │ (!) DA 404 - NO EXISTE    │     │
  │                              └───────────────────────────┘     │
  └─────────────────────────────────────────────────────────────────┘
```

#### Detalle: Asignar Tecnico a Incidente

```
  ADMIN           /dashboard/asignaciones   asignaciones.service    PostgreSQL      Realtime
    │                    │                       │                      │              │
    │── Abre pagina ────▶│                       │                      │              │
    │                    │── Carga incidentes ───┼──────────────────────▶│              │
    │                    │── Carga tecnicos ─────┼──────────────────────▶│              │
    │                    │◀── Listas cargadas ───┼──────────────────────│              │
    │                    │                       │                      │              │
    │── Selecciona ─────▶│                       │                      │              │
    │   incid+tecn+obs   │── crearAsignacion ───▶│                      │              │
    │                    │   ({id_incidente,     │── INSERT asignacion ▶│              │
    │                    │    id_tecnico,         │   (estado=pendiente) │              │
    │                    │    observaciones})     │── UPDATE incidentes ▶│              │
    │                    │                       │   (estado=en_proceso)│              │
    │                    │                       │                      │── event ────▶│
    │                    │                       │                      │              │── Notifica
    │                    │◀── ActionResult ──────│                      │              │   tecnico
    │                    │                       │                      │              │   (badge)
```

### 6.3 Flujos del Tecnico

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    PANEL DEL TECNICO                             │
  │                                                                 │
  │  /tecnico                     /tecnico/disponibles              │
  │  ┌──────────────────┐        ┌──────────────────────────┐      │
  │  │ Panel             │        │ Ver asignaciones         │      │
  │  │ (mis estadisticas)│        │ pendientes (con badge    │      │
  │  └──────────────────┘        │ realtime!)               │      │
  │                               │   ├── Aceptar asignacion │      │
  │  /tecnico/trabajos            │   └── Rechazar asignacion│      │
  │  ┌──────────────────────┐    └──────────────────────────┘      │
  │  │ Ver trabajos          │                                      │
  │  │ aceptados/en curso    │    /tecnico/presupuestos             │
  │  │   └── Ver detalle     │    ┌──────────────────────────┐     │
  │  │       del incidente   │    │ Ver mis presupuestos     │     │
  │  └──────────────────────┘    │   └── Crear presupuesto   │     │
  │         │                     └──────────────────────────┘     │
  │         │                                                       │
  │         ├── (!) Registrar inspeccion = NO IMPLEMENTADO          │
  │         └── (!) Registrar avances   = NO IMPLEMENTADO          │
  │                                                                 │
  │  /tecnico/perfil                                                │
  │  ┌──────────────────────────┐                                   │
  │  │ Ver datos + especialidad │                                   │
  │  │ + calificacion promedio  │                                   │
  │  └──────────────────────────┘                                   │
  └─────────────────────────────────────────────────────────────────┘
```

#### Detalle: Aceptar/Rechazar Asignacion

```
  TECNICO         /tecnico/disponibles     asignaciones.service      PostgreSQL
    │                    │                       │                      │
    │── Ve asignacion ──▶│                       │                      │
    │   pendiente con     │                       │                      │
    │   detalles          │                       │                      │
    │                    │                       │                      │
    │── [ACEPTAR] ──────▶│                       │                      │
    │                    │── aceptarAsignacion ─▶│                      │
    │                    │   (idAsig, idIncid)   │── UPDATE asignacion ▶│
    │                    │                       │   estado='aceptada'  │
    │                    │                       │   fecha_aceptacion   │
    │                    │                       │── UPDATE incidentes ▶│
    │                    │                       │   estado='asignado'  │
    │                    │                       │      (!) BUG: 'asignado' no es valido
    │                    │                       │      DB solo permite: pendiente,
    │                    │                       │      en_proceso, resuelto
    │                    │                       │                      │
    │── [RECHAZAR] ─────▶│                       │                      │
    │                    │── rechazarAsignacion ▶│                      │
    │                    │   (idAsig, idIncid)   │── UPDATE asignacion ▶│
    │                    │                       │   estado='rechazada' │
    │                    │                       │── UPDATE incidentes ▶│
    │                    │                       │   estado='reportado' │
    │                    │                       │      (!) BUG: 'reportado' no es valido
```

### 6.4 Flujo del Gestor

```
  ┌──────────────────────────────────────────────────────────────────┐
  │  ROL: GESTOR                                                     │
  │                                                                  │
  │  auth.service lo trata como admin:                               │
  │    isAdmin() ────────────▶ true                     [OK]         │
  │    requireAdmin() ───────▶ permite acceso           [OK]         │
  │                                                                  │
  │  middleware.ts lo bloquea:                                       │
  │    /dashboard/* ─────────▶ Redirigido a /login      [BUG!]      │
  │    (solo permite rol === 'admin', no 'gestor')                   │
  │                                                                  │
  │  RESULTADO: El gestor esta definido pero NO PUEDE OPERAR.       │
  └──────────────────────────────────────────────────────────────────┘
```

