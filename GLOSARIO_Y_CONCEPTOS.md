# Glosario y Conceptos del Sistema - ISBA

Este glosario define los términos técnicos y de dominio utilizados en la plataforma ISBA para asegurar una comprensión uniforme entre desarrolladores, administradores y usuarios finales.

---

## 1. Conceptos de Dominio (Inmobiliario)

*   **Inmueble / Propiedad**: Unidad física (Departamento, Casa, Local) registrada en el sistema. Es el lugar donde se originan los incidentes.
*   **Incidente**: Reporte de una falla, rotura o necesidad de mantenimiento en un inmueble.
*   **Conformidad**: Documento digital donde el cliente manifiesta que el trabajo realizado por el técnico fue satisfactorio.
*   **Presupuesto**: Estimación de costos (materiales y mano de obra) que un técnico presenta para solucionar un incidente.
*   **Especialidad**: El área de conocimiento de un técnico (ej: Gasista, Electricista, Techista).

---

## 2. Definiciones de Proceso (Lógica de Negocio)

*   **Asignación**: Acción del administrador de vincular a un técnico específico con un incidente. 
*   **Aprobación Admin**: Proceso donde el administrador revisa el presupuesto del técnico antes de que el cliente pueda verlo.
*   **Validación de Pago**: Registro manual o automático del abono del cliente que permite cerrar administrativamente el incidente.
*   **Realtime**: Tecnología que permite que el sistema se actualice automáticamente cuando ocurre un cambio (ej: una nueva asignación) sin recargar la página.

---

## 3. Estados Técnicos (Máquina de Estados)

*   **Pendiente**: El incidente ha sido creado pero no tiene técnico asignado.
*   **En Proceso**: El incidente tiene un técnico asignado que está evaluando o presupuestando.
*   **Aprobado**: El presupuesto ha sido aceptado por el cliente y el técnico tiene vía libre para trabajar.
*   **Completado**: El técnico ha terminado físicamente el trabajo.
*   **Resuelto**: El incidente ha finalizado todo su ciclo (obra terminada, pago recibido y conformidad firmada).

---

## 4. Perfiles y Roles

*   **Admin**: Usuario con acceso total, responsable de la gestión de personas y dinero.
*   **Gestor**: Perfil administrativo con permisos de operación diaria pero limitaciones en configuraciones críticas.
*   **Cliente**: Usuario dueño o inquilino de propiedades.
*   **Técnico**: Proveedor de servicios que ejecuta las reparaciones.

---

## 5. Términos Tecnológicos

*   **Supabase**: Plataforma utilizada como backend (Base de datos y Autenticación).
*   **RLS (Row Level Security)**: Reglas de seguridad que impiden que un usuario vea datos de otro (ej: un cliente no puede ver los incidentes de otro cliente).
*   **Server Actions**: Funciones que se ejecutan directamente en el servidor para mayor seguridad al escribir datos.

---

*Manual de Conceptos ISBA - 2026.*
