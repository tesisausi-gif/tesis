# Documentación Integral del Sistema ISBA

Este documento centraliza toda la información necesaria para el **uso**, **gestión** y **mantenimiento** del Sistema de Gestión de Incidentes ISBA.

---

## 🧭 Tabla de Contenidos
1. [Introducción](#1-introducción)
2. [Manual del Usuario (Funcional)](#2-manual-del-usuario-funcional)
   - [Perfil Cliente](#21-perfil-cliente)
   - [Perfil Técnico](#22-perfil-técnico)
   - [Perfil Administrador](#23-perfil-administrador)
3. [Ciclo de Vida de los Incidentes](#3-ciclo-de-vida-de-los-incidentes)
4. [Especificaciones Técnicas](#4-especificaciones-técnicas)
   - [Arquitectura](#41-arquitectura)
   - [Modelo de Datos](#42-modelo-de-datos)
   - [Seguridad](#43-seguridad)
5. [Instalación y Mantenimiento](#5-instalación-y-mantenimiento)

---

## 1. Introducción
**ISBA** es una plataforma web diseñada para la administración eficiente de reparaciones y mantenimiento en propiedades inmobiliarias. Facilita la comunicación entre inquilinos/propietarios, técnicos especializados y administradores, permitiendo un seguimiento transparente de cada caso.

---

## 2. Manual del Usuario (Funcional)

### 2.1 Perfil Cliente
El cliente es el usuario que reporta los problemas en sus propiedades.
*   **Gestión de Inmuebles**: Antes de reportar un problema, debe registrar la dirección y detalles de su propiedad en el módulo "Propiedades".
*   **Reporte de Incidentes**: En "Nuevo Incidente", selecciona el inmueble, describe el problema y define su disponibilidad horaria.
*   **Seguimiento**: Puede ver en tiempo real si un técnico fue asignado y el avance de la reparación.
*   **Presupuestos**: Recibe presupuestos que puede aprobar o rechazar desde su panel.

### 2.2 Perfil Técnico
El técnico es el profesional que ejecuta las tareas de reparación.
*   **Trabajos Disponibles**: Panel donde recibe solicitudes de asignación. Debe "Aceptar" el trabajo para ver los datos de contacto del cliente.
*   **Presupuestos**: Una vez inspeccionada la falla, carga los costos de materiales y mano de obra.
*   **Informes de Avance**: Registra el progreso de la obra hasta su finalización.

### 2.3 Perfil Administrador
El administrador coordina toda la operación.
*   **Dashboard**: Vista global de incidentes activos, métricas de rendimiento y estados de cuenta.
*   **Asignación Inteligente**: Vincula incidentes con técnicos basándose en la especialidad requerida.
*   **Auditoría de Presupuestos**: Revisa y aprueba las cotizaciones de los técnicos antes de que lleguen al cliente.
*   **Aprobación de Usuarios**: Valida y da de alta a nuevos técnicos que se registran en la plataforma.

---

## 3. Ciclo de Vida de los Incidentes

El sistema se rige por una máquina de estados estricta para garantizar que ningún proceso quede inconcluso:

| Estado | Descripción | Actor Responsable |
| :--- | :--- | :--- |
| **Pendiente** | Incidente recién creado por el cliente. | Administrador (para asignar) |
| **En Proceso** | Un técnico ha sido asignado y está evaluando. | Técnico (para presupuestar) |
| **Enviado** | El presupuesto ha sido cargado por el técnico. | Administrador (para validar) |
| **Aprobado Admin**| El presupuesto fue validado por la administración. | Cliente (para aprobar) |
| **Aprobado** | El cliente aceptó el costo. Comienza el trabajo. | Técnico (para ejecutar) |
| **Completada** | El trabajo físico ha terminado. | Administrador (para cerrar) |
| **Resuelto** | Pago registrado y conformidad firmada. | Sistema (Cierre) |

---

## 4. Especificaciones Técnicas

### 4.1 Arquitectura
El sistema utiliza una arquitectura de **Server Components** y **Server Actions** de Next.js 15.
*   **Frontend**: React con Tailwind CSS para una interfaz responsive.
*   **Backend**: Supabase como plataforma de Backend-as-a-Service (BaaS).

### 4.2 Modelo de Datos
La base de datos PostgreSQL en Supabase se organiza en las siguientes entidades clave:
*   `usuarios` (Linkeado a Auth UUID)
*   `incidentes` (FK a inmuebles y técnicos)
*   `presupuestos` (Relacionado con incidentes)
*   `pagos` (Relacionado con presupuestos e incidentes)

### 4.3 Seguridad
La protección de datos se basa en políticas **RLS (Row Level Security)**:
*   `Policy: Clientes pueden ver solo sus datos`: `auth.uid() = id_usuario`.
*   `Policy: Técnicos ven solo asignaciones activas`: `auth.uid() = tecnico.id_usuario`.

---

## 5. Instalación y Mantenimiento

### Requisitos del Sistema
*   Node.js v18.17+
*   NPM v9+
*   Cuenta de Supabase configurada.

### Pasos de Instalación
1.  Clonar el repositorio.
2.  Instalar dependencias: `cd frontend && npm install`.
3.  Configurar archivo `.env.local` con las claves de Supabase.
4.  Iniciar desarrollo: `npm run dev`.

### Variables de Entorno Requeridas
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_publica
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role (solo para el servidor)
```

---

*Documentación generada para el proyecto ISBA - 2026.*
