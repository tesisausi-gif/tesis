# Auditoría de Consistencia: Documento de Tesis (v18) vs Sistema Implementado

> **Autora:** Paige (Technical Writer — BMAD)
> **Fecha:** 2026-07-03
> **Documento auditado:** `PracticaProfesional-v18.docx (1).pdf` (247 páginas)
> **Código auditado:** `frontend/features/*` (services + types), `frontend/shared/utils/colors.ts`, rutas en `frontend/app/`
> **Regla de prioridad ante conflictos:** código > PDF > presentación

---

## 1. Alcance y método

Se leyeron en profundidad las secciones del PDF: índice (pp. 4-9), Etapa 2 completa incl. mandatos 4.6/4.7 (pp. 47-54), actividades y flujos 5.5 incl. sub-estados 5.5.8 (pp. 68-71), requerimientos 6.2 (pp. 73-74), épica e historias de usuario 6.3 (pp. 75-79), casos de uso 6.6 (pp. 84-91), documentación BPMN 6.7 (pp. 91-96), diagramas mermaid y máquina de estados 6.8.1.10-6.8.1.13 (pp. 119-122), matriz de trazabilidad 6.12 (pp. 140-141) e indicadores PPIs 6.13 (pp. 142-154). Se hicieron búsquedas dirigidas sobre las 247 páginas ("firma digital", "gestor", "mandato", tablas del DER pp. 123-139).

**No se leyeron en detalle:** renders de diagramas BPMN (pp. 97-118), arquitectura 6.11 (pp. 136-139), calendario de sprints (pp. 155-165) y los manuales de usuario (pp. 184-247); se hicieron solo verificaciones puntuales sobre esas zonas.

Cada afirmación verificable del PDF se contrastó contra el código fuente real (archivo:línea citados abajo).

---

## 2. Resumen ejecutivo

El documento v18 está **notablemente sincronizado** con el sistema: los 15 sub-estados, los 12 PPIs, el DER, el flujo de conformidad por foto, Walter y los actores principales coinciden con el código. Los problemas se concentran en **cuatro puntos de riesgo ALTO**: (1) el mandato declara fuera de alcance la cobranza mientras el sistema —y el propio PDF más adelante— incluye un módulo financiero; (2) dos pasajes dicen que asignar técnico deja el incidente `en_proceso` cuando el código usa `asignacion_solicitada`; (3) el rechazo del primer presupuesto está descripto como "el técnico rehace" cuando el código desvincula al técnico y devuelve el incidente a `pendiente`; (4) la matriz de trazabilidad usa una numeración RF incompatible con la tabla de requerimientos, y las HU citan RFs inexistentes.

---

## 3. Hallazgos de riesgo ALTO

### A1. "Fuera de alcance: cobranza/pagos" vs módulo financiero implementado
- **PDF:** §4.7.4 (p. 54): *"El proyecto no incluirá: Módulos de gestión financiera o contable (por ejemplo, emisión o cobranza de facturas o pagos)"*; §4.7.5 (p. 54): *"Excluye cualquier proceso de cobranza o sanción"*.
- **Código:** el sistema implementa registro de cobros y pagos: `frontend/features/pagos/cobros-clientes.service.ts` (registrarCobroCliente, línea ~181-184 incluso dispara el estado `finalizado`) y `frontend/features/pagos/pagos-tecnicos.service.ts`. Además el técnico recibe **penalización automática de 1★** al cancelar (sanción; `asignaciones.service.ts`, flujo `cancelarAsignacionAceptada`).
- **Agravante:** el propio PDF se contradice: §6.6.3 "Casos de Uso Financieros" (p. 90), §6.8.1.12 "Cierre Financiero: Registro de Cobros y Pagos" (p. 120) e INDICADOR 6 "Deuda Financiera Pendiente" (p. 147).
- **Riesgo:** ALTO — contradicción interna del documento, visible con solo leer el índice.
- **Corrección más barata:** agregar 2-3 líneas en 4.7.4 aclarando la evolución: *"Se excluye la facturación/contabilidad formal e integración con sistemas contables; el registro interno de cobros y pagos como eventos del ciclo de vida del incidente se incorporó al alcance durante el desarrollo (ver §6.6.3)"*. Preparar la respuesta oral: "registrar un cobro no es un módulo contable; es trazabilidad del cierre".

### A2. Asignar técnico → el PDF dice `en_proceso`, el código usa `asignacion_solicitada`
- **PDF:** UC 6.6.2.3, paso 4 (p. 86): *"El sistema actualiza el incidente a estado `en_proceso`"*. Igual en BPMN doc #6 (p. 94): *"El sistema actualiza el incidente a `en_proceso`"*.
- **Código:** `frontend/features/asignaciones/asignaciones.service.ts:322-327` — `crearAsignacion` hace `.update({ estado_actual: 'asignacion_solicitada' })`. El incidente pasa a `en_proceso` recién cuando el técnico acepta (`aceptarAsignacion`, línea 198).
- **Agravante:** la propia máquina de estados del PDF (p. 120) lo tiene **bien** (`pendiente --> asignacion_solicitada : Admin asigna técnico`). El tribunal puede cruzar p. 86 contra p. 120 del mismo documento.
- **Riesgo:** ALTO — el estado `asignacion_solicitada` es visible en la UI de la demo.
- **Corrección más barata:** editar 2 líneas (p. 86 paso 4 y p. 94) → `asignacion_solicitada`.

### A3. Rechazo del primer presupuesto por el admin: el PDF dice "técnico rehace", el código desvincula al técnico
- **PDF:** UC 6.6.2.7, flujo alternativo (p. 88): *"el presupuesto pasa a `rechazado`. El técnico es notificado para enviar uno nuevo"*; BPMN 8.1 (p. 95): *"el técnico debe enviar uno nuevo"*; máquina de estados (p. 121): `presupuesto_enviado --> aceptada : Admin rechaza presupuesto — Técnico debe rehacer`.
- **Código:** `frontend/features/presupuestos/presupuestos.service.ts` — `rechazarPresupuesto`: si es el **primer** presupuesto, cancela la asignación activa y devuelve el incidente a `pendiente` (línea 487: `.update({ estado_actual: 'pendiente' })`); el técnico queda desvinculado. Solo si es un presupuesto **adicional** (ya hay uno aprobado) el técnico continúa (rama `esAdicional`, notificación `presupuesto_adicional_rechazado`).
- **Riesgo:** ALTO — la transición dibujada en la máquina de estados (sub-estado `aceptada` con el mismo técnico) no existe en el código para el caso principal.
- **Corrección más barata:** en p. 121 cambiar la transición a `presupuesto_enviado --> [fuera de en_proceso] pendiente : Admin rechaza 1er presupuesto (desvincula técnico)` y anotar la excepción del presupuesto adicional; ajustar el texto de p. 88 y p. 95.

### A4. Trazabilidad rota: matriz 6.12 vs tabla de RF 6.2 vs referencias en las HU
- **PDF:** la tabla 6.2 (pp. 73-74) define RF-01..RF-11 con una semántica (RF-01 registrar reclamos, RF-02 clasificar, RF-03 asignar técnico, RF-07A avances, RF-07B conformidad del cliente...). La matriz 6.12 (pp. 140-141) usa **otros** RF-01..RF-11 (RF-01 "Gestión ABM", RF-02 "Registro Inicial", RF-03 "Evaluación y Presupuesto", RF-11 "Inspección Pre-Finalización") — corresponden a las funcionalidades de §4.4, no a los RF de §6.2.
- Además, las HU y casos de uso citan RFs **que no existen** en 6.2: HU-08B → RF-07C (p. 78), HU-09 → RF-07D (p. 78), HU-13 → RF-12 (p. 79), UC 6.6.2.10 → RF-07D (p. 89), UC 6.6.3.1/6.6.3.2 → RF-07B/RF-07C (pp. 90-91). Y HU-08A (cobro al cliente) cita RF-07B, que en 6.2 es "conformidad del cliente".
- **Riesgo:** ALTO — la matriz de trazabilidad es exactamente lo que un tribunal de análisis de sistemas revisa; hoy no traza.
- **Corrección más barata:** ampliar la tabla 6.2 con RF-07C (registrar cobro/pago), RF-07D (subir conformidad) y RF-12 (reportes/indicadores), y re-etiquetar las filas/columnas de la matriz 6.12 con los mismos IDs y nombres de 6.2.

---

## 4. Hallazgos de riesgo MEDIO

### M1. Transición a `finalizado`: el PDF exige cobro **y** pago; el código solo el cobro
- **PDF:** máquina de estados (p. 121): *"en_proceso --> finalizado : Admin registra cobro al cliente **y** pago al técnico"*; diagrama 6.8.1.12 (p. 120) pone el pago al técnico **antes** de `finalizado`.
- **Código:** `cobros-clientes.service.ts:181-184` — el **cobro** dispara `estado_actual='finalizado'`. El pago al técnico es independiente y puede quedar pendiente después (`pagos-tecnicos.service.ts:70` admite incidentes en `finalizado`, `resuelto` y `en_proceso`). `aprobarConformidad` setea `fue_resuelto=1` + `fecha_cierre` sin cambiar el estado (`conformidades.service.ts:335`).
- **Corrección:** cambiar la etiqueta a *"Admin registra cobro al cliente"* y mover el pago al técnico como acción post-finalizado (como ya lo describe FLUJO_ESTADOS.md del repo).

### M2. Rechazo del presupuesto por el cliente: el PDF omite la bifurcación `nuevo_tecnico` / `otra_oportunidad`
- **PDF:** UC 6.6.2.8 (p. 88): *"el presupuesto pasa a `rechazado`. El admin es notificado"*; máquina (p. 121): `presupuesto_cliente --> aceptada : Cliente rechaza — técnico puede renegociar`.
- **Código:** `presupuestos.service.ts` — `rechazarPresupuestoConDecision`: con `'nuevo_tecnico'` el incidente vuelve a `pendiente` y se desvincula al técnico (línea 755); con `'otra_oportunidad'` el técnico decide vía `responderOportunidadTecnico` — si declina, también `pendiente` (línea 844).
- **Corrección:** agregar las dos ramas de decisión al UC y a la máquina de estados (una viñeta y dos transiciones).

### M3. Estados nombrados en los mandatos no son los del sistema
- **PDF:** §4.6.2 (p. 51): *"(En ejecución, para validar, finalizado)"*; §4.7.3 (p. 53): *"(en proceso, resuelto, pendiente)"*.
- **Código:** estados reales: `pendiente`, `asignacion_solicitada`, `en_proceso`, `finalizado`, `cancelado` (+`resuelto` legacy) — `frontend/shared/utils/colors.ts:15-62`.
- **Riesgo:** MEDIO — defendible ("el mandato es un documento de negociación previo al diseño"), pero conviene tener la respuesta lista y, si se puede, una nota al pie que remita a la máquina de estados definitiva (§6.8.1.13).

### M4. Rol `gestor` existe en el código y no está documentado
- **Código:** `frontend/features/auth/auth.service.ts:89-97` — `isAdmin()`/`requireAdmin()` aceptan `rol === 'admin' || rol === 'gestor'`; el middleware permite a ambos en `/dashboard/*`.
- **PDF:** declara **tres** roles (§4.7.6 p. 54; épica p. 75 *"tres roles: Administrador, Técnico y Cliente"*). "Gestor" solo aparece como alias PlantUML del actor Administrador (p. 81).
- **Riesgo:** MEDIO — si en la demo aparece un usuario `gestor` o el tribunal lee el seed/DB. Corrección barata: una línea en "Roles del sistema" ("gestor: variante operativa del administrador con los mismos permisos") o eliminar el rol si no se usa.

### M5. Riesgo de demo: el indicador SP8 (DPC) y la página de Pagos usan criterios distintos (inconsistencia interna del código que el PDF hereda)
- **PDF (p. 147):** *"DPC: presupuestos aprobado de incidentes en estado finalizado/resuelto que NO tienen registro en cobros_clientes"* — describe fielmente el código (`metricas-ppis.service.ts:1097`: `.in('incidentes.estado_actual', ['finalizado','resuelto'])`).
- **Problema:** como `finalizado` recién se alcanza **al registrar el cobro** (M1), un incidente esperando cobro está en `en_proceso` (sub-estado `pendiente_pago`) y **no entra** en la DPC del indicador. En cambio la página de Pagos sí lo lista (`cobros-clientes.service.ts:82-83` filtra por `fue_resuelto=1`). En una demo, Pagos puede mostrar cobros pendientes mientras SP8 marca DPC = $0.
- **Corrección:** en el código, cambiar el filtro DPC a `fue_resuelto=1` (o incluir `en_proceso`) y actualizar la fórmula en el PDF en el mismo sentido. Es la única corrección de esta lista que toca código.

---

## 5. Hallazgos de riesgo BAJO

| # | PDF | Realidad en código | Corrección |
|---|-----|--------------------|------------|
| B1 | UC 6.6.2.7 (p. 88): ruta `/dashboard/presupuestos/aprobar` | No existe; las rutas son `/dashboard/presupuestos` y `/dashboard/presupuestos/nuevo` (`frontend/app/(admin)/dashboard/`) | Corregir la ruta en el texto |
| B2 | UC 6.6.1.2 (p. 85): `must_change_password: true` | El campo real es `debe_cambiar_password` en `usuarios` | Renombrar en el texto |
| B3 | INDICADOR 12 DVI (p. 153): fuente `disponibilidad_inspeccion` | La tabla real es `franjas_disponibilidad` (`disponibilidad.service.ts:23`); la función `procesarDisponibilidadVencida()` sí existe (`disponibilidad.service.ts:272`) | Corregir nombre de tabla |
| B4 | Máquina (p. 120): cliente cancela solo desde `pendiente` ("antes de asignación"); `asignacion_solicitada --> cancelado` figura solo como "Admin cancela" | El cliente también puede cancelar en `asignacion_solicitada` (se cancela la asignación pendiente automáticamente) — `asignaciones.service.ts:508`; coincide con el flowchart 6.8.1.11 (p. 119-120) | Agregar la transición al diagrama |
| B5 | §4.6.2 (p. 51): *"Calificación: El área técnica podrá calificar…"* (actor ambiguo) | Califican el **admin** (al aprobar conformidad) y el **cliente** (`calificaciones.service.ts:140`, `existeCalificacionDelCliente`); RF-09 y UC 6.6.2.12 del propio PDF ya lo dicen bien | Nota al pie o respuesta oral |
| B6 | — (colateral, no es el PDF) | Los docs internos del repo están desactualizados: `CLAUDE.md` dice **8** sub-estados y `documentacion/ANALISIS_FLUJOS.md` §5.5 dice **7**, pero el código (`colors.ts:78-93`) y el PDF (pp. 70-71) tienen **15**. ANALISIS_FLUJOS también nombra la tabla `solicitudes_tecnico` (real: `solicitudes_registro`, `usuarios.service.ts:261`) y rutas viejas (`/dashboard/solicitudes`, `/dashboard/reportes`; reales: pestaña Solicitudes en `/dashboard/tecnicos`, `/dashboard/metricas`, `/dashboard/exportar`) | Si se anexa ANALISIS_FLUJOS a la tesis o se usa para preparar la defensa, actualizarlo primero |

---

## 6. Verificaciones positivas (escudo para la defensa)

Estas afirmaciones del PDF fueron verificadas contra el código y **coinciden** — se pueden defender con confianza:

1. **15 sub-estados de `en_proceso`** (PDF §5.5.8, pp. 70-71) = exactamente las 15 claves de `SubEstadoEnProceso` en `colors.ts:78-93`, incluyendo los de visitas (`visita_pendiente/propuesta/programada`, `necesita_visita_reparacion`, etc.) y `pendiente_pago`/`finalizado` con la semántica "finalizado = cobro registrado".
2. **12 indicadores PPIs** (§6.13, pp. 142-154) = 12 funciones en `metricas-ppis.service.ts` (TCI, FPY, WIP, SP2-B, TCR, SP8, ISC, CB-2, IRT/OEE, SP9, Cancelación por cliente, DVI), con fórmulas, semáforos y fuentes fieles al código. La "nota de arquitectura" (sin filtros manuales) es correcta.
3. **"12 reportes"** (HU-13, p. 79) = los 12 reportes exportables R1–R13 sin R9 en `exportar.service.ts`.
4. **Máquina de estados principal** (p. 120): `pendiente → asignacion_solicitada → en_proceso → finalizado` + `cancelado` ✓; técnico rechaza → sigue `asignacion_solicitada` ✓; técnico acepta → `en_proceso` ✓ (`asignaciones.service.ts:198, 263, 325`).
5. **Flujo de conformidad por foto física** (UC 6.6.2.10/11): el PDF nunca afirma "firma digital" (0 ocurrencias en 247 páginas) — describe correctamente foto + comprobante + aprobación/rechazo del admin con calificación 1-5.
6. **Cliente califica al técnico** (UC 6.6.2.12) ✓ `calificaciones.service.ts:140` con bloqueo de duplicados.
7. **Realtime**: badges y paneles con suscripciones Supabase Realtime, tal como afirman la épica y los UC (`admin-sidebar.tsx`, `tecnico-nav.tsx`, `realtime-notificaciones.client.tsx` usan `channel(...)`).
8. **Tablas citadas correctas**: `solicitudes_registro` (p. 84) ✓, `avances_reparacion` (p. 89) ✓, `cobros_clientes` / `pagos_tecnicos` (pp. 90-91) ✓, `visitas` y `franjas_disponibilidad` en el DER (pp. 132, 135) ✓, campo `cancelado_por_cliente` (p. 120) ✓, `sin_visita_por_disponibilidad` (p. 153) ✓.
9. **Solicitudes de técnico en `/dashboard/tecnicos` → pestaña "Solicitudes"** (p. 85) ✓ (`components/admin/tecnicos/SolicitudesTab.tsx`).
10. **Penalización 1★ por cancelación** (p. 119) ✓ y **cierre financiero** con montos correctos (cobro = total con comisión; pago = materiales + mano de obra) ✓.
11. **Walter (asistente IA)** documentado en el PDF (sección propia al final) y existente (`features/walter/walter.service.ts`).

---

## 7. Plan de corrección sugerido (ordenado por costo/beneficio)

1. **Solo texto, 30 min:** A2 (2 líneas), B1, B2, B3 (nombres), M3 (nota al pie).
2. **Texto + diagrama, 1-2 h:** A3 y M2 (transiciones de la máquina de estados p. 121 + párrafos de UC), M1 (etiqueta de transición a finalizado), B4.
3. **Texto estructural, 2-3 h:** A4 (renumerar RF en 6.2 y realinear la matriz 6.12 — es la corrección de mayor retorno para la defensa), A1 (párrafo de evolución de alcance en 4.7.4).
4. **Código (opcional pero recomendado antes de la demo):** M5 — alinear el filtro DPC de `getSp8Data` con `fue_resuelto=1`.
5. **Higiene interna:** B6 — actualizar `ANALISIS_FLUJOS.md` y `CLAUDE.md` (7/8 → 15 sub-estados) si se van a usar como material de preparación.
