# Guía de Pruebas y Aseguramiento de Calidad - ISBA

Este documento explica cómo utilizar las herramientas de testing automatizado incluidas en el proyecto para verificar la integridad del sistema.

---

## 1. Tipos de Pruebas

El proyecto cuenta con dos suites de pruebas principales:
1.  **Pruebas de Funcionalidad (API)**: Verifican que la base de datos y los servicios respondan correctamente.
2.  **Pruebas de Ciclo de Vida (E2E)**: Simulan un flujo completo desde que se crea el incidente hasta que se resuelve.

---

## 2. Testing de Funcionalidades (Backend)

Archivo: `test_all_features.js`

Este script utiliza el SDK de Supabase para realizar peticiones directas y validar todas las tablas.
*   **Lo que prueba**: Creación de usuarios, inmuebles, incidentes, asignaciones, presupuestos, inspecciones, pagos y calificaciones.
*   **Limpieza automática**: El script está diseñado para borrar todos los datos generados durante la prueba al finalizar, manteniendo limpia la base de datos de producción.

### Cómo ejecutarlo:
```bash
node test_all_features.js
```
*Asegúrate de tener conexión a internet ya que se conecta directamente a la instancia de Supabase mediante las claves API configuradas en el script.*

---

## 3. Pruebas de Ciclo de Vida E2E

Archivo: `test_e2e_lifecycle.mjs`

Este es un test más avanzado que simula la lógica de negocio real. 
*   **Flujo verificado**:
    1. Registro de Cliente -> 2. Registro de Inmueble -> 3. Creación de Incidente -> 4. Asignación de Técnico -> 5. Aceptación de Tarea -> 6. Carga de Presupuesto -> 7. Aprobación.
*   **Uso**: Ideal para verificar que las reglas de negocio y los estados de las tablas cambien en el orden correcto.

---

## 4. Scripts de Utilidad (Azure DevOps)

Si el proyecto está vinculado a Azure DevOps para la gestión de tareas o fallos, existen scripts específicos:
*   `get_azure_workitems.py`: Descarga las tareas/bugs pendientes.
*   `update_azure_bugs.py`: Sincroniza el estado de los bugs resueltos en el código con el tablero de Azure.

---

## 5. Interpretación de Resultados

Al ejecutar los tests, verás una consola con iconos:
*   ✅ **Verde**: La funcionalidad opera como se espera.
*   ❌ **Rojo**: Error detectado. El log indicará el código de error (ej: 403 para permiso denegado, 404 para no encontrado).

### Tasa de Éxito
Al final de cada ejecución, se presenta un **Resumen de Tests** con la tasa de éxito (%). Para un despliegue seguro, esta tasa debe ser del **100%**.

---

*Nota: Los tests requieren que las variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` sean válidas. Si cambias de entorno (de producción a staging), recuerda actualizar estas claves en los archivos de test.*
