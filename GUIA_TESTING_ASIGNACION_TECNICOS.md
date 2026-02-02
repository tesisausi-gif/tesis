# 🧪 INSTRUCCIONES PARA PROBAR: Asignación de Técnicos

## Requisitos Previos
- Sistema frontend compilado ✅
- Base de datos con datos de prueba
- Usuario admin autenticado
- Al menos 1 incidente pendiente
- Al menos 1 técnico activo

## Pasos para Probar

### 1. Acceder a Dashboard Admin
```
1. Login como usuario admin
2. Ir a: http://localhost:3000/dashboard/incidentes
3. Deberías ver la página refactored con 3 pestañas
```

### 2. Verificar Pestañas
```
- Pendientes: Mostrará contador (ej: 5)
- En Proceso: Mostrará contador (ej: 2)
- Resueltos: Mostrará contador (ej: 1)
```

### 3. Navegación entre Pestañas
```
1. Hacer clic en pestaña "Pendientes"
   - Deberías ver incidentes sin técnico asignado
   - Ordenados del más viejo al más nuevo (arriba el más viejo)
   - Botón azul "Asignar" en cada fila

2. Hacer clic en pestaña "En Proceso"
   - Deberías ver incidentes con técnico asignado
   - Solo botón "Ver" (ojo) para detalles

3. Hacer clic en pestaña "Resueltos"
   - Incidentes completados
   - Solo botón "Ver"
```

### 4. Probar Modal de Asignación

#### 4.1 Abrir Modal
```
1. Ir a pestaña "Pendientes"
2. Buscar un incidente
3. Hacer clic en botón azul "Asignar"
4. Deberías ver modal con:
   - Título: "Asignar Técnico"
   - Descripción con ID del incidente
   - Campo de búsqueda
   - Tabla con lista de técnicos
```

#### 4.2 Verificar Técnicos
```
Tabla de técnicos debe mostrar:
- Nombre y Apellido
- Especialidad
- Calificación en estrellas (5 máximo)
- Cantidad de trabajos realizados
- Ordenados por mejor calificación primero

Ejemplo de fila:
| ○ | Juan Pérez | Plomería | ⭐⭐⭐⭐⭐ 4.8 | 12 trabajos |
```

#### 4.3 Probar Búsqueda
```
1. En campo "Buscar Técnico", escribir:
   - "Juan" → debe filtrar técnicos con nombre Juan
   - "Plomería" → debe filtrar por especialidad
   - "Electricidad" → debe filtrar por especialidad
2. La búsqueda debe ser en tiempo real (mientras escribes)
3. Si no hay resultados, mostrar: "No se encontraron técnicos"
```

#### 4.4 Filtrado por Especialidad
```
Si incidente es de "Plomería":
- Modal debe mostrar solo técnicos de Plomería
- Si hay incidente de "Electricidad", solo técnicos de Electricidad

Nota: Esto se calcula automáticamente, no hay selector
```

#### 4.5 Seleccionar Técnico
```
1. En la tabla, hacer clic en una fila de técnico
2. Fila debe cambiar de color (fondo azul)
3. Radio button debe estar marcado
4. Debajo de la tabla debe aparecer card con:
   "Seleccionado: Juan Pérez
    Especialidad: Plomería • Trabajos: 12"
```

#### 4.6 Asignar
```
1. Con técnico seleccionado, clic en botón "Asignar Técnico"
2. Botón debe mostrar loader ("Asignando...")
3. Debe mostrar mensaje de éxito (toast verde)
4. Modal debe cerrarse
5. Página debe recargar lista de incidentes
6. Incidente debe desaparecer de "Pendientes"
7. Incidente debe aparecer en "En Proceso"
```

### 5. Verificar Cambios de Estado

#### Antes de asignar:
```
Pestaña "Pendientes": 5 incidentes
Pestaña "En Proceso": 2 incidentes
```

#### Después de asignar uno:
```
Pestaña "Pendientes": 4 incidentes
Pestaña "En Proceso": 3 incidentes
```

### 6. Probar Errores

#### Sin seleccionar técnico
```
1. Abrir modal de asignación
2. NO seleccionar técnico
3. Hacer clic en "Asignar Técnico"
4. Debe mostrar error: "Selecciona un técnico"
```

#### Cancelar
```
1. Abrir modal
2. Hacer clic en "Cancelar"
3. Modal debe cerrarse sin hacer cambios
4. Incidentes deben seguir igual
```

### 7. Probar Ordenamiento

```
1. Ver lista de incidentes pendientes
2. El primer incidente debe ser el más VIEJO
3. Cada incidente debe mostrar fecha
4. Verificar que fecha_registro del primero < fecha_registro del último
```

## Casos de Prueba Específicos

### Caso 1: Asignación Simple
- [ ] Abrir modal
- [ ] Seleccionar primer técnico
- [ ] Asignar
- [ ] Verificar desaparece de Pendientes
- [ ] Verificar aparece en En Proceso

### Caso 2: Búsqueda Filtrada
- [ ] Abrir modal de incidente de "Plomería"
- [ ] Escribir "Juan" en búsqueda
- [ ] Verificar que solo aparecen técnicos de Plomería con nombre Juan
- [ ] Escribir "Electricidad"
- [ ] Verificar que no aparece nada (no hay Electricistas con nombre contiene "Juan")

### Caso 3: Multiple Asignaciones
- [ ] Asignar primer incidente
- [ ] Asignar segundo incidente a diferente técnico
- [ ] Asignar tercero al mismo que el primero
- [ ] Verificar contadores se actualizan correctamente

### Caso 4: Reasignación
- [ ] Ir a "En Proceso"
- [ ] Hacer clic en "Ver" en un incidente
- [ ] En modal de detalles, debería haber opción de reasignar (cuando se implemente)
- [ ] Cambiar técnico
- [ ] Verificar cambios

## Verificación Final

- [ ] ✅ Compilación sin errores
- [ ] ✅ 3 pestañas visible
- [ ] ✅ Contadores actualizan
- [ ] ✅ Búsqueda funciona
- [ ] ✅ Filtrado por especialidad funciona
- [ ] ✅ Selección funciona
- [ ] ✅ Asignación funciona
- [ ] ✅ Estados se actualizan
- [ ] ✅ UI responsive en móvil
- [ ] ✅ Mensajes de error muestran

## Próximas Fases

### Fase 2: Notificación al Técnico
- Técnico recibe notificación cuando es asignado
- Puede aceptar/rechazar desde notificación
- Si rechaza, vuelve a "Pendientes"

### Fase 3: Historial
- Ver cambios de técnico
- Ver razón de rechazo
- Mostrar comentarios

## 🆘 Si Hay Errores

### Error: "No se encontraron técnicos"
- [ ] Verificar que hay técnicos activos en BD
- [ ] Verificar que esta_activo = true en tabla tecnicos
- [ ] Revisar query en servicios

### Error: "No se pueden seleccionar filas"
- [ ] Verificar que onClick está funcionando
- [ ] Revisar console del browser (F12)
- [ ] Verificar que React renderiza correctamente

### Error: Asignación no se guarda
- [ ] Verificar conexión a Supabase
- [ ] Revisar permisos RLS
- [ ] Ver console de browser para mensajes de error
- [ ] Verificar que tabla asignaciones_tecnico existe

### Error: Modal no abre
- [ ] Verificar que estado modalAsignarOpen está correcto
- [ ] Revisar que handleAsignar se ejecuta
- [ ] Verificar que componente ModalAsignarTecnico está importado

---

**Fecha:** 1 de Febrero 2026
**Versión:** 1.0
**Última Actualización:** 1/2/2026
