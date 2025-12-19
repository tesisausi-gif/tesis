# Sistema de Gestión de Incidentes - ISBA

Sistema web completo para la gestión de incidentes en propiedades inmobiliarias, desarrollado con Next.js 15 y Supabase.

## Características Principales

### Para Administradores/Gestores ISBA
- Dashboard administrativo completo
- Gestión de incidentes, propiedades y clientes
- Asignación de técnicos
- Aprobación de presupuestos
- Gestión de pagos
- Sistema de calificaciones

### Para Técnicos
- Vista mobile-first optimizada
- Visualización de incidentes asignados
- Carga de inspecciones y presupuestos
- Actualización de estado de trabajos
- Gestión de documentos (fotos, comprobantes)

## Stack Tecnológico

- **Frontend**: Next.js 15 (App Router)
- **UI Components**: shadcn/ui
- **Estilos**: Tailwind CSS
- **Backend/Database**: Supabase
- **Autenticación**: Supabase Auth
- **Lenguaje**: TypeScript
- **Gestión de Estado**: React Hooks

## Estructura del Proyecto

```
frontend/
├── app/
│   ├── (auth)/          # Páginas de autenticación
│   │   └── login/
│   ├── (admin)/         # Dashboard administrativo
│   │   └── dashboard/
│   └── (tecnico)/       # Vista mobile para técnicos
│       └── mis-incidentes/
├── components/
│   ├── admin/           # Componentes del admin
│   ├── tecnico/         # Componentes para técnicos
│   ├── shared/          # Componentes compartidos
│   └── ui/              # Componentes de shadcn/ui
├── lib/
│   └── supabase/        # Configuración de Supabase
├── types/
│   ├── database.types.ts  # Tipos de la BD
│   └── enums.ts          # Enumeraciones del sistema
└── middleware.ts        # Middleware de autenticación
```

## Instalación

1. Clonar el repositorio:
```bash
cd sist_gestion_incidentes/frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Copia `.env.example` a `.env.local` y completa las credenciales de Supabase:
```bash
cp .env.example .env.local
```

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Configuración de Supabase

### Base de Datos

El proyecto utiliza las siguientes tablas principales:

- **clientes**: Información de clientes (propietarios/inquilinos)
- **propiedades**: Inmuebles gestionados
- **incidentes**: Reportes de incidentes
- **tecnicos**: Técnicos externos
- **asignaciones_tecnico**: Asignaciones de trabajos
- **inspecciones**: Inspecciones técnicas realizadas
- **presupuestos**: Presupuestos generados
- **pagos**: Registro de pagos
- **conformidades**: Conformidades firmadas
- **calificaciones**: Calificaciones de técnicos
- **documentos**: Archivos adjuntos

Ver documentación completa en `/documentacion/esquema_supabase.md`

### Autenticación

El sistema utiliza Supabase Auth con los siguientes roles:

- **admin**: Administrador con acceso completo
- **gestor**: Gestor de incidentes
- **tecnico**: Técnico externo
- **cliente**: Cliente (propietario/inquilino)

## Flujo de Trabajo del Sistema

1. **Reporte de Incidente**: Cliente o gestor reporta un incidente en una propiedad
2. **Evaluación**: Gestor evalúa y asigna prioridad
3. **Asignación**: Se asigna un técnico especializado
4. **Inspección**: Técnico realiza inspección y determina alcance
5. **Presupuesto**: Técnico/Gestor genera presupuesto
6. **Aprobación**: Cliente/Propietario aprueba presupuesto
7. **Ejecución**: Técnico ejecuta el trabajo
8. **Conformidad**: Cliente firma conformidad de trabajo
9. **Pago**: Registro de pagos al técnico
10. **Calificación**: Cliente califica el servicio

## Scripts Disponibles

```bash
npm run dev       # Inicia servidor de desarrollo
npm run build     # Construye para producción
npm run start     # Inicia servidor de producción
npm run lint      # Ejecuta linter
```

## Próximas Funcionalidades

- [ ] Sistema de notificaciones en tiempo real
- [ ] Chat entre técnicos y gestores
- [ ] Generación de reportes PDF
- [ ] Dashboard de métricas y KPIs
- [ ] App móvil nativa para técnicos
- [ ] Sistema de geolocalización
- [ ] Integración con WhatsApp

## Contribuir

Este es un proyecto de tesis. Para contribuir o reportar problemas, contacta al equipo de desarrollo.

## Licencia

Proyecto académico - Universidad [Nombre Universidad]

## Contacto

Desarrollado por: [Tu Nombre]
Email: [tu@email.com]
Año: 2024-2025
