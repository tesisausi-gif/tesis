# Diagrama de Arquitectura - Sistema de Gestión de Incidentes

## Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE GESTIÓN DE INCIDENTES                          │
│                          (Aplicación Next.js 15)                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   MIDDLEWARE    │  │  APP ROUTER     │  │   COMPONENTS    │             │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤             │
│  │ - Auth Guard    │  │ - (auth)        │  │ - ui/ (shadcn)  │             │
│  │ - Role Check    │  │   • login       │  │ - admin/        │             │
│  │ - Redirects     │  │   • register    │  │ - cliente/      │             │
│  └────────┬────────┘  │                 │  │ - tecnico/      │             │
│           │           │ - (admin)       │  │ - shared/       │             │
│           ▼           │   • dashboard   │  └─────────────────┘             │
│  ┌─────────────────┐  │   • usuarios    │                                   │
│  │  ROLE ROUTING   │  │   • solicitudes │  ┌─────────────────┐             │
│  ├─────────────────┤  │   • especial.   │  │     TYPES       │             │
│  │ admin    ──────►│  │                 │  ├─────────────────┤             │
│  │ gestor   ──────►│  │ - (cliente)     │  │ - database.ts   │             │
│  │ tecnico  ──────►│  │   • incidentes  │  │ - enums.ts      │             │
│  │ cliente  ──────►│  │   • propiedades │  └─────────────────┘             │
│  └─────────────────┘  │   • perfil      │                                   │
│                        │                 │  ┌─────────────────┐             │
│                        │ - (tecnico)     │  │      LIB        │             │
│                        │   • trabajos    │  ├─────────────────┤             │
│                        │   • perfil      │  │ - supabase/     │             │
│                        │                 │  │   • client      │             │
│                        │ - api/          │  │   • server      │             │
│                        │   • admin/      │  │ - utils.ts      │             │
│                        │   • create-user │  │ - errors.ts     │             │
│                        └─────────────────┘  └─────────────────┘             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    │ API Calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Supabase BaaS)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐  ┌──────────────────────────────────────────────────┐ │
│  │  SUPABASE AUTH  │  │         POSTGRESQL DATABASE                        │ │
│  ├─────────────────┤  ├──────────────────────────────────────────────────┤ │
│  │ - OAuth         │  │                                                    │ │
│  │ - JWT Tokens    │  │  Tablas Principales (11):                         │ │
│  │ - Sessions      │  │  ┌───────────┐  ┌───────────┐  ┌──────────────┐  │ │
│  │                 │  │  │ clientes  │  │tecnicos   │  │ propiedades  │  │ │
│  │ Roles:          │  │  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘  │ │
│  │ • admin         │  │        │              │                │          │ │
│  │ • gestor        │  │        └──────────────┴────────────────┘          │ │
│  │ • tecnico       │  │                       │                           │ │
│  │ • cliente       │  │                       ▼                           │ │
│  └─────────────────┘  │              ┌─────────────────┐                  │ │
│                        │              │   incidentes    │                  │ │
│                        │              └────────┬────────┘                  │ │
│                        │                       │                           │ │
│  ┌─────────────────┐  │        ┌──────────────┼──────────────┐            │ │
│  │  ROW LEVEL      │  │        │              │              │            │ │
│  │  SECURITY (RLS) │  │        ▼              ▼              ▼            │ │
│  ├─────────────────┤  │  ┌───────────┐  ┌──────────┐  ┌──────────┐       │ │
│  │ - Políticas     │  │  │asignacio- │  │inspecci- │  │presupues-│       │ │
│  │   por rol       │  │  │nes_tecnico│  │ones      │  │tos       │       │ │
│  │ - Permisos      │  │  └───────────┘  └──────────┘  └──────────┘       │ │
│  │   granulares    │  │                                                    │ │
│  └─────────────────┘  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │ │
│                        │  │  pagos   │  │conformi- │  │califica- │        │ │
│  ┌─────────────────┐  │  │          │  │dades     │  │ciones    │        │ │
│  │   TRIGGERS      │  │  └──────────┘  └──────────┘  └──────────┘        │ │
│  ├─────────────────┤  │                                                    │ │
│  │ - Auto-sync     │  │  ┌──────────┐                                     │ │
│  │   usuarios      │  │  │documento-│                                     │ │
│  │ - Notificacion  │  │  │s         │                                     │ │
│  │   cambios       │  │  └──────────┘                                     │ │
│  └─────────────────┘  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           INICIALIZACIÓN                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Scripts SQL (12 archivos ejecutados en secuencia):                          │
│                                                                               │
│  01_enums.sql ─► 02_clients.sql ─► 03_properties.sql ─► 04_technicians.sql  │
│       │               │                   │                     │             │
│       ▼               ▼                   ▼                     ▼             │
│  05_incidents.sql ─► 06_assignments.sql ─► 07_inspections.sql               │
│       │                                                         │             │
│       ▼                                                         ▼             │
│  08_budgets_payments.sql ─► 09_conformities.sql ─► 10_ratings.sql           │
│                                  │                       │                    │
│                                  ▼                       ▼                    │
│                          11_documents.sql ─► 12_specialists.sql              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos por Rol

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FLUJO DE TRABAJO                                 │
└──────────────────────────────────────────────────────────────────────────┘

CLIENTE                    GESTOR/ADMIN              TÉCNICO
   │                            │                        │
   │ 1. Reporta incidente       │                        │
   ├───────────────────────────►│                        │
   │                            │ 2. Asigna prioridad    │
   │                            │                        │
   │                            │ 3. Asigna técnico      │
   │                            ├───────────────────────►│
   │                            │                        │ 4. Inspecciona
   │                            │◄───────────────────────┤
   │                            │ 5. Genera presupuesto  │
   │                            │                        │
   │◄───────────────────────────┤                        │
   │ 6. Aprueba presupuesto     │                        │
   ├───────────────────────────►│                        │
   │                            ├───────────────────────►│
   │                            │                        │ 7. Ejecuta trabajo
   │                            │◄───────────────────────┤
   │◄───────────────────────────┤                        │
   │ 8. Firma conformidad       │                        │
   ├───────────────────────────►│                        │
   │                            │                        │
   │ 9. Realiza pago            │                        │
   ├───────────────────────────►│                        │
   │                            │                        │
   │ 10. Califica servicio      │                        │
   ├────────────────────────────┼───────────────────────►│
   │                            │                        │
```

## Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────────┐
│                        TECNOLOGÍAS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend               Backend              UI/UX               │
│  ┌──────────┐          ┌──────────┐         ┌──────────┐       │
│  │ Next.js  │          │ Supabase │         │ shadcn/ui│       │
│  │   16.x   │          │  Cloud   │         │ (Radix)  │       │
│  └──────────┘          └──────────┘         └──────────┘       │
│                                                                  │
│  ┌──────────┐          ┌──────────┐         ┌──────────┐       │
│  │  React   │          │PostgreSQL│         │Tailwind  │       │
│  │   19.x   │          │   RLS    │         │  CSS 4   │       │
│  └──────────┘          └──────────┘         └──────────┘       │
│                                                                  │
│  ┌──────────┐          ┌──────────┐         ┌──────────┐       │
│  │TypeScript│          │  OAuth   │         │ Lucide   │       │
│  │   5.x    │          │   JWT    │         │  Icons   │       │
│  └──────────┘          └──────────┘         └──────────┘       │
│                                                                  │
│  Validación             Estado               Formularios         │
│  ┌──────────┐          ┌──────────┐         ┌──────────┐       │
│  │   Zod    │          │React Hook│         │  Sonner  │       │
│  │  4.2.x   │          │  Form    │         │  Toast   │       │
│  └──────────┘          └──────────┘         └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Estructura de Directorios Principal

```
sist_gestion_incidentes/
├── frontend/                    # Aplicación Next.js completa
│   ├── app/                     # App Router de Next.js 15
│   ├── components/              # Componentes React reutilizables
│   ├── lib/                     # Librerías y utilidades
│   ├── types/                   # Definiciones de tipos TypeScript
│   ├── hooks/                   # Custom React hooks
│   ├── public/                  # Archivos estáticos
│   ├── node_modules/            # Dependencias instaladas
│   └── .next/                   # Build output
├── documentacion/               # Documentación completa del proyecto
├── scripts/                     # Scripts SQL para Supabase (12 archivos)
├── README.md                    # Documentación principal
├── SIGUIENTE_PASO.md           # Guía de pasos pendientes
└── SOLUCION_ERROR_500.md       # Documentación de fixes
```

## Archivos de Configuración Importantes

| Archivo | Propósito |
|---------|-----------|
| `package.json` | Dependencias y scripts npm |
| `.env.example` | Template de variables de entorno |
| `.env.local` | Credenciales Supabase (privado) |
| `tsconfig.json` | Configuración TypeScript |
| `next.config.ts` | Configuración Next.js |
| `middleware.ts` | Middleware de autenticación |
| `components.json` | Configuración shadcn/ui |
| `tailwind.config.mjs` | Configuración de estilos |
| `eslint.config.mjs` | Configuración de linting |

## Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Propósito de Cada Directorio Principal

### `/frontend`
- **Propósito**: Aplicación web completa desarrollada con Next.js 15
- **Tecnología**: React 19, TypeScript, Tailwind CSS
- **Alcance**: Frontend full-stack con API routes integradas
- **Usuarios**: Admin, Gestor, Técnicos, Clientes

### `/documentacion`
- **Propósito**: Documentación técnica del proyecto
- **Contiene**:
  - `der.md` - Diagrama Entidad-Relación
  - `esquema_supabase.md` - Estructura de BD
  - `vistas_por_rol.md` - Sistema de permisos
  - `sincronizacion_usuarios.md` - Sincronización BD
  - `guia_scripts_sql.md` - Procedimientos SQL
  - `manejo_errores.md` - Sistema de errores

### `/scripts`
- **Propósito**: Scripts SQL para inicializar y mantener la base de datos
- **12 Scripts** ordenados secuencialmente:
  - Scripts 01-07: Instalación inicial
  - Scripts 08-12: Fixes, triggers y especialidades

## Stack Tecnológico Detallado

### Frontend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Next.js | 16.0.10 | Framework principal (App Router) |
| React | 19.2.1 | Librería de UI |
| TypeScript | ^5 | Lenguaje tipado |
| Tailwind CSS | 4 | Framework de estilos |

### Componentes UI & Formularios
| Librería | Versión | Uso |
|----------|---------|-----|
| shadcn/ui | Latest | Componentes premade |
| Radix UI | Various | Primitivos de UI sin estilo |
| react-hook-form | ^7.68.0 | Gestión de formularios |
| Zod | ^4.2.1 | Validación de esquemas |
| Sonner | ^2.0.7 | Notificaciones tipo toast |
| Lucide React | ^0.561.0 | Iconos SVG |

### Backend/Database
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Supabase | Cloud | Backend as a Service |
| PostgreSQL | - | Base de datos relacional |
| Supabase Auth | - | Autenticación OAuth |
| Row Level Security | - | Control de acceso BD |

### Herramientas de Desarrollo
| Herramienta | Versión | Uso |
|------------|---------|-----|
| ESLint | ^9 | Linting de código |
| dotenv | ^17.2.3 | Gestión de variables de entorno |
| next-themes | ^0.4.6 | Dark mode |

## Estructura de App Router (Next.js 15)

```
frontend/app/
├── layout.tsx                    # Layout raíz global
├── page.tsx                      # Página inicio
├── middleware.ts                 # Auth middleware
│
├── (auth)/                       # Grupo sin layout especial
│   ├── layout.tsx               # Layout para auth
│   ├── login/
│   │   └── page.tsx             # Login
│   └── register/
│       └── page.tsx             # Registro (clientes, técnicos)
│
├── (admin)/                      # Grupo admin
│   ├── layout.tsx               # Layout admin con sidebar
│   └── dashboard/               # Dashboard admin
│       ├── page.tsx             # Inicio admin
│       ├── usuarios/
│       │   └── page.tsx         # Gestión usuarios
│       ├── solicitudes/
│       │   └── page.tsx         # Aprobación técnicos
│       └── especialidades/
│           └── page.tsx         # Gestión especialidades
│
├── (cliente)/                    # Grupo clientes
│   ├── layout.tsx               # Layout cliente
│   └── cliente/
│       ├── page.tsx             # Dashboard cliente
│       ├── incidentes/
│       │   └── page.tsx         # Mis incidentes
│       ├── propiedades/
│       │   └── page.tsx         # Mis propiedades
│       └── perfil/
│           └── page.tsx         # Mi perfil
│
├── (tecnico)/                    # Grupo técnicos
│   ├── layout.tsx               # Layout técnico
│   ├── mis-incidentes/
│   │   └── page.tsx             # Incidentes asignados
│   └── tecnico/
│       ├── page.tsx             # Dashboard técnico
│       ├── trabajos/
│       │   └── page.tsx         # Mis trabajos
│       └── perfil/
│           └── page.tsx         # Mi perfil
│
└── api/
    └── admin/
        ├── create-user/
        │   └── route.ts         # Crear usuarios
        ├── approve-technician/
        │   └── route.ts         # Aprobar técnicos
        └── delete-user/[id]/
            └── route.ts         # Eliminar usuarios
```

## Estructura de Componentes

```
frontend/components/
├── ui/                          # 15 componentes shadcn/ui
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── sidebar.tsx
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── dropdown-menu.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── skeleton.tsx
│   ├── tooltip.tsx
│   └── sonner.tsx
│
├── admin/
│   └── admin-sidebar.tsx        # Navegación admin
│
├── cliente/
│   └── cliente-nav.tsx          # Navegación cliente
│
├── tecnico/
│   └── tecnico-nav.tsx          # Navegación técnico
│
└── shared/                       # Vacío (para compartidos futuros)
```

## Tipos y Enumeraciones

```
frontend/types/
├── database.types.ts            # Tipos generados desde Supabase
│   └── Interfaces para todas las tablas
│
└── enums.ts                     # Enumeraciones del dominio
    ├── TipoCliente (Propietario, Inquilino, Tercero)
    ├── TipoPropiedad (Depto, Casa, Local, Oficina)
    ├── CategoriaIncidente (7 tipos técnicos)
    ├── NivelPrioridad (Baja, Media, Alta, Urgente)
    ├── EstadoIncidente (10 estados del flujo)
    ├── EstadoAsignacion (5 estados)
    ├── EstadoPresupuesto (5 estados)
    ├── TipoPago (4 tipos)
    ├── MetodoPago (4 métodos)
    ├── TipoDocumento (6 tipos)
    ├── TipoCalificacion (4 tipos)
    ├── UserRole (admin, gestor, tecnico, cliente)
    ├── estadoIncidenteColors (mapeo de colores)
    └── prioridadColors (mapeo de colores)
```

## Librerías Utilitarias

```
frontend/lib/
├── supabase/
│   ├── client.ts                # Cliente Supabase para navegador
│   ├── server.ts                # Cliente Supabase para servidor
│   └── middleware.ts            # Actualización de sesión
│
├── error-messages.ts            # Mensajes de error en español
└── utils.ts                     # Funciones auxiliares
```

## Arquitectura de la Base de Datos (Supabase)

### Tablas Principales (11 tablas)

| Tabla | Propósito | Relaciones |
|-------|-----------|-----------|
| `clientes` | Propietarios/inquilinos | 1:N con propiedades, incidentes |
| `propiedades` | Inmuebles | 1:N con incidentes |
| `incidentes` | Reportes de problemas | 1:N con asignaciones, inspecciones |
| `tecnicos` | Técnicos externos | 1:N con asignaciones, inspecciones |
| `asignaciones_tecnico` | Asignación técnico→incidente | N:N mapping |
| `inspecciones` | Evaluación técnica | 1:1 con incidentes |
| `presupuestos` | Cotizaciones | 1:1 con incidentes |
| `pagos` | Registro de transacciones | 1:N con incidentes |
| `conformidades` | Aprobaciones firmadas | 1:1 con incidentes |
| `calificaciones` | Rating de técnicos | N:N mapping |
| `documentos` | Archivos adjuntos | N:1 con incidentes |

### Autenticación (Supabase Auth)

```
Roles del Sistema:
- admin: Acceso total al dashboard
- gestor: Gestión de incidentes y técnicos
- tecnico: Vista mobile para trabajos asignados
- cliente: Reportar incidentes y ver estado
```

## Flujo de Trabajo del Sistema

1. **Reporte** → Cliente reporta incidente en propiedad
2. **Evaluación** → Gestor/Admin asigna prioridad
3. **Asignación** → Se selecciona técnico especializado
4. **Inspección** → Técnico evalúa daño y necesidades
5. **Presupuesto** → Se genera cotización
6. **Aprobación** → Cliente aprueba presupuesto
7. **Ejecución** → Técnico realiza trabajo
8. **Conformidad** → Cliente firma aprobación
9. **Pago** → Registro de transacción
10. **Calificación** → Cliente califica servicio

## Estado Actual del Proyecto

### Implementado
- Autenticación por roles (Supabase Auth)
- 4 vistas separadas por rol
- Routing automático según rol
- Sincronización automática de usuarios
- 12 scripts SQL organizados
- Documentación completa

### Pendiente
- Crear incidentes desde vista cliente
- Actualizar estado de trabajos desde técnicos
- Cargar imágenes/documentos
- Sistema de notificaciones en tiempo real
- Chat entre usuarios
- Dashboard de métricas

## Archivos Clave para Comenzar

1. `/frontend/package.json` - Dependencias y scripts
2. `/frontend/middleware.ts` - Control de acceso
3. `/frontend/app/layout.tsx` - Estructura global
4. `/documentacion/vistas_por_rol.md` - Guía de vistas
5. `/documentacion/esquema_supabase.md` - Estructura BD
6. `/scripts/` - SQL para inicializar BD

## Comandos Disponibles

```bash
npm run dev       # Desarrollo (puerto 3000)
npm run build     # Build producción
npm run start     # Servidor producción
npm run lint      # Validar código
```

## Resumen

Este es un proyecto de tesis bien estructurado, profesional y listo para continuar desarrollo. La arquitectura es escalable con separación clara de responsabilidades por rol de usuario.

**Arquitectura moderna:**
- Frontend: Next.js 15 con App Router
- Backend: Supabase (PostgreSQL + Auth + Storage)
- UI: shadcn/ui + Tailwind CSS
- 4 Vistas principales por rol (Admin, Gestor, Técnico, Cliente)
- 11 Tablas relacionales con RLS
- 12 Scripts SQL para inicialización
