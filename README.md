# Sistema de Gestión de Incidentes - ISBA

Sistema web para la gestión de incidentes en propiedades inmobiliarias.

| | |
|---|---|
| **Stack** | Next.js + React + Tailwind, Supabase (PostgreSQL), Vercel |
| **Instalación** | `cd frontend && npm install && cp .env.example .env.local && npm run dev` |
| **Roles** | **admin** (todo), **cliente** (sus incidentes), **tecnico** (trabajos asignados) |

---

## Vista general del proyecto

El proyecto tiene 5 carpetas principales:

```
frontend/
│
├── app/            # PÁGINAS — cada carpeta es una URL (/cliente, /dashboard...)
├── components/     # VISUAL — lo que el usuario ve (tablas, modals, formularios)
├── features/       # DATOS — lee y escribe a la base de datos ('use server')
├── hooks/          # HOOKS — lógica reutilizable de React (ej: detectar mobile)
└── shared/         # COMPARTIDO — tipos, utilidades y conexión a Supabase
```

Cada una tiene un rol claro. Las páginas (`app/`) orquestan todo: piden datos a `features/` y los pasan a `components/` para mostrarlos.

---

## ¿Qué es Frontend y qué es Backend?

```
  FRONTEND (browser)                BACKEND (servidor)

  ┌──────────────────┐              ┌──────────────────┐
  │     BROWSER      │              │     VERCEL       │
  │                  │              │                  │
  │  - Botones       │              │  - Ejecuta       │
  │  - Formularios   │              │    page.tsx      │
  │  - Tablas        │              │  - Ejecuta       │
  │  - Lo visual     │              │    services      │
  │                  │              │  - Arma el HTML  │
  └──────────────────┘              └──────────────────┘
                                    ┌──────────────────┐
                                    │    SUPABASE      │
                                    │  (base de datos) │
                                    │                  │
                                    │  - PostgreSQL    │
                                    │  - Valida acceso │
                                    └──────────────────┘
```

- **Frontend** = Lo que el usuario ve y toca (browser)
- **Backend** = Vercel (ejecuta el código) + Supabase (guarda los datos)

---

## ¿Cómo se conecta todo?

### Quién llama a quién

```
  app/page.tsx  ──────────────────────────────────────────────┐
  (la página, corre en Vercel)                                │
       │                                                      │
       │ 1. Pide datos                   2. Pasa datos        │
       │    al service                      al componente     │
       ▼                                    ▼                 │
                                                              │
  features/service.ts                components/.client.tsx    │
  (corre en Vercel)                  (corre en Browser)       │
       │                                    │                 │
       │ consulta/escribe                   │ 3. El usuario   │
       │ en la BD                           │    hace click   │
       ▼                                    │    → llama al   │
                                            │    service      │
  shared/lib/supabase/                      │                 │
  (conexión a Supabase)                     └───► features/   │
                                                  service.ts  │
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
  shared/types/   → tipos usados por todos
  shared/utils/   → funciones auxiliares usadas por todos
  hooks/          → hooks de React usados por components
```

### LEER datos (ver una lista)

El usuario entra a una URL → Vercel ejecuta `page.tsx` → llama al `service.ts` → consulta Supabase → arma el HTML → se lo envía al browser.

```
  BROWSER                    VERCEL                     SUPABASE
  (computadora               (servidor                  (servidor
   del usuario)               en la nube)                en la nube)
     │                          │                          │
     │  1. Entra a la URL       │                          │
     │ ────────────────────►    │                          │
     │                          │  2. page.tsx llama       │
     │                          │     service.ts           │
     │                          │  3. El SDK de Supabase   │
     │                          │     hace un fetch()      │
     │                          │     HTTP a la API REST   │
     │                          │     de Supabase          │
     │                          │ ────────────────────►    │
     │                          │                          │  Supabase recibe
     │                          │                          │  el pedido HTTP y
     │                          │                          │  ejecuta el SELECT
     │                          │                          │  en PostgreSQL
     │                          │  4. Datos                │
     │                          │ ◄────────────────────    │
     │  5. HTML con los datos   │                          │
     │ ◄────────────────────    │                          │
```

**¿Cómo llegan las queries a la base de datos?** Nuestro código nunca habla directo con PostgreSQL. Cuando escribimos `.from('tecnicos').select('nombre').eq('esta_activo', true)`, el SDK de Supabase (librería instalada con npm) traduce eso a una llamada HTTP:

```
GET https://tu-proyecto.supabase.co/rest/v1/tecnicos?select=nombre&esta_activo=eq.true
```

`.from().select().eq()` **arma** el pedido, y el `await` **lo envía**. Supabase recibe esa request HTTP, ejecuta el SQL real contra PostgreSQL, y devuelve los resultados como JSON.

```typescript
// page.tsx (corre en Vercel)
import { getIncidentesByCurrentUser } from '@/features/incidentes/incidentes.service'

export default async function Page() {
  const incidentes = await getIncidentesByCurrentUser()
  return <TablaIncidentes datos={incidentes} />
}

// incidentes.service.ts (corre en Vercel)
'use server'
import { createClient } from '@/shared/lib/supabase/server'

export async function getIncidentesByCurrentUser() {
  const supabase = await createClient()
  const { data } = await supabase.from('incidentes').select('*')
  return data
}
```

### ESCRIBIR datos (crear/editar)

El usuario llena un formulario → el componente llama un **Server Action** del service → el service se ejecuta en Vercel → escribe en Supabase → devuelve success/error.

```
  BROWSER                    VERCEL                     SUPABASE
     │                          │                          │
     │  1. Click "Guardar"      │                          │
     │     → llama Server       │                          │
     │       Action             │                          │
     │ ────────────────────►    │                          │
     │                          │  2. Service hace         │
     │                          │     INSERT/UPDATE        │
     │                          │ ────────────────────►    │
     │                          │  3. OK / Error           │
     │                          │ ◄────────────────────    │
     │  4. { success: true }    │                          │
     │ ◄────────────────────    │                          │
```

```typescript
// inmuebles.service.ts (corre en Vercel)
'use server'
import { createClient } from '@/shared/lib/supabase/server'
import type { ActionResult } from '@/shared/types'

export async function crearInmueble(data: {...}): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('inmuebles').insert(data)
  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

// componente.client.tsx (corre en Browser)
import { crearInmueble } from '@/features/inmuebles/inmuebles.service'

const handleSubmit = async () => {
  const result = await crearInmueble(inmuebleData)  // se ejecuta en Vercel
  if (!result.success) {
    toast.error(result.error)
    return
  }
  toast.success('Inmueble creado')
}
```

### Resumen

| Acción | ¿Dónde se ejecuta? | ¿Cómo? |
|--------|---------------------|--------|
| **LEER** | Vercel | `page.tsx` llama `service.ts` |
| **ESCRIBIR** | Vercel | Componente llama Server Action del `service.ts` |

---

## Carpetas en detalle

### `app/` — Las páginas

Cada carpeta es una **URL**. Next.js usa el nombre de las carpetas para armar las rutas.

```
app/
├── (auth)/                          # Páginas públicas (sin login)
│   ├── login/page.tsx               # → /login
│   └── register/page.tsx            # → /register
│
├── (cliente)/                       # Todo lo del cliente
│   ├── layout.tsx                   # Navegación del cliente
│   └── cliente/
│       ├── page.tsx                 # → /cliente
│       ├── incidentes/
│       │   ├── page.tsx             # → /cliente/incidentes
│       │   ├── nuevo/page.tsx       # → /cliente/incidentes/nuevo
│       │   └── loading.tsx          # Skeleton mientras carga
│       ├── propiedades/page.tsx     # → /cliente/propiedades
│       ├── presupuestos/page.tsx    # → /cliente/presupuestos
│       ├── pagos/page.tsx           # → /cliente/pagos
│       └── perfil/page.tsx          # → /cliente/perfil
│
├── (tecnico)/                       # Todo lo del técnico
│   ├── layout.tsx                   # Navegación del técnico
│   └── tecnico/
│       ├── page.tsx                 # → /tecnico
│       ├── trabajos/page.tsx        # → /tecnico/trabajos
│       ├── disponibles/page.tsx     # → /tecnico/disponibles
│       ├── presupuestos/
│       │   ├── page.tsx             # → /tecnico/presupuestos
│       │   └── nuevo/page.tsx       # → /tecnico/presupuestos/nuevo
│       └── perfil/page.tsx          # → /tecnico/perfil
│
├── (admin)/                         # Todo lo del admin
│   ├── layout.tsx                   # Sidebar del admin
│   └── dashboard/
│       ├── page.tsx                 # → /dashboard
│       ├── incidentes/page.tsx      # → /dashboard/incidentes
│       ├── asignaciones/page.tsx    # → /dashboard/asignaciones
│       ├── clientes/page.tsx        # → /dashboard/clientes
│       ├── tecnicos/page.tsx        # → /dashboard/tecnicos
│       ├── propiedades/page.tsx     # → /dashboard/propiedades
│       ├── usuarios/page.tsx        # → /dashboard/usuarios
│       ├── presupuestos/page.tsx    # → /dashboard/presupuestos
│       └── pagos/page.tsx           # → /dashboard/pagos
│
├── layout.tsx                       # Layout raíz (aplica a TODO el sitio)
└── page.tsx                         # → / (landing page)
```

**Archivos especiales de Next.js:**

| Archivo | Qué hace |
|---------|----------|
| `page.tsx` | Define la página de esa URL. Corre en **Vercel** |
| `layout.tsx` | Envuelve las páginas hijas (navbar, sidebar) |
| `loading.tsx` | Se muestra mientras la página carga (skeleton) |

**¿Qué son los paréntesis?** `(cliente)`, `(admin)`, etc. son **grupos de rutas**: agrupan páginas que comparten un layout pero **no aparecen en la URL**.

```
(cliente)/cliente/incidentes/page.tsx  →  /cliente/incidentes
^^^^^^^^ esto NO aparece en la URL
```

### `components/` — Lo visual

Las piezas visuales que se usan dentro de las páginas.

```
components/
├── ui/                              # Componentes base (shadcn/ui)
│   ├── button.tsx, card.tsx         # Botón, tarjeta
│   ├── dialog.tsx, input.tsx        # Modal, campo de texto
│   ├── table.tsx, select.tsx        # Tabla, dropdown
│   ├── sidebar.tsx                  # Sidebar del admin
│   └── ...
│
├── cliente/                         # Componentes del cliente
│   ├── cliente-nav.tsx
│   ├── incidentes-content.client.tsx
│   └── propiedades-content.client.tsx
│
├── tecnico/                         # Componentes del técnico
│   ├── tecnico-nav.tsx
│   ├── trabajos-content.client.tsx
│   └── disponibles-content.client.tsx
│
├── admin/                           # Componentes del admin
│   ├── admin-sidebar.tsx
│   ├── incidentes-content.client.tsx
│   └── tecnicos/                    # Sub-componentes de técnicos
│
├── incidentes/                      # Compartidos
│   └── incidente-detail-modal.tsx
│
├── landing/                         # Landing page
│   ├── hero-section.tsx
│   ├── features-section.tsx
│   └── cta-section.tsx
│
└── ai-help-chat.tsx                 # Chat de ayuda con IA
```

**`.tsx` vs `.client.tsx`:**

| Tipo | Dónde corre | Para qué |
|------|-------------|----------|
| `nombre.tsx` | Vercel (servidor) | Solo muestra datos, sin interactividad |
| `nombre.client.tsx` | Browser (usuario) | Tiene `useState`, `onClick`, formularios |

### `features/` — Lógica de negocio

Cada feature tiene **2 archivos**: tipos y service.

```
features/
├── auth/                        # Autenticación
│   ├── auth.types.ts            # UsuarioActual
│   └── auth.service.ts          # getCurrentUser, requireAdmin
│
├── incidentes/                  # Incidentes
│   ├── incidentes.types.ts      # Incidente, CreateIncidenteDTO
│   └── incidentes.service.ts    # getIncidentesByCurrentUser, actualizarIncidente...
│
├── asignaciones/                # Asignaciones de técnicos
│   ├── asignaciones.types.ts
│   └── asignaciones.service.ts
│
├── inmuebles/                   # Propiedades
│   ├── inmuebles.types.ts
│   └── inmuebles.service.ts
│
└── usuarios/                    # Usuarios, clientes, técnicos
    ├── usuarios.types.ts
    └── usuarios.service.ts
```

### `shared/` — Código compartido

```
shared/
├── lib/supabase/            # Conexión a base de datos
│   ├── server.ts            # Para services (lecturas y escrituras)
│   ├── admin.ts             # Para operaciones admin (bypass RLS)
│   ├── client.ts            # Solo para auth (login/register) y real-time
│   └── middleware.ts        # Refresca la sesión en cada request
│
├── types/                   # Tipos TypeScript compartidos
│   ├── models.ts            # ActionResult, tipos del dominio
│   ├── enums.ts             # Enumeraciones (estados, roles)
│   └── database.types.ts    # Tipos auto-generados de Supabase
│
└── utils/                   # Funciones auxiliares
    ├── cn.ts                # Merge de clases CSS (Tailwind)
    ├── colors.ts            # Colores por estado/prioridad
    ├── address.ts           # Formateo de direcciones
    └── error-messages.ts    # Mensajes de error reutilizables
```

### `hooks/` — Hooks de React

```
hooks/
└── use-mobile.ts            # Detecta si el usuario está en celular
```

---

## Seguridad

La base de datos tiene reglas (RLS) que validan cada operación:

```
Usuario intenta ver datos de OTRO usuario
                    │
                    ▼
             ┌─────────────┐
             │  SUPABASE   │
             │  pregunta:  │
             │ "¿Es tu     │
             │   dato?"    │
             └──────┬──────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   SÍ: devuelve            NO: error 403
       los datos               acceso denegado
```

---

## Guía de Trabajo Colaborativo

### Regla de oro: 2 archivos por feature

```
features/nombreFeature/
├── nombreFeature.types.ts     # Tipos e interfaces
└── nombreFeature.service.ts   # Lecturas Y escrituras ('use server')
```

Todas las operaciones con la BD van en los services. Los componentes `.client.tsx` llaman a las funciones del service como **Server Actions**.

### Cómo agregar una nueva feature

> Para automatizar este proceso, usar `/feature-dev` seguido de la descripción.
> Esto lanza 3 agentes (explorer, architect, reviewer) que garantizan consistencia.

**Ejemplo manual: feature "contratos"**

**1.** Crear tipos:
```typescript
// features/contratos/contratos.types.ts

export interface Contrato {
  id_contrato: number
  id_cliente: number
  fecha_inicio: string
  fecha_fin: string
}

export interface CreateContratoDTO {
  id_cliente: number
  fecha_inicio: string
  fecha_fin: string
}
```

**2.** Crear service:
```typescript
// features/contratos/contratos.service.ts
'use server'

import { createClient } from '@/shared/lib/supabase/server'
import type { Contrato, CreateContratoDTO } from './contratos.types'
import type { ActionResult } from '@/shared/types'

// --- Lecturas ---

export async function getContratosByCliente(idCliente: number): Promise<Contrato[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contratos')
    .select('*')
    .eq('id_cliente', idCliente)
  if (error) throw error
  return data
}

// --- Escrituras ---

export async function crearContrato(data: CreateContratoDTO): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('contratos').insert(data)
    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear contrato' }
  }
}
```

**3.** Usar en una página:
```typescript
// app/(cliente)/cliente/contratos/page.tsx

import { getContratosByCliente } from '@/features/contratos/contratos.service'

export default async function ContratosPage() {
  const contratos = await getContratosByCliente(123)
  return <ContratosContent contratos={contratos} />
}
```

### Convenciones de nombres

| Tipo de archivo | Formato | Ejemplo |
|-----------------|---------|---------|
| Types | `feature.types.ts` | `incidentes.types.ts` |
| Service | `feature.service.ts` | `incidentes.service.ts` |
| Componente Server | `nombre.tsx` | `incidente-card.tsx` |
| Componente Client | `nombre.client.tsx` | `incidentes-content.client.tsx` |
| Página | `page.tsx` | `page.tsx` |

### Cómo importar

```typescript
// Tipos
import type { Incidente } from '@/features/incidentes/incidentes.types'

// Funciones del service (lectura y escritura)
import { getIncidentesByCurrentUser } from '@/features/incidentes/incidentes.service'
import { crearInmueble } from '@/features/inmuebles/inmuebles.service'

// Supabase (solo dentro de services)
import { createClient } from '@/shared/lib/supabase/server'       // lecturas y escrituras
import { createAdminClient } from '@/shared/lib/supabase/admin'   // bypass RLS

// Supabase client (SOLO para auth y real-time, NO para datos)
import { createClient } from '@/shared/lib/supabase/client'
```

### Checklist antes de hacer PR

- [ ] Los types están en `feature.types.ts`
- [ ] Las lecturas Y escrituras están en `feature.service.ts` (con `'use server'`)
- [ ] Las escrituras retornan `ActionResult`
- [ ] El componente `.client.tsx` llama Server Actions del service (no usa `supabase/client` para datos)
- [ ] El componente con interactividad tiene `.client.tsx`
- [ ] Los imports apuntan al archivo exacto (ej: `@/features/auth/auth.service`)
- [ ] `npm run build` pasa sin errores

### Errores comunes

| Error | Solución |
|-------|----------|
| `"use client"` en service | Los services usan `'use server'`, NUNCA `"use client"` |
| Fetch en useEffect | Usar service en `page.tsx`, pasar datos como props |
| Escribir a BD desde componente | Crear función en el service, llamarla como Server Action |
| Importar `supabase/client` para datos | Usar funciones del service. `supabase/client` solo para auth y real-time |
| Crear archivos extra en feature | Solo `types.ts` y `service.ts`, nada más |
| Falta `'use server'` en service | Debe ser la primera línea del archivo |

---

Proyecto de tesis - 2024-2025
