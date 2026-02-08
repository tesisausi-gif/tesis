# Sistema de Gestión de Incidentes - ISBA

Sistema web para la gestión de incidentes en propiedades inmobiliarias.

## Stack Tecnológico

- **Frontend**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Backend/Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Deploy**: Vercel

---

## Arquitectura de la Aplicación

### Las 3 partes del sistema

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   BROWSER   │ ──── │   VERCEL    │ ──── │  SUPABASE   │
│  (Usuario)  │      │  (Servidor) │      │    (BD)     │
└─────────────┘      └─────────────┘      └─────────────┘
```

- **Browser**: Lo que ve el usuario (Chrome, Safari, etc.)
- **Vercel**: Donde corre tu código Next.js
- **Supabase**: La base de datos PostgreSQL en la nube

---

### ¿Cómo funciona Next.js?

Next.js convierte carpetas en URLs automáticamente:

```
app/
├── login/
│   └── page.tsx              →  tuapp.com/login
│
├── cliente/
│   ├── incidentes/
│   │   └── page.tsx          →  tuapp.com/cliente/incidentes
│   └── propiedades/
│       └── page.tsx          →  tuapp.com/cliente/propiedades
│
└── tecnico/
    └── trabajos/
        └── page.tsx          →  tuapp.com/tecnico/trabajos
```

**No hay endpoints manuales.** Next.js genera todo automáticamente.

---

### Flujo de datos

#### Para VER datos (cargar una página):

```
1. Usuario entra a /cliente/incidentes

2. VERCEL ejecuta page.tsx:
   └── Llama a getIncidentesByCurrentUser() del service
       └── El service consulta Supabase
           └── Supabase devuelve los datos

3. VERCEL arma el HTML con los datos

4. El usuario ve la página con sus incidentes
```

#### Para CREAR/EDITAR datos (enviar formulario):

```
1. Usuario llena formulario y hace click en "Guardar"

2. BROWSER ejecuta el código del componente:
   └── Hace supabase.from('tabla').insert({...})
       └── Supabase guarda el dato (RLS valida permisos)

3. Usuario ve mensaje de éxito
```

---

### Estructura de archivos

```
frontend/
├── app/                      # Páginas (cada carpeta = una URL)
│   ├── (auth)/login/
│   ├── (cliente)/cliente/
│   ├── (tecnico)/tecnico/
│   └── (admin)/dashboard/
│
├── components/               # Componentes de UI
│   ├── ui/                   # Botones, inputs, etc. (shadcn)
│   ├── cliente/              # Componentes del cliente
│   ├── tecnico/              # Componentes del técnico
│   └── admin/                # Componentes del admin
│
├── features/                 # Lógica por dominio
│   ├── incidentes/
│   │   ├── incidentes.types.ts    # Tipos de datos
│   │   └── incidentes.service.ts  # Funciones para consultar
│   ├── asignaciones/
│   ├── inmuebles/
│   └── usuarios/
│
└── shared/                   # Código compartido
    ├── lib/supabase/         # Conexión a Supabase
    ├── types/                # Tipos globales
    └── utils/                # Funciones auxiliares
```

---

### ¿Qué hace cada archivo en features/?

```
features/incidentes/
├── incidentes.types.ts      → Define la forma de los datos
└── incidentes.service.ts    → Funciones para leer de Supabase
```

**types.ts** - Define cómo se ven los datos:
```typescript
export interface Incidente {
  id_incidente: number
  descripcion_problema: string
  estado_actual: string
  // ...
}
```

**service.ts** - Funciones para consultar datos (corren en el servidor):
```typescript
export async function getIncidentesByCurrentUser() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('incidentes')
    .select('*')
  return data
}
```

---

### ¿Cómo se conecta todo?

```
page.tsx (la página)
    │
    │ importa y llama
    ▼
service.ts (funciones de consulta)
    │
    │ usa los tipos de
    ▼
types.ts (definición de datos)
    │
    │ consulta a
    ▼
Supabase (base de datos)
```

Ejemplo real:

```typescript
// app/(cliente)/cliente/incidentes/page.tsx

import { getIncidentesByCurrentUser } from '@/features/incidentes'

export default async function Page() {
  const incidentes = await getIncidentesByCurrentUser()
  return <IncidentesContent incidentes={incidentes} />
}
```

---

### Seguridad

La seguridad está en **Supabase RLS** (Row Level Security):

```
Usuario intenta ver incidentes de OTRO cliente
                    │
                    ▼
            ┌───────────────┐
            │   SUPABASE    │
            │   verifica:   │
            │ "¿Es tu dato?"│
            └───────┬───────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
    SÍ: datos               NO: array vacío
```

No importa si el código está en el browser. Supabase **siempre valida** antes de devolver datos.

---

## Instalación

```bash
cd frontend
npm install
cp .env.example .env.local   # Configurar credenciales
npm run dev                   # http://localhost:3000
```

## Scripts

```bash
npm run dev       # Desarrollo
npm run build     # Producción
npm run lint      # Linter
```

---

## Roles del sistema

| Rol | Acceso |
|-----|--------|
| **admin** | Dashboard completo, gestión total |
| **cliente** | Sus incidentes y propiedades |
| **tecnico** | Trabajos asignados |

---

## Tablas principales

- `usuarios` - Usuarios del sistema
- `clientes` - Datos de clientes
- `tecnicos` - Datos de técnicos
- `inmuebles` - Propiedades
- `incidentes` - Reportes de problemas
- `asignaciones_tecnico` - Trabajos asignados

---

## Contacto

Proyecto de tesis - 2024-2025
