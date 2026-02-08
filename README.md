# Sistema de Gestión de Incidentes - ISBA

Sistema web para la gestión de incidentes en propiedades inmobiliarias.

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
export default async function Page() {
  const incidentes = await getIncidentesByCurrentUser()  // llama al service
  return <TablaIncidentes datos={incidentes} />
}

// 2. service.ts (corre en VERCEL)
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
// componente.tsx (corre en BROWSER)
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

## Estructura del proyecto

```
frontend/
│
├── app/                         # PÁGINAS (cada carpeta = una URL)
│   ├── cliente/incidentes/
│   │   └── page.tsx             # → tuapp.com/cliente/incidentes
│   └── tecnico/trabajos/
│       └── page.tsx             # → tuapp.com/tecnico/trabajos
│
├── components/                  # COMPONENTES VISUALES
│   ├── ui/                      # Botones, inputs (shadcn)
│   └── cliente/                 # Componentes del cliente
│       └── incidentes-content.tsx  # Tabla, formularios, etc.
│
├── features/                    # LÓGICA DE NEGOCIO
│   └── incidentes/
│       ├── incidentes.types.ts     # Define forma de los datos
│       └── incidentes.service.ts   # Funciones para LEER de BD
│
└── shared/
    └── lib/supabase/            # CONEXIÓN A BASE DE DATOS
        ├── client.ts            # Para usar desde BROWSER
        └── server.ts            # Para usar desde VERCEL
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

Proyecto de tesis - 2024-2025
