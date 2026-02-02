# 🔧 FUNCIONALIDAD: Asignación de Técnicos en Admin

## ¿Qué cambió?

La gestión de incidentes en admin ahora tiene:

### 1. **Separación por Estado**
Los incidentes están organizados en 3 pestañas:
- **Pendientes**: Incidentes sin técnico asignado
- **En Proceso**: Incidentes con técnico asignado
- **Resueltos**: Incidentes completados

### 2. **Botón "Asignar Técnico"**
En los incidentes pendientes, aparece un botón azul "Asignar" que abre un modal.

### 3. **Modal de Selección de Técnico**
El modal muestra:
- Lista de todos los técnicos activos
- Ordenados por mejor calificación primero
- Filtración automática por especialidad compatible
- Búsqueda por nombre o especialidad
- Rating de cada técnico (estrellas)
- Cantidad de trabajos realizados

### 4. **Flujo de Asignación**
1. Admin abre la gestión de incidentes
2. Ve los incidentes pendientes en la pestaña "Pendientes"
3. Hace clic en "Asignar" para un incidente
4. Se abre modal con lista de técnicos
5. Admin selecciona un técnico (radio button)
6. Hace clic en "Asignar Técnico"
7. El incidente se mueve a "En Proceso"
8. El técnico recibe una notificación (cuando se implemente)

## 📁 Archivos Creados/Modificados

### Nuevos:
- `components/admin/modal-asignar-tecnico.tsx` - Modal de selección

### Modificados:
- `app/(admin)/dashboard/incidentes/page.tsx` - Pantalla principal con pestañas

## 🔌 Cómo Usar

### Para Admin:
```
1. Ir a Dashboard → Gestión de Incidentes
2. Buscar la pestaña "Pendientes"
3. Seleccionar un incidente
4. Hacer clic en botón azul "Asignar"
5. Seleccionar técnico
6. Confirmar asignación
```

### Para Técnico (Próximamente):
- Recibirá notificación con incidente asignado
- Verá en pantalla `/tecnico/disponibles`
- Podrá aceptar o rechazar
- Si rechaza, vuelve a aparecer en pendientes para reasignar

## 🎯 Estados del Incidente

Los incidentes transicionan así:

```
PENDIENTE (sin técnico)
    ↓ (admin asigna técnico)
EN_PROCESO (técnico asignado, puede aceptar/rechazar)
    ↓ (técnico acepta)
EN_PROCESO (técnico trabaja)
    ↓ (cliente aprueba presupuesto)
EN_PROCESO (ejecución)
    ↓ (trabajo terminado)
RESUELTO
```

## 🔄 Integración con Notificaciones

Cuando se implemente notificaciones:
- El técnico asignado recibirá notificación inmediata
- Podrá aceptar/rechazar desde notificación o app
- Si rechaza, admin verá incidente de nuevo en "Pendientes"
- Podrá asignar a otro técnico

## 📊 Características del Modal

✅ Búsqueda en tiempo real
✅ Filtrado por especialidad automático
✅ Visualización de rating en estrellas
✅ Contador de trabajos realizados
✅ Indicador de técnico seleccionado
✅ Confirmación antes de asignar
✅ Mensajes de error/éxito

## 🚀 Próximos Pasos

1. **Notificaciones en Tiempo Real** - Avisar al técnico cuando es asignado
2. **Historial de Asignaciones** - Ver cambios de técnico
3. **Disponibilidad del Técnico** - Mostrar disponibilidad calendario
4. **Reasignación Automática** - Si técnico rechaza, asignar a siguiente
5. **Métricas** - Mostrar estadísticas de asignación por técnico

---

**Versión:** 1.0
**Fecha:** 1 de Febrero 2026
**Estado:** Listo para usar
