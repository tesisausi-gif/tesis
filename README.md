# Sistema de Gestión de Incidentes - ISBA

Sistema web para la gestión de incidentes en propiedades inmobiliarias.

---

## Cómo desarrollar una nueva feature

Para agregar cualquier feature nueva al proyecto, usar la skill `/feature-dev`. Esta skill lanza 3 agentes especializados que garantizan consistencia:

| Paso | Agente | Qué hace |
|------|--------|----------|
| 1 | **code-explorer** | Analiza el codebase existente: arquitectura, patrones, convenciones y dependencias |
| 2 | **code-architect** | Diseña el blueprint de implementación: archivos a crear/modificar, componentes, flujo de datos |
| 3 | **code-reviewer** | Revisa el código generado buscando bugs, vulnerabilidades y que siga las convenciones del proyecto |

**Uso:** simplemente escribir `/feature-dev` seguido de la descripción de lo que se quiere agregar.

```
/feature-dev agregar módulo de contratos para clientes
```

Esto asegura que cada feature nueva siga la misma estructura (types y service) y los mismos patrones que el resto del proyecto.

---

## ¿Qué es Frontend y qué es Backend?

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  FRONTEND                           BACKEND                            │
│  (lo que ve el usuario)             (lo que NO ve el usuario)          │
│                                                                        │
│  ┌──────────────────┐               ┌──────────────────┐               │
│  │                  │               │                  │               │
│  │     BROWSER      │               │     VERCEL       │               │
│  │                  │               │    (servidor)    │               │
│  │  - Botones       │               │                  │               │
│  │  - Formularios   │               │  - Ejecuta       │               │
│  │  - Tablas        │               │    page.tsx      │               │
│  │  - Lo visual     │               │  - Consulta DB   │               │
│  │                  │               │  - Arma el HTML  │               │
│  └──────────────────┘               └──────────────────┘               │
│                                                                        │
│                                     ┌──────────────────┐               │
│                                     │                  │               │
│                                     │    SUPABASE      │               │
│                                     │  (base de datos) │               │
│                                     │                  │               │
│                                     │  - Guarda datos  │               │
│                                     │  - PostgreSQL    │               │
│                                     │  - Valida acceso │               │
│                                     └──────────────────┘               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**En resumen:**
- **Frontend** = Lo que el usuario ve y toca (browser)
- **Backend** = Vercel (servidor) + Supabase (base de datos)

---

## ¿Cómo se comunican? (LEER datos)

Cuando el usuario quiere **VER** sus incidentes:

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  BROWSER │         │  VERCEL  │         │ SUPABASE │
│(frontend)│         │ (backend)│         │   (BD)   │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │  1. Usuario entra  │                    │
     │     a la URL       │                    │
     │ ─────────────────► │                    │
     │                    │                    │
     │                    │  2. Vercel ejecuta │
     │                    │     page.tsx que   │
     │                    │     llama al       │
     │                    │     service.ts     │
     │                    │                    │
     │                    │  3. Service hace   │
     │                    │     SELECT a la BD │
     │                    │ ─────────────────► │
     │                    │                    │
     │                    │  4. Supabase       │
     │                    │     devuelve datos │
     │                    │ ◄───────────────── │
     │                    │                    │
     │  5. Vercel arma    │                    │
     │     el HTML y lo   │                    │
     │     envía          │                    │
     │ ◄───────────────── │                    │
     │                    │                    │
     │  6. Usuario ve     │                    │
     │     sus incidentes │                    │
     │                    │                    │
```

**Código involucrado:**

```typescript
// 1. page.tsx (corre en VERCEL)
import { getIncidentesByCurrentUser } from '@/features/incidentes/incidentes.service'

export default async function Page() {
  const incidentes = await getIncidentesByCurrentUser()  // llama al service
  return <TablaIncidentes datos={incidentes} />
}

// 2. incidentes.service.ts (corre en VERCEL)
'use server'
import { createClient } from '@/shared/lib/supabase/server'

export async function getIncidentesByCurrentUser() {
  const supabase = await createClient()
  const { data } = await supabase.from('incidentes').select('*')  // consulta BD
  return data
}
```

---

## ¿Cómo se comunican? (ESCRIBIR datos)

Cuando el usuario quiere **CREAR** un incidente:

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  BROWSER │         │  VERCEL  │         │ SUPABASE │
│(frontend)│         │ (backend)│         │   (BD)   │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │  1. Usuario llena  │                    │
     │     formulario y   │                    │
     │     click "Guardar"│                    │
     │                    │                    │
     │  2. Llama Server   │                    │
     │     Action del     │                    │
     │     service        │                    │
     │ ─────────────────► │                    │
     │                    │                    │
     │                    │  3. Service hace   │
     │                    │     INSERT a la BD │
     │                    │ ─────────────────► │
     │                    │                    │
     │                    │  4. Supabase       │
     │                    │     confirma       │
     │                    │ ◄───────────────── │
     │                    │                    │
     │  5. Resultado:     │                    │
     │     success/error  │                    │
     │ ◄───────────────── │                    │
     │                    │                    │
     │  6. Usuario ve     │                    │
     │     "Incidente     │                    │
     │      creado"       │                    │
     │                    │                    │
```

**¿Cómo funciona?**

Usamos **Server Actions** (`'use server'`). Las funciones del service se ejecutan en Vercel (backend) pero se pueden llamar directamente desde componentes del browser.

**Código involucrado:**

```typescript
// 1. service.ts (corre en VERCEL gracias a 'use server')
import { createClient } from '@/shared/lib/supabase/server'
import type { ActionResult } from '@/shared/types'

export async function crearInmueble(data: {...}): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('inmuebles').insert(data)
  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

// 2. componente.client.tsx (corre en BROWSER, llama al server action)
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

---

## Resumen: ¿Quién habla con la base de datos?

| Acción | ¿Quién lo hace? | ¿Cómo? |
|--------|-----------------|--------|
| **LEER** (ver lista) | Vercel (backend) | `page.tsx` llama `service.ts` |
| **ESCRIBIR** (crear/editar) | Vercel (backend) | Componente llama Server Action del `service.ts` |

---

## Arquitectura Feature-Based

Organizamos el código por **features** (funcionalidades), no por tipo de archivo.

```
frontend/features/
│
├── auth/                        # Autenticación
│   ├── auth.types.ts            # Tipos: UsuarioActual
│   └── auth.service.ts          # getCurrentUser, requireAdmin
│
├── incidentes/                  # Incidentes
│   ├── incidentes.types.ts      # Tipos: Incidente, CreateIncidenteDTO
│   └── incidentes.service.ts    # getIncidentesByCurrentUser, etc.
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

### ¿Por qué esta estructura?

| Antes (por tipo) | Ahora (por feature) |
|------------------|---------------------|
| Archivos relacionados dispersos | Todo junto en una carpeta |
| Difícil encontrar código | Fácil: busca la feature |
| Cambios tocan muchas carpetas | Cambios en una sola carpeta |

---

## Carpeta `app/` - Las páginas

Cada carpeta dentro de `app/` es una **URL** del sitio. Next.js usa el nombre de las carpetas para armar las rutas.

```
app/
│
├── (auth)/                          # Páginas públicas (sin login)
│   ├── login/page.tsx               # → /login
│   └── register/page.tsx            # → /register
│
├── (cliente)/                       # Todo lo del cliente
│   ├── layout.tsx                   # Navegación del cliente (se repite en todas las páginas)
│   └── cliente/
│       ├── page.tsx                 # → /cliente (inicio)
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
│       ├── page.tsx                 # → /tecnico (inicio)
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
│       ├── page.tsx                 # → /dashboard (inicio)
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

### Archivos especiales de Next.js

| Archivo | Qué hace |
|---------|----------|
| `page.tsx` | Define la página de esa URL. Corre en **Vercel** (backend) |
| `layout.tsx` | Envuelve las páginas hijas (navbar, sidebar). Se comparte entre páginas del mismo grupo |
| `loading.tsx` | Se muestra mientras la página carga (skeleton animado) |

### ¿Qué son los paréntesis? `(cliente)`, `(admin)`, etc.

Son **grupos de rutas**. Sirven para agrupar páginas que comparten un layout, pero **no aparecen en la URL**.

```
(cliente)/cliente/incidentes/page.tsx  →  /cliente/incidentes
^^^^^^^^ esto NO aparece en la URL
```

Cada grupo tiene su propio `layout.tsx` que pone la navegación correcta (navbar de cliente, sidebar de admin, etc.).

---

## Carpeta `components/` - Lo visual

Los componentes son las piezas visuales que se usan dentro de las páginas.

```
components/
│
├── ui/                              # Componentes genéricos (shadcn/ui)
│   ├── button.tsx                   # Botón reutilizable
│   ├── card.tsx                     # Tarjeta
│   ├── dialog.tsx                   # Modal/popup
│   ├── input.tsx                    # Campo de texto
│   ├── table.tsx                    # Tabla
│   ├── select.tsx                   # Dropdown
│   ├── sidebar.tsx                  # Sidebar del admin
│   └── ...                          # Otros componentes base
│
├── cliente/                         # Componentes del cliente
│   ├── cliente-nav.tsx              # Barra de navegación del cliente
│   ├── incidentes-content.client.tsx    # Contenido de la página de incidentes
│   └── propiedades-content.client.tsx   # Contenido de la página de propiedades
│
├── tecnico/                         # Componentes del técnico
│   ├── tecnico-nav.tsx              # Barra de navegación del técnico
│   ├── trabajos-content.client.tsx      # Contenido de la página de trabajos
│   └── disponibles-content.client.tsx   # Contenido de la página de disponibles
│
├── admin/                           # Componentes del admin
│   ├── admin-sidebar.tsx            # Sidebar de navegación
│   ├── incidentes-content.client.tsx    # Contenido de incidentes para admin
│   └── tecnicos/                    # Sub-componentes de gestión de técnicos
│
├── incidentes/                      # Componentes compartidos de incidentes
│   └── incidente-detail-modal.tsx   # Modal de detalle (lo usan cliente y admin)
│
├── landing/                         # Componentes de la landing page
│   ├── hero-section.tsx
│   ├── features-section.tsx
│   └── cta-section.tsx
│
└── ai-help-chat.tsx                 # Chat de ayuda con IA
```

### ¿Qué diferencia hay entre `componente.tsx` y `componente.client.tsx`?

| Tipo | Dónde corre | Para qué |
|------|-------------|----------|
| `nombre.tsx` | Vercel (servidor) | Solo muestra datos, sin interactividad |
| `nombre.client.tsx` | Browser (usuario) | Tiene botones, formularios, clicks, estados |

Si el componente necesita `useState`, `onClick`, formularios o cualquier interacción del usuario, **debe ser `.client.tsx`**.

---

## Cómo se conecta todo

El proyecto tiene 5 carpetas principales. Cada una tiene un rol específico:

```
frontend/
│
├── app/            # PÁGINAS — cada carpeta es una URL (/cliente, /dashboard, etc.)
├── components/     # VISUAL — lo que el usuario ve (tablas, modals, formularios)
├── features/       # DATOS — lee y escribe a la base de datos ('use server')
├── hooks/          # HOOKS — lógica reutilizable de React (ej: detectar si es mobile)
└── shared/         # COMPARTIDO — tipos, utilidades y conexión a Supabase
```

### ¿Quién llama a quién?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  app/page.tsx                                                           │
│  (la página)                                                            │
│       │                                                                 │
│       │ 1. Llama al service          2. Pasa datos al componente        │
│       │    para obtener datos            como props                     │
│       ▼                                  ▼                              │
│                                                                         │
│  features/service.ts              components/content.client.tsx          │
│  (corre en VERCEL)                (corre en BROWSER)                    │
│       │                                  │                              │
│       │ Lee/escribe                      │ 3. Cuando el usuario         │
│       │ a la BD                          │    hace click/submit,        │
│       ▼                                  │    llama Server Actions      │
│                                          │    del service               │
│  shared/lib/supabase/                    │                              │
│  (conexión a la BD)                      └──────► features/service.ts   │
│                                                   (se ejecuta en VERCEL)│
│                                                                         │
│  shared/types/  ←── tipos usados por todos (features, components, app)  │
│  shared/utils/  ←── funciones auxiliares usadas por todos               │
│  hooks/         ←── hooks de React usados por components                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Ejemplo real: página de incidentes del cliente

```typescript
// 1. PÁGINA: app/(cliente)/cliente/incidentes/page.tsx
//    Corre en Vercel. Obtiene datos y los pasa al componente.

import { getCurrentUser } from '@/features/auth/auth.service'
import { getIncidentesByCurrentUser } from '@/features/incidentes/incidentes.service'
import { IncidentesContent } from '@/components/cliente/incidentes-content.client'

export default async function ClienteIncidentesPage() {
  const user = await getCurrentUser()          // ← usa feature auth
  const incidentes = await getIncidentesByCurrentUser()  // ← usa feature incidentes
  return <IncidentesContent incidentes={incidentes} />   // ← pasa datos al componente
}

// 2. FEATURE: features/incidentes/incidentes.service.ts
//    Lee y escribe datos a Supabase (corre en Vercel, tiene 'use server')

// 3. COMPONENTE: components/cliente/incidentes-content.client.tsx
//    Recibe los datos y los muestra (corre en Browser)
//    Si el usuario crea un incidente, llama un Server Action del service
```

En resumen: **app/ orquesta**, **features/ accede a la BD**, **components/ muestra e interactúa**, **shared/ provee herramientas comunes**, **hooks/ provee lógica de React reutilizable**.

---

## Estructura completa del proyecto

```
frontend/
│
├── app/                         # PÁGINAS — cada carpeta = una URL
│
├── components/                  # COMPONENTES VISUALES — lo que el usuario ve
│   └── ui/                      # Componentes base de shadcn/ui (botones, modals, etc.)
│
├── features/                    # LÓGICA DE NEGOCIO — types + services ('use server')
│
├── hooks/                       # HOOKS DE REACT
│   └── use-mobile.ts            # Detecta si el usuario está en celular
│
└── shared/                      # CÓDIGO COMPARTIDO por todo el proyecto
    ├── lib/supabase/            # Conexión a base de datos
    │   ├── server.ts            # Para services (lecturas y escrituras)
    │   ├── admin.ts             # Para operaciones admin (bypass RLS)
    │   ├── client.ts            # Solo para auth (login/register) y real-time
    │   └── middleware.ts        # Refresca la sesión en cada request
    ├── types/                   # Tipos TypeScript compartidos
    │   ├── models.ts            # ActionResult, tipos del dominio
    │   ├── enums.ts             # Enumeraciones (estados, roles, etc.)
    │   └── database.types.ts    # Tipos auto-generados de Supabase
    └── utils/                   # Funciones auxiliares
        ├── cn.ts                # Merge de clases CSS (Tailwind)
        ├── colors.ts            # Colores por estado/prioridad
        ├── address.ts           # Formateo de direcciones
        └── error-messages.ts    # Mensajes de error reutilizables
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

## Stack Tecnológico

| Parte | Tecnología |
|-------|------------|
| Frontend (visual) | Next.js + React + Tailwind |
| Backend (servidor) | Next.js en Vercel |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |

---

## Instalación

```bash
cd frontend
npm install
cp .env.example .env.local   # Configurar credenciales
npm run dev                   # http://localhost:3000
```

---

## Roles del sistema

| Rol | Qué puede hacer |
|-----|-----------------|
| **admin** | Todo: ver, crear, editar, eliminar |
| **cliente** | Ver y crear SUS incidentes |
| **tecnico** | Ver y gestionar trabajos asignados |

---

## Guía de Trabajo Colaborativo

### Regla de oro: 2 archivos por feature

Cada feature tiene SOLO 2 archivos, nada más:

```
features/nombreFeature/
├── nombreFeature.types.ts     # Tipos e interfaces
└── nombreFeature.service.ts   # Funciones de LECTURA y ESCRITURA ('use server')
```

**Todas las operaciones con la BD** (lecturas y escrituras) van en los services. Los componentes `.client.tsx` llaman a las funciones del service como **Server Actions**.

---

### Cómo agregar una nueva feature

**Ejemplo: Agregar feature "contratos"**

1. Crear la carpeta:
```bash
mkdir frontend/features/contratos
```

2. Crear `contratos.types.ts`:
```typescript
// frontend/features/contratos/contratos.types.ts

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

3. Crear `contratos.service.ts`:
```typescript
// frontend/features/contratos/contratos.service.ts
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

4. Usar en una página:
```typescript
// app/(cliente)/cliente/contratos/page.tsx

import { getContratosByCliente } from '@/features/contratos/contratos.service'
import type { Contrato } from '@/features/contratos/contratos.types'

export default async function ContratosPage() {
  const contratos = await getContratosByCliente(123)
  return <ContratosContent contratos={contratos} />
}
```

---

### Convenciones de nombres

| Tipo de archivo | Nombre | Ejemplo |
|-----------------|--------|---------|
| Types | `feature.types.ts` | `incidentes.types.ts` |
| Service | `feature.service.ts` | `incidentes.service.ts` |
| Componente Server | `nombre.tsx` | `incidente-card.tsx` |
| Componente Client | `nombre.client.tsx` | `incidentes-content.client.tsx` |
| Página | `page.tsx` | `page.tsx` |

### Cómo importar

```typescript
// Tipos: desde feature.types.ts
import type { Incidente } from '@/features/incidentes/incidentes.types'

// Funciones (lectura y escritura): desde feature.service.ts
import { getIncidentesByCurrentUser } from '@/features/incidentes/incidentes.service'
import { crearInmueble } from '@/features/inmuebles/inmuebles.service'

// Supabase para services (lecturas y escrituras):
import { createClient } from '@/shared/lib/supabase/server'

// Supabase admin (operaciones que bypasean RLS, solo en services):
import { createAdminClient } from '@/shared/lib/supabase/admin'

// Supabase client (SOLO para auth y real-time, NO para leer/escribir datos):
import { createClient } from '@/shared/lib/supabase/client'
```

---

### Checklist antes de hacer PR

- [ ] Los types están en `feature.types.ts`
- [ ] Las lecturas Y escrituras están en `feature.service.ts` (con `'use server'`)
- [ ] Las escrituras retornan `ActionResult`
- [ ] El componente `.client.tsx` llama Server Actions del service (no usa `supabase/client` para datos)
- [ ] El componente con interactividad tiene `.client.tsx`
- [ ] Los imports apuntan al archivo exacto (ej: `@/features/auth/auth.service`)
- [ ] `npm run build` pasa sin errores

---

### Errores comunes

| Error | Solución |
|-------|----------|
| "use client" en service | Los services usan `'use server'`, NUNCA "use client" |
| Fetch en useEffect | Usar service en page.tsx, pasar datos como props |
| Escribir a BD desde componente | Crear una función en el service y llamarla como Server Action |
| Importar supabase/client para datos | Usar funciones del service en vez de acceso directo. `supabase/client` solo para auth y real-time |
| Crear archivos innecesarios | Solo `types.ts` y `service.ts` por feature, nada más |
| Falta `'use server'` en service | Debe ser la primera línea del archivo service |

---

Proyecto de tesis - 2024-2025
