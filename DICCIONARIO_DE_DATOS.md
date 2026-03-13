# Diccionario de Datos - Sistema ISBA

Este documento detalla la estructura de la base de datos PostgreSQL alojada en Supabase, incluyendo tablas, sus propósitos y los campos principales.

---

## 1. Tabla: `usuarios`
Almacena la información de perfil común para todos los usuarios del sistema.
*   **id (UUID)**: Clave primaria, vinculada a `auth.users` de Supabase.
*   **nombre (Text)**: Nombre de pila del usuario.
*   **apellido (Text)**: Apellido del usuario.
*   **correo_electronico (Text)**: Email de contacto (único).
*   **rol (Enum)**: Puede ser `admin`, `gestor`, `cliente` o `tecnico`.
*   **id_cliente (FK)**: Referencia opcional a la tabla `clientes`.
*   **id_tecnico (FK)**: Referencia opcional a la tabla `tecnicos`.

---

## 2. Tabla: `clientes`
Contiene datos específicos para usuarios con rol de cliente.
*   **id_cliente (BigInt)**: Clave primaria autoincremental.
*   **dni (Text)**: Documento nacional de identidad (único).
*   **telefono (Text)**: Número de contacto.
*   **esta_activo (Boolean)**: Indica si el cliente puede operar en el sistema.

---

## 3. Tabla: `tecnicos`
Contiene la especialidad y desempeño de los profesionales.
*   **id_tecnico (BigInt)**: Clave primaria autoincremental.
*   **especialidad (Text)**: Área de expertise (Plomería, Electricidad, etc.).
*   **dni (Text)**: Documento de identidad.
*   **calificacion_promedio (Numeric)**: Promedio de estrellas recibidas (0-5).
*   **esta_activo (Boolean)**: Indica si el técnico puede recibir asignaciones.

---

## 4. Tabla: `inmuebles`
Registro de las propiedades donde ocurren los incidentes.
*   **id_inmueble (BigInt)**: Clave primaria.
*   **id_cliente (FK)**: Referencia al dueño/inquilino responsable.
*   **id_tipo_inmueble (FK)**: Referencia a la tabla maestra de tipos (Dpto, Casa).
*   **calle, altura, piso, dpto (Text)**: Datos de ubicación exacta.
*   **localidad, provincia (Text)**: Ubicación geográfica.

---

## 5. Tabla: `incidentes`
Entidad central que registra los problemas reportados.
*   **id_incidente (BigInt)**: Clave primaria.
*   **id_propiedad (FK)**: Referencia al inmueble afectado.
*   **id_cliente_reporta (FK)**: Quién realizó el reporte.
*   **descripcion_problema (Text)**: Detalle técnico enviado por el cliente.
*   **estado_actual (Enum)**: `pendiente`, `en_proceso`, `resuelto`.
*   **nivel_prioridad (Enum)**: `baja`, `media`, `alta`, `urgente`.
*   **disponibilidad (Text)**: Franja horaria para la visita técnica.

---

## 6. Tabla: `asignaciones_tecnico`
Vincula un técnico con un incidente específico.
*   **id_asignacion (BigInt)**: Clave primaria.
*   **id_incidente (FK)**: Incidente vinculado.
*   **id_tecnico (FK)**: Técnico responsable.
*   **estado_asignacion (Enum)**: `pendiente`, `aceptada`, `rechazada`, `en_curso`, `completada`.
*   **fecha_asignacion, fecha_aceptacion (Timestamp)**: Tiempos de seguimiento.

---

## 7. Tabla: `presupuestos`
Costos estimados por el técnico para la reparación.
*   **id_presupuesto (BigInt)**: Clave primaria.
*   **id_incidente (FK)**: Incidente relacionado.
*   **id_tecnico_crea (FK)**: Técnico que cotiza.
*   **monto_materiales (Numeric)**: Costo de insumos.
*   **monto_mano_obra (Numeric)**: Costo del profesional.
*   **estado (Enum)**: `borrador`, `enviado`, `aprobado_admin`, `aprobado`, `rechazado`.

---

## 8. Tabla: `pagos`
Registro de las transacciones financieras confirmadas.
*   **id_pago (BigInt)**: Clave primaria.
*   **id_incidente (FK)**: Referencia al caso.
*   **monto (Numeric)**: Suma abonada.
*   **metodo_pago (Text)**: Efectivo, Transferencia, etc.
*   **fecha_pago (Timestamp)**: Cuándo se registró el cobro.

---

## 9. Tablas Complementarias
*   **conformidades**: Firmas digitales de satisfacción del cliente.
*   **avances_reparacion**: Fotos y registros intermedios del trabajo.
*   **tipos_inmuebles**: Maestro de categorías de propiedades.
*   **solicitudes_registro**: Buffer para técnicos que esperan aprobación.

---

*Última actualización: Marzo 2026.*
