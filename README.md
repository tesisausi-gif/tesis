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
┌──────────┐                              ┌──────────┐
│  BROWSER │                              │ SUPABASE │
│(frontend)│                              │   (BD)   │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  1. Usuario llena formulario            │
     │     y hace click en "Guardar"           │
     │                                         │
     │  2. Browser ejecuta código              │
     │     que hace INSERT directo             │
     │ ──────────────────────────────────────► │
     │                                         │
     │                                         │  3. Supabase:
     │                                         │     - Valida permisos (RLS)
     │                                         │     - Guarda el dato
     │                                         │
     │  4. Supabase confirma                   │
     │     "Guardado OK"                       │
     │ ◄────────────────────────────────────── │
     │                                         │
     │  5. Usuario ve mensaje                  │
     │     "Incidente creado"                  │
     │                                         │
```

**¿Por qué va directo a Supabase sin pasar por Vercel?**

Porque es más simple y Supabase ya tiene seguridad (RLS).

**Código involucrado:**

```typescript
// componente.client.tsx (corre en BROWSER)
import { createClient } from '@/shared/lib/supabase/client'  // OJO: client, NO server

const handleSubmit = async () => {
  const supabase = createClient()

  await supabase
    .from('incidentes')
    .insert({
      descripcion: 'Se rompió el caño',
      id_cliente: 123
    })

  toast.success('Incidente creado')
}
```

---

## Resumen: ¿Quién habla con la base de datos?

| Acción | ¿Quién lo hace? | ¿Por qué? |
|--------|-----------------|-----------|
| **LEER** (ver lista) | Vercel (backend) | Arma el HTML antes de enviarlo |
| **ESCRIBIR** (crear/editar) | Browser (frontend) | Es más simple, RLS valida |

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

## Estructura completa del proyecto

```
frontend/
│
├── app/                         # PÁGINAS (cada carpeta = una URL)
│   ├── (cliente)/cliente/       # Rutas del cliente
│   │   ├── incidentes/page.tsx  # → tuapp.com/cliente/incidentes
│   │   └── propiedades/page.tsx # → tuapp.com/cliente/propiedades
│   ├── (tecnico)/tecnico/       # Rutas del técnico
│   │   ├── trabajos/page.tsx    # → tuapp.com/tecnico/trabajos
│   │   └── disponibles/page.tsx # → tuapp.com/tecnico/disponibles
│   └── (admin)/dashboard/       # Rutas del admin
│
├── components/                  # COMPONENTES VISUALES
│   ├── ui/                      # Botones, inputs (shadcn)
│   ├── cliente/                 # Componentes del cliente
│   │   └── incidentes-content.client.tsx
│   └── tecnico/                 # Componentes del técnico
│
├── features/                    # LÓGICA DE NEGOCIO (ver arriba)
│
└── shared/                      # CÓDIGO COMPARTIDO
    ├── lib/supabase/            # Conexión a base de datos
    │   ├── client.ts            # Para usar desde BROWSER
    │   └── server.ts            # Para usar desde VERCEL
    └── types/                   # Tipos compartidos
```

---

## ¿Qué hace cada archivo?

### page.tsx (la página)
- Define qué se muestra en una URL
- Corre en **Vercel** (backend)
- Llama al service para obtener datos

### service.ts (funciones de consulta)
- Funciones para LEER datos de Supabase
- Corre en **Vercel** (backend)
- Ejemplo: `getIncidentesByCurrentUser()`

### types.ts (tipos de datos)
- Define la forma de los datos
- No corre, solo describe
- Ejemplo: `interface Incidente { id, descripcion, ... }`

### component.tsx (componentes visuales)
- Lo que el usuario ve: tablas, botones, formularios
- Corre en **Browser** (frontend)
- Para ESCRIBIR, llama directo a Supabase

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
└── nombreFeature.service.ts   # Funciones de LECTURA (corren en Vercel)
```

**Las ESCRITURAS (insert, update, delete) van directo en los componentes `.client.tsx`**, no en los services.

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

import { createClient } from '@/shared/lib/supabase/server'
import type { Contrato } from './contratos.types'

export async function getContratosByCliente(idCliente: number): Promise<Contrato[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contratos')
    .select('*')
    .eq('id_cliente', idCliente)

  if (error) throw error
  return data
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

// Funciones: desde feature.service.ts
import { getIncidentesByCurrentUser } from '@/features/incidentes/incidentes.service'

// Supabase para LEER (en services / page.tsx):
import { createClient } from '@/shared/lib/supabase/server'

// Supabase para ESCRIBIR (en componentes .client.tsx):
import { createClient } from '@/shared/lib/supabase/client'
```

---

### Checklist antes de hacer PR

- [ ] Los types están en `feature.types.ts`
- [ ] Las queries de lectura están en `feature.service.ts`
- [ ] Las escrituras van directo desde el componente `.client.tsx`
- [ ] El componente con interactividad tiene `.client.tsx`
- [ ] Los imports apuntan al archivo exacto (ej: `@/features/auth/auth.service`)
- [ ] `npm run build` pasa sin errores

---

### Errores comunes

| Error | Solución |
|-------|----------|
| "use client" en service | Los services son para SERVER, no usan "use client" |
| Fetch en useEffect | Usar service en page.tsx, pasar datos como props |
| Importar supabase/server en componente client | Usar `@/shared/lib/supabase/client` en `.client.tsx` |
| Crear archivos innecesarios | Solo `types.ts` y `service.ts` por feature, nada más |

---

Proyecto de tesis - 2024-2025
