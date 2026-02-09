# Documentación - Sistema de Gestión de Incidentes

Esta carpeta contiene toda la documentación del proyecto de tesis.

## 📚 Índice de Documentos

### Diagramas y Arquitectura
- **[der.md](./der.md)** - Diagrama Entidad-Relación de la base de datos
- **[diagramaDominio.md](./diagramaDominio.md)** - Diagrama de dominio del sistema
- **[esquema_supabase.md](./esquema_supabase.md)** - Esquema detallado de las tablas en Supabase
- **[diagrama_arquitectura.md](./diagrama_arquitectura.md)** - Diagrama de arquitectura del sistema

### Guías de Configuración
- **[guia_scripts_sql.md](./guia_scripts_sql.md)** - Cómo ejecutar los scripts SQL en Supabase

### Guías de Desarrollo
- **[manejo_errores.md](./manejo_errores.md)** - Sistema de manejo de errores de autenticación
- **[sincronizacion_usuarios.md](./sincronizacion_usuarios.md)** - Sistema de sincronización automática auth.users ↔ usuarios
- **[vistas_por_rol.md](./vistas_por_rol.md)** - Sistema de vistas separadas por rol (admin, cliente, técnico)
- **[PROXIMOS_PASOS.md](./PROXIMOS_PASOS.md)** - Roadmap de desarrollo por fases

## 🗂️ Estructura del Proyecto

```
/documentacion/
├── README.md                    # Este archivo (índice)
├── der.md                       # Diagrama ER
├── diagramaDominio.md          # Diagrama de dominio
├── esquema_supabase.md         # Esquema de BD
├── diagrama_arquitectura.md    # Arquitectura del sistema
├── guia_scripts_sql.md         # Guía SQL
├── manejo_errores.md           # Manejo de errores
├── sincronizacion_usuarios.md  # Sistema auto-sync usuarios
├── vistas_por_rol.md           # Vistas separadas por rol
└── PROXIMOS_PASOS.md           # Roadmap general

/scripts/
├── 01_setup_database.sql       # Script: tabla usuarios
├── 02_setup_solicitudes.sql    # Script: solicitudes
├── 03_crear_admin.sql          # Referencia admin
├── 04_fix_rls_policies.sql     # Fix: políticas RLS sin recursión
├── 05_insert_existing_users.sql # Backfill: usuarios existentes
├── 06_auto_create_user_trigger.sql # Trigger: auto-registro básico
└── 07_trigger_crear_cliente_tecnico.sql # Trigger: clientes + tecnicos

/frontend/
└── (código del proyecto)
```

## 🚀 Inicio Rápido

### 1. Configurar Base de Datos
Lee: [guia_scripts_sql.md](./guia_scripts_sql.md)

### 2. Entender la Arquitectura
Lee: [der.md](./der.md) y [esquema_supabase.md](./esquema_supabase.md)

### 3. Planificar Desarrollo
Lee: [PROXIMOS_PASOS.md](./PROXIMOS_PASOS.md)

## 📖 Convenciones

- Todos los archivos de documentación están en **español**
- Los diagramas usan formato **Mermaid** (para visualización en GitHub/editores compatibles)
- Los scripts SQL están en `/scripts/` (referenciados desde aquí)

## ✏️ Contribuir a la Documentación

Al agregar nueva documentación:
1. Crear el archivo `.md` en esta carpeta
2. Usar nombres descriptivos (snake_case)
3. Actualizar este README con el nuevo documento
4. Mantener estructura consistente

## 🔗 Enlaces Útiles

- **Proyecto Supabase**: https://app.supabase.com/project/yaggvkaerloxjjmfxnys
- **Repositorio GitHub**: https://github.com/tesisausi-gif/tesis.git
- **README Principal**: [../README.md](../README.md)
