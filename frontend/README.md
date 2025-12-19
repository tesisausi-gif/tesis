# Frontend - Sistema de Gestión de Incidentes

Frontend del sistema de gestión de incidentes desarrollado con Next.js 15 y shadcn/ui.

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase

# Iniciar desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Tecnologías

- **Next.js 15**: Framework React con App Router
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos utility-first
- **shadcn/ui**: Componentes de UI de alta calidad
- **Supabase**: Backend y autenticación
- **Sonner**: Notificaciones toast

## Estructura de Rutas

### Autenticación
- `/login` - Inicio de sesión

### Admin (Desktop)
- `/dashboard` - Dashboard principal
- `/dashboard/incidentes` - Gestión de incidentes
- `/dashboard/propiedades` - Gestión de propiedades
- `/dashboard/clientes` - Gestión de clientes
- `/dashboard/tecnicos` - Gestión de técnicos
- `/dashboard/presupuestos` - Presupuestos
- `/dashboard/pagos` - Pagos
- `/dashboard/calificaciones` - Calificaciones

### Técnico (Mobile-First)
- `/mis-incidentes` - Inicio técnico
- `/mis-incidentes/lista` - Lista de incidentes asignados
- `/mis-incidentes/perfil` - Perfil del técnico

## Layouts

El proyecto utiliza layouts agrupados para diferentes tipos de usuarios:

- `(auth)` - Layout para autenticación (centrado, simple)
- `(admin)` - Layout con sidebar para administradores
- `(tecnico)` - Layout mobile-first para técnicos

## Componentes

### UI Components (shadcn/ui)
Los componentes base están en `/components/ui/`:
- button, card, table, form, input
- dropdown-menu, dialog, badge, avatar
- select, sidebar, sonner, etc.

### Componentes Personalizados
- `/components/admin/` - Componentes del dashboard admin
- `/components/tecnico/` - Componentes para técnicos
- `/components/shared/` - Componentes compartidos

## Tipos TypeScript

### Database Types
`/types/database.types.ts` contiene los tipos generados desde el esquema de Supabase.

### Enums
`/types/enums.ts` contiene las enumeraciones del sistema:
- Estados de incidentes
- Prioridades
- Tipos de documentos
- Roles de usuario
- etc.

## Supabase

### Cliente Supabase
Diferentes clientes según el contexto:

```typescript
// Cliente del navegador (componentes cliente)
import { createClient } from '@/lib/supabase/client'

// Cliente del servidor (Server Components)
import { createClient } from '@/lib/supabase/server'
```

### Middleware
El middleware en `/middleware.ts` maneja:
- Actualización automática de sesiones
- Protección de rutas autenticadas
- Refresh de tokens

## Desarrollo

### Agregar nuevos componentes shadcn/ui
```bash
npx shadcn@latest add [component-name]
```

### Variables de Entorno Requeridas
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

## Deployment

### Vercel (Recomendado)
1. Conecta el repositorio a Vercel
2. Configura las variables de entorno
3. Deploy automático con cada push

### Otros Providers
```bash
npm run build
npm run start
```

## Notas

- El proyecto usa Next.js 15 con Turbopack
- Todas las rutas están protegidas por autenticación
- La vista de técnicos está optimizada para mobile
- El dashboard admin es responsive pero optimizado para desktop
