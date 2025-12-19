# Próximos Pasos - Sistema de Gestión de Incidentes

## Estado Actual del Proyecto

### ✅ Completado

1. **Infraestructura Base**
   - Proyecto Next.js 15 con TypeScript configurado
   - shadcn/ui instalado y configurado
   - Supabase conectado con variables de entorno
   - Middleware de autenticación configurado

2. **Layouts y Navegación**
   - Layout de autenticación (login)
   - Layout administrativo con sidebar
   - Layout mobile para técnicos con navegación inferior
   - Página de login funcional

3. **Tipos y Estructura**
   - Tipos TypeScript para todas las tablas de la BD
   - Enumeraciones y constantes del sistema
   - Estructura de carpetas organizada por roles

4. **Documentación**
   - Esquema de base de datos documentado
   - README principal del proyecto
   - README del frontend
   - DER y diagrama de dominio

## Próximos Pasos Recomendados

### Fase 1: Configuración de Supabase (1-2 días)

1. **Configurar Autenticación en Supabase**
   - Habilitar Email/Password authentication
   - Configurar email templates
   - Crear usuarios de prueba para cada rol
   - Configurar Row Level Security (RLS) en todas las tablas

2. **Crear Tabla de Usuarios**
   ```sql
   CREATE TABLE public.usuarios (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     nombre VARCHAR NOT NULL,
     apellido VARCHAR NOT NULL,
     rol VARCHAR NOT NULL CHECK (rol IN ('admin', 'gestor', 'tecnico', 'cliente')),
     id_tecnico INTEGER REFERENCES tecnicos(id_tecnico),
     id_cliente INTEGER REFERENCES clientes(id_cliente),
     esta_activo BOOLEAN DEFAULT true,
     fecha_creacion TIMESTAMP DEFAULT NOW(),
     fecha_modificacion TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Configurar RLS (Row Level Security)**
   - Políticas para clientes (solo ver sus incidentes)
   - Políticas para técnicos (solo ver incidentes asignados)
   - Políticas para admin/gestor (acceso completo)

### Fase 2: Módulo de Incidentes (3-4 días)

1. **Vista de Lista de Incidentes**
   - Crear tabla con filtros y búsqueda
   - Paginación
   - Estados con badges de colores
   - Acciones rápidas (ver, editar, asignar)

2. **Formulario de Creación de Incidente**
   - Selección de propiedad
   - Selección de cliente
   - Categoría y prioridad
   - Descripción del problema
   - Carga de fotos iniciales

3. **Vista de Detalle de Incidente**
   - Timeline de estados
   - Información completa
   - Documentos adjuntos
   - Historial de cambios
   - Acciones según estado

4. **Asignación de Técnicos**
   - Modal para seleccionar técnico
   - Filtrar por especialidad
   - Ver disponibilidad y calificación
   - Programar fecha de visita

### Fase 3: Módulo de Técnicos (2-3 días)

1. **Vista Mobile de Incidentes para Técnico**
   - Lista de incidentes asignados
   - Filtros por estado
   - Cards con información clave
   - Navegación tipo swipe

2. **Formulario de Inspección**
   - Descripción de la inspección
   - Causas determinadas
   - Daños identificados
   - Materiales necesarios
   - Estimación de días de trabajo
   - Carga de fotos

3. **Actualización de Estado**
   - Marcar como "En Proceso"
   - Marcar como "Finalizado"
   - Agregar observaciones

### Fase 4: Módulo de Presupuestos (2-3 días)

1. **Generación de Presupuesto**
   - Basado en inspección
   - Desglose de costos (materiales, mano de obra, gastos admin)
   - Cálculo automático de total
   - Alternativas de reparación

2. **Aprobación de Presupuestos**
   - Vista para cliente/propietario
   - Botones de aprobar/rechazar
   - Comentarios
   - Notificaciones automáticas

3. **Lista de Presupuestos**
   - Filtros por estado
   - Búsqueda
   - Exportar a PDF

### Fase 5: Módulo de Pagos (2 días)

1. **Registro de Pagos**
   - Formulario con método de pago
   - Carga de comprobante
   - Validación de montos
   - Relación con presupuesto

2. **Lista de Pagos**
   - Filtros por fecha, estado, técnico
   - Búsqueda
   - Dashboard de pagos pendientes

### Fase 6: Propiedades y Clientes (2-3 días)

1. **CRUD de Propiedades**
   - Lista con búsqueda y filtros
   - Formulario de creación/edición
   - Vista de detalle con historial de incidentes
   - Relación con propietarios e inquilinos

2. **CRUD de Clientes**
   - Lista con búsqueda
   - Formulario con datos de contacto
   - Tipos de cliente (propietario/inquilino/tercero)
   - Historial de incidentes relacionados

### Fase 7: Documentos y Conformidades (2 días)

1. **Sistema de Carga de Documentos**
   - Integrar Supabase Storage
   - Drag & drop de archivos
   - Preview de imágenes
   - Organización por tipo

2. **Conformidades**
   - Generación de documento de conformidad
   - Firma digital (canvas HTML5)
   - Almacenamiento en Supabase Storage

### Fase 8: Calificaciones (1-2 días)

1. **Sistema de Calificación**
   - Modal de calificación post-cierre
   - Estrellas (1-5)
   - Comentarios opcionales
   - Actualización automática de promedio del técnico

### Fase 9: Dashboard y Reportes (2-3 días)

1. **Dashboard Administrativo**
   - KPIs principales (incidentes activos, tiempo promedio, etc.)
   - Gráficos de tendencias
   - Top técnicos por calificación
   - Incidentes por categoría/prioridad

2. **Dashboard de Técnico**
   - Estadísticas personales
   - Próximas visitas
   - Calificación promedio
   - Pagos pendientes

### Fase 10: Notificaciones (2-3 días)

1. **Sistema de Notificaciones**
   - Notificaciones en tiempo real con Supabase Realtime
   - Bell icon con badge
   - Panel de notificaciones
   - Marcar como leído

2. **Emails Automáticos**
   - Configurar Supabase Email templates
   - Notificar asignaciones
   - Notificar cambios de estado
   - Recordatorios de visitas programadas

### Fase 11: Optimizaciones y UX (2-3 días)

1. **Loading States**
   - Skeletons para carga de datos
   - Spinners en botones
   - Suspense boundaries

2. **Error Handling**
   - Error boundaries
   - Mensajes de error amigables
   - Retry automático

3. **Responsive Design**
   - Verificar todas las vistas en mobile/tablet
   - Optimizar tablas para mobile
   - Menús adaptables

### Fase 12: Testing y QA (3-4 días)

1. **Testing Manual**
   - Flujo completo de incidente
   - Pruebas de cada rol
   - Edge cases

2. **Testing Automatizado** (opcional)
   - Tests unitarios con Vitest
   - Tests E2E con Playwright
   - Tests de integración

## Consideraciones Técnicas

### Performance
- Implementar Server Components donde sea posible
- Lazy loading de imágenes
- Paginación en listas largas
- Caché de queries frecuentes

### Seguridad
- Validación en cliente y servidor
- Sanitización de inputs
- RLS bien configurado
- No exponer service_role_key en cliente

### SEO (opcional para admin panel)
- Metadata por página
- OpenGraph tags
- Sitemap

## Recursos Adicionales Recomendados

1. **Supabase Realtime**: Para notificaciones en tiempo real
2. **React Hook Form**: Para formularios complejos
3. **Zod**: Para validación de esquemas
4. **TanStack Table**: Para tablas avanzadas
5. **Recharts**: Para gráficos del dashboard
6. **React PDF**: Para generar PDFs de presupuestos

## Estructura de Trabajo Recomendada

1. **Sprint 1** (Semana 1-2): Fases 1-3 (Supabase, Incidentes, Técnicos)
2. **Sprint 2** (Semana 3-4): Fases 4-6 (Presupuestos, Pagos, CRUD básico)
3. **Sprint 3** (Semana 5-6): Fases 7-9 (Documentos, Calificaciones, Dashboards)
4. **Sprint 4** (Semana 7-8): Fases 10-12 (Notificaciones, Optimizaciones, Testing)

## Notas Finales

- Prioriza funcionalidad core antes que features extras
- Testea cada módulo antes de continuar al siguiente
- Documenta decisiones importantes
- Haz commits frecuentes y descriptivos
- Considera usar Git Flow o GitHub Flow

¡Éxito con el desarrollo de tu tesis! 🚀
