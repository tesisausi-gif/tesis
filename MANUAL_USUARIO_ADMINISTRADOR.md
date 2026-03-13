# Manual de Usuario: Perfil Administrador - Sistema ISBA

Este manual define los procedimientos de gestión y supervisión para los **Administradores** y **Gestores** del sistema ISBA.

---

## 1. Dashboard y Control Global
El Dashboard (`/dashboard`) es el centro de monitoreo. Verás de forma gráfica:
*   Métricas de **Incidentes Activos** vs. **Cerrados**.
*   Volumen de **Pagos Mensuales**.
*   **Actividad Reciente**: Los últimos reportes creados por clientes y las últimas tareas aceptadas por técnicos.

---

## 2. Gestión del Ciclo de Incidentes

Como Administrador, tu rol es actuar como nexo logístico entre las partes.

### 2.1 Asignación de Técnicos
Cuando un cliente reporta un incidente (Estado `Pendiente`):
1. Entra al detalle del incidente o ve a la sección **"Asignaciones"**.
2. Evalúa la especialidad necesaria según la descripción.
3. Elige un técnico disponible que coincida con la categoría (ej: Plomero para una pérdida).
4. El sistema notificará inmediatamente al técnico.

### 2.2 Auditoría de Presupuestos
Es una tarea CRÍTICA. Los técnicos no pueden enviar precios directamente al cliente sin pasar por ti.
1. Recibirás una alerta cuando un técnico envíe un presupuesto (Estado `Enviado`).
2. Revisa que los montos sean razonables.
3. Puedes **Aprobar** tal cual está, o **Ajustar** sumando comisiones administrativas o de materiales si fuera necesario.
4. Al hacer click en `Aprobar para Cliente`, el presupuesto se vuelve visible para el usuario.

---

## 3. Administración de Personas y Actores

### 3.1 Técnicos (Aprobación de Solicitudes)
En la sección **"Técnicos"**, verás una pestaña de **"Solicitudes Pendientes"**.
*   Aquí llegan los profesionales que se registraron por la web.
*   Debes contactarlos, validar su experiencia y hacer clic en **"Aprobar"** para que puedan empezar a recibir trabajos.

### 3.2 Clientes y Usuarios
*   Tienes acceso al listado completo de clientes para brindar soporte.
*   Puedes restablecer contraseñas o modificar datos en caso de errores de registro.

---

## 4. Gestión Financiera (Pagos)
El módulo de **"Pagos"** registra el flujo de dinero del sistema.
*   **Registrar Pago**: Cuando un cliente abona, debes ingresar el monto y la fecha para que el incidente pueda avanzar hacia el cierre definitivo.
*   **Seguimiento**: Puedes filtrar pagos por fecha, cliente o técnico para exportar informes de caja.

---

## 5. Cierre y Conformidad
Para que un incidente se archive como `Resuelto`:
1. El trabajo debe estar `Completado` por el técnico.
2. El pago debe estar registrado.
3. Se debe verificar la **Firma de Conformidad** del cliente (puedes ver estos documentos en la sección "Conformidades").

---

## 6. Exportación y Reportes
En la sección **"Exportar"**, el sistema permite generar archivos (PDF/Excel) con:
*   Listado de incidentes por período.
*   Rendimiento por técnico (basado en sus calificaciones y tiempos de respuesta).

---

*Manual de Administración - Sistema ISBA 2026.*
