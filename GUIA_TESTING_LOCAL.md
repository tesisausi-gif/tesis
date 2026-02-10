# 🧪 Guía de Testing Local - Sesión 2

## 🚀 Estado Actual

✅ **Servidor**: Corriendo en http://localhost:3000  
✅ **Branch**: devGiuli  
✅ **Dependencias**: Instaladas  

---

## 📋 Pre-requisitos de Testing

Asegúrate de tener:
1. ✅ Servidor Next.js corriendo
2. ✅ Base de datos Supabase configurada
3. ✅ Usuarios de prueba creados (cliente, técnico, admin)

---

## 🧪 Test 1: Presupuestos (#112) - Cliente Aprueba/Rechaza

### Objetivo
Verificar que un cliente pueda aprobar o rechazar presupuestos en estado "Aprobado Admin".

### Pasos de Testing

```
1. ACCEDER COMO CLIENTE
   → Ir a http://localhost:3000/login
   → Usar credenciales de cliente
   → Hacer clic en "Ingresar"
   → Verificar que redirige a /cliente

2. NAVEGAR A PRESUPUESTOS
   → Desde menu lateral: Cliente → Mis Presupuestos
   → O ir directamente: http://localhost:3000/cliente/presupuestos

3. VER PRESUPUESTOS
   → Debe mostrar lista de presupuestos
   → Buscar uno con estado "Aprobado Admin" (badge cyan)
   → Si no hay, contactar admin para crear uno

4. PROBAR APROBACIÓN
   → Hacer clic botón "Aprobar" (verde)
   → Leer diálogo de confirmación
   → Hacer clic "Aprobar" en el diálogo
   → VERIFICAR:
     ✓ Toast verde: "Presupuesto aprobado exitosamente"
     ✓ Estado cambia a "Aprobado" (badge verde)
     ✓ Fecha de aprobación aparece
     ✓ Mensaje: "El trabajo puede comenzar"

5. PROBAR RECHAZO (con otro presupuesto)
   → Hacer clic botón "Rechazar" (rojo)
   → Leer diálogo de confirmación
   → Hacer clic "Rechazar" en el diálogo
   → VERIFICAR:
     ✓ Toast rojo: "Presupuesto rechazado"
     ✓ Estado cambia a "Rechazado" (badge rojo)
     ✓ Mensaje: "Se notificará al técnico"

6. RECARGAR PÁGINA
   → F5 o Ctrl+R
   → Verificar que los cambios persisten
```

### Puntos Críticos a Verificar
- ✓ Solo botones aparecen si estado es "Aprobado Admin"
- ✓ Estado NO puede cambiar si no está en "Aprobado Admin"
- ✓ Cambios persisten después de recargar
- ✓ Timestamps se actualizan

---

## 🧪 Test 2: Inspecciones (#113) - Técnico Registra Inspecciones

### Objetivo
Verificar que un técnico pueda registrar inspecciones en sus trabajos asignados.

### Pasos de Testing

```
1. ACCEDER COMO TÉCNICO
   → Ir a http://localhost:3000/login
   → Usar credenciales de técnico
   → Hacer clic en "Ingresar"
   → Verificar que redirige a /tecnico

2. NAVEGAR A TRABAJOS
   → Desde menu lateral: Técnico → Mis Trabajos
   → O ir directamente: http://localhost:3000/tecnico/trabajos

3. ABRIR INCIDENTE
   → Ver lista de trabajos asignados
   → Hacer clic en uno para abrir modal
   → Debe abrir diálogo con tabs

4. VERIFICAR TAB INSPECCIONES
   → Dentro del modal, buscar pestaña "Inspecciones"
   → Hacer clic en ella
   → Debe mostrar:
     ✓ Icono de llave inglesa (Wrench)
     ✓ Contador de reportes "X reportes"
     ✓ Botón "Nueva Inspección"
     ✓ Listado vacío o con inspecciones previas

5. CREAR NUEVA INSPECCIÓN
   → Hacer clic "Nueva Inspección"
   → Se abre modal con formulario
   → Completar:
     • Descripción: "Inspeccioné la estructura del techo y encontré grietas de 2-3mm en la zona norte. El yeso está desprendido en algunos puntos."
     • Hallazgos: "Se recomienda reparación urgente. Posible infiltración de agua."
   → Hacer clic "Registrar Inspección"
   → VERIFICAR:
     ✓ Toast verde: "Inspección registrada"
     ✓ Modal de formulario se cierra
     ✓ Inspección aparece en lista

6. VER DETALLES DE INSPECCIÓN
   → En lista de inspecciones, ver nueva entrada
   → Debe mostrar:
     ✓ Fecha de inspección (formato: "10 Feb 2026")
     ✓ Descripción completa
     ✓ Sección "Hallazgos:" en box ámbar
     ✓ Nombre del técnico y hora
     ✓ Botón eliminar (Trash2)

7. CREAR OTRA INSPECCIÓN SIN HALLAZGOS
   → Hacer clic "Nueva Inspección"
   → Solo completar Descripción
   → Dejar Hallazgos vacío
   → Hacer clic "Registrar"
   → VERIFICAR:
     ✓ Se guarda correctamente
     ✓ No muestra sección "Hallazgos:" si está vacío

8. VALIDACIONES
   → Intentar enviar descripción vacía
     ✗ Toast error: "Describe la inspección realizada"
   → Intentar con menos de 10 caracteres
     ✗ Toast error: "La descripción debe tener al menos 10 caracteres"

9. ELIMINAR INSPECCIÓN
   → Hacer clic botón Trash2 en una inspección
   → Confirmar en diálogo: "¿Eliminar esta inspección?"
   → Hacer clic "Aceptar"
   → VERIFICAR:
     ✓ Toast verde: "Inspección eliminada"
     ✓ Inspección desaparece de lista
```

### Puntos Críticos a Verificar
- ✓ Tab solo visible para rol "tecnico"
- ✓ Validaciones funcionan (mín 10 caracteres)
- ✓ Animaciones de entrada funcionan (Framer Motion)
- ✓ Contador de reportes se actualiza
- ✓ Eliminación funciona y pide confirmación
- ✓ Cambios persisten en BD

---

## 🧪 Test 3: Calificaciones (#116) - Cliente Califica Técnico

### Objetivo
Verificar que un cliente pueda calificar a un técnico después de que un incidente esté resuelto.

### Pasos de Testing

```
1. ACCEDER COMO CLIENTE
   → Ir a http://localhost:3000/login
   → Usar credenciales de cliente
   → Hacer clic en "Ingresar"

2. NAVEGAR A INCIDENTES
   → Desde menu lateral: Cliente → Mis Incidentes
   → O ir directamente: http://localhost:3000/cliente/incidentes

3. BUSCAR INCIDENTE RESUELTO
   → Ver lista de incidentes
   → Buscar uno con estado "Resuelto" (badge verde)
   → Si no hay, contactar admin para cambiar estado a Resuelto

4. ABRIR MODAL DEL INCIDENTE
   → Hacer clic en incidente resuelto
   → Se abre modal con tabs

5. VERIFICAR TAB CALIFICAR
   → Debe haber pestaña "Calificar" (solo si está resuelto)
   → Hacer clic en ella
   → Debe mostrar:
     ✓ Texto: "Califica al técnico que resolvió tu incidente"
     ✓ Componente de 5 estrellas
     ✓ 3 sliders (Aspecto Técnico, Puntualidad, Actitud)
     ✓ Textarea para comentario
     ✓ Botones "Cancelar" y "Enviar Calificación"

6. PROBAR RATING DE ESTRELLAS
   → Hacer clic en diferentes estrellas
   → VERIFICAR:
     ✓ Se colorean las estrellas hasta donde haces clic
     ✓ Al pasar mouse, preview de estrellas
     ✓ Muestra "X de 5 estrellas" debajo
   → Seleccionar 4 estrellas

7. AJUSTAR SLIDERS DE ASPECTOS
   → Mover slider "Aspecto Técnico" a 4
   → Mover slider "Puntualidad" a 5
   → Mover slider "Actitud/Trato" a 3
   → VERIFICAR:
     ✓ Número actualiza en tiempo real
     ✓ Sliders funcionan suavemente

8. ESCRIBIR COMENTARIO
   → En textarea escribir:
     "El técnico fue muy profesional, solucionó el problema rápidamente. La única mejora sería más comunicación durante el proceso."
   → VERIFICAR:
     ✓ Se actualiza contador de caracteres
     ✓ Máximo 500 caracteres (si escribes más, se detiene)

9. ENVIAR CALIFICACIÓN
   → Hacer clic "Enviar Calificación"
   → VERIFICAR:
     ✓ Toast verde: "Calificación enviada"
     ✓ Modal se cierra
     ✓ Botón cambia a "Enviando..." durante proceso

10. INTENTAR CALIFICAR DE NUEVO
    → Abrir mismo incidente
    → Ir a tab "Calificar"
    → VERIFICAR:
      ✓ Toast error: "Ya existe una calificación"
      ✗ No permite crear otra calificación del mismo cliente

11. VALIDACIONES
    → Abrir otro incidente resuelto sin calificación
    → Sin hacer clic en estrellas, hacer clic "Enviar"
    → VERIFICAR:
      ✗ Toast error: "Califica al técnico con al menos una estrella"
    → Hacer clic 1 estrella
    → Hacer clic "Enviar"
    → VERIFICAR:
      ✓ Se acepta (mínimo 1 estrella)

12. VERIFICAR EN TAB DETALLES
    → Volver a tab "Detalles"
    → Volver a tab "Calificar"
    → VERIFICAR:
      ✓ Formulario sigue disponible pero con validación
```

### Puntos Críticos a Verificar
- ✓ Tab solo visible si estado es "Resuelto" y hay técnicos asignados
- ✓ Estrellas interactivas (hover y click)
- ✓ Sliders funcionan (1-5)
- ✓ Contador de caracteres funciona
- ✓ Validación de mínimo 1 estrella
- ✓ Prevención de duplicados
- ✓ Toast messages apropiados
- ✓ Cambios persisten en BD

---

## 🐛 Checklist de Problemas Comunes

Si encuentras problemas, verifica:

### Presupuestos
- [ ] ¿El usuario es cliente?
- [ ] ¿El presupuesto está en estado "Aprobado Admin"?
- [ ] ¿Los botones aparecen solo para ese estado?
- [ ] ¿Hay errores en console? (F12)

### Inspecciones
- [ ] ¿El usuario es técnico?
- [ ] ¿Hay un incidente abierto?
- [ ] ¿Aparece la pestaña "Inspecciones"?
- [ ] ¿La descripción tiene mínimo 10 caracteres?
- [ ] ¿Hay errores en console?

### Calificaciones
- [ ] ¿El usuario es cliente?
- [ ] ¿El incidente está en estado "Resuelto"?
- [ ] ¿Aparece la pestaña "Calificar"?
- [ ] ¿Hay técnico asignado al incidente?
- [ ] ¿Ya existe una calificación previa?
- [ ] ¿Las estrellas están clickeables?

---

## 📊 Reportar Errores

Si encuentras un error, anota:

```
REPORTE DE ERROR:
- Tarea: #112 / #113 / #116
- Usuario: [rol - ej: cliente]
- Acción: [qué intentabas hacer]
- Error esperado: [qué debería pasar]
- Error real: [qué pasó]
- Console error: [si hay]
- Pasos para reproducir:
  1. 
  2.
  3.
```

---

## ✅ Criterios de Aceptación

### #112 Presupuesto
- ✅ Cliente puede ver presupuestos en estado "Aprobado Admin"
- ✅ Cliente puede aprobar presupuesto
- ✅ Cliente puede rechazar presupuesto
- ✅ Estado cambia inmediatamente
- ✅ Cambios persisten

### #113 Inspecciones
- ✅ Técnico ve tab "Inspecciones" en modal
- ✅ Puede crear nueva inspección con descripción y hallazgos
- ✅ Ve listado con detalles (fecha, técnico, hora)
- ✅ Puede eliminar inspecciones
- ✅ Validaciones funcionan (mín 10 caracteres)

### #116 Calificaciones
- ✅ Cliente ve tab "Calificar" cuando incidente está resuelto
- ✅ Puede seleccionar estrellas (1-5)
- ✅ Puede ajustar sliders de aspectos
- ✅ Puede escribir comentario
- ✅ Previene calificaciones duplicadas
- ✅ Validación de mínimo 1 estrella

---

**Última actualización**: 10 de Febrero de 2026  
**Servidor**: http://localhost:3000  
¡Listo para probar! 🚀
