# Esquema de Base de Datos - Supabase

## Conexión
- **URL**: https://yaggvkaerloxjjmfxnys.supabase.co
- **Project ID**: yaggvkaerloxjjmfxnys

## Tablas Detectadas

### 1. clientes
Gestión de clientes (propietarios/inquilinos/terceros)

### 2. propiedades
Gestión de inmuebles
- id_propiedad
- direccion_completa
- tipo_propiedad
- id_propietario (FK a clientes)
- id_inquilino (FK a clientes)
- descripcion
- esta_activo
- fecha_creacion
- fecha_modificacion

### 3. incidentes
Gestión de incidentes reportados
- id_incidente
- id_propiedad (FK)
- id_cliente_reporta (FK)
- descripcion_problema
- categoria
- nivel_prioridad
- estado_actual
- id_responsable_pago (FK)
- fecha_registro
- fecha_cierre
- fue_resuelto
- fecha_creacion
- fecha_modificacion

### 4. tecnicos
Gestión de técnicos externos
- id_tecnico
- nombre
- apellido
- correo_electronico
- telefono
- dni
- direccion
- especialidad
- calificacion_promedio
- cantidad_trabajos_realizados
- esta_activo
- fecha_creacion
- fecha_modificacion

### 5. asignaciones_tecnico
Asignaciones de técnicos a incidentes
- id_asignacion
- id_incidente (FK)
- id_tecnico (FK)
- fecha_asignacion
- estado_asignacion
- fecha_visita_programada
- observaciones
- fecha_creacion
- fecha_modificacion

### 6. inspecciones
Inspecciones técnicas realizadas
- id_inspeccion
- id_incidente (FK)
- id_tecnico (FK)
- fecha_inspeccion
- descripcion_inspeccion
- causas_determinadas
- danos_ocasionados
- requiere_materiales
- descripcion_materiales
- requiere_ayudantes
- cantidad_ayudantes
- dias_estimados_trabajo
- fecha_creacion
- fecha_modificacion

### 7. presupuestos
Presupuestos generados para incidentes
- id_presupuesto
- id_incidente (FK)
- id_inspeccion (FK)
- descripcion_detallada
- costo_materiales
- costo_mano_obra
- gastos_administrativos
- costo_total
- estado_presupuesto
- fecha_aprobacion
- id_aprobado_por (FK)
- alternativas_reparacion
- fecha_creacion
- fecha_modificacion

### 8. pagos
Registro de pagos realizados
- id_pago
- id_incidente (FK)
- id_presupuesto (FK)
- monto_pagado
- tipo_pago
- fecha_pago
- metodo_pago
- numero_comprobante
- url_comprobante
- observaciones
- fecha_creacion
- fecha_modificacion

### 9. conformidades
Conformidades firmadas por clientes
- id_conformidad
- id_incidente (FK)
- id_cliente (FK)
- tipo_conformidad
- esta_firmada
- fecha_conformidad
- observaciones
- url_documento
- fecha_creacion
- fecha_modificacion

### 10. calificaciones
Calificaciones de técnicos
- id_calificacion
- id_incidente (FK)
- id_tecnico (FK)
- tipo_calificacion
- puntuacion
- comentarios
- resolvio_problema
- fecha_calificacion
- fecha_creacion
- fecha_modificacion

### 11. documentos
Documentos adjuntos a incidentes
- id_documento
- id_incidente (FK)
- tipo_documento
- nombre_archivo
- url_almacenamiento
- tipo_mime
- tamano_bytes
- descripcion
- fecha_creacion
- fecha_modificacion

## Observaciones

El esquema actual en Supabase incluye funcionalidades adicionales respecto al DER original:
- **Inspecciones**: Detalles técnicos de la evaluación del incidente
- **Conformidades**: Sistema de aprobaciones firmadas
- **Calificaciones**: Sistema de rating de técnicos más completo
- **Documentos**: Gestión de archivos adjuntos

Todas las tablas incluyen campos de auditoría (fecha_creacion, fecha_modificacion).
