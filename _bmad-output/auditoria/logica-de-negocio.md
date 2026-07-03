# Auditoría de Lógica de Negocio — Mantis (Sistema de Gestión de Incidentes ISBA)

> **Autora:** Mary — Business Analyst (BMAD)
> **Fecha:** 2026-07-03
> **Alcance:** `frontend/features/*/service.ts` (incidentes, asignaciones, presupuestos, inspecciones, conformidades, pagos/cobros, visitas, disponibilidad, calificaciones, avances, notificaciones)
> **Método:** trazado exhaustivo de cada flujo de punta a punta (edge-case hunting sobre transiciones de estado, caminos de rechazo/cancelación y fase financiera). Cada hallazgo cita archivo:línea verificado en el código. No se reportan especulaciones.

---

## Resumen Ejecutivo

El happy path del sistema está completo y bien orquestado (reporte → asignación → inspección → presupuesto con doble aprobación → conformidad → cobro → pago). El problema estructural es que **las Server Actions no validan el estado previo antes de transicionar**: casi todas las escrituras hacen `UPDATE ... WHERE id = X` sin verificar en qué estado está el registro ni quién llama. La UI oculta los botones inválidos, pero los services —que son la fuente de verdad y son invocables directamente como Server Actions— aceptan transiciones ilegales.

Las consecuencias concretas se concentran en cuatro zonas:

1. **Fase financiera sin candados** (hallazgos C1, C2, M1): se puede cobrar dos veces, con montos arbitrarios, sin control de rol; un presupuesto adicional aprobado se le paga al técnico pero nunca se le cobra al cliente.
2. **Cancelaciones que dejan residuos** (C4, C6, C7 — cards Trello #219/#230): presupuestos e inspecciones quedan "colgados" tras cancelar, bloqueando o contaminando la reasignación, y hasta permiten resucitar un incidente cancelado.
3. **Calendario decorativo** (M5 — card #218): ninguna etapa del flujo exige visita confirmada/completada; las fechas no se validan; el flujo entero puede avanzar sin tocar el calendario.
4. **Máquina de estados sin guardas** (C3, C5, M3, M4): aceptar asignaciones muertas, completar trabajos sin presupuesto, doble aprobación de conformidad con calificaciones duplicadas.

**Conteo:** 7 hallazgos CRÍTICOS, 12 MEDIOS, 8 MENORES.

---

## Hallazgos CRÍTICOS

### C1 — Registro de cobros y pagos sin control de rol, sin control de duplicados y con monto arbitrario

**Evidencia:**
- `frontend/features/pagos/cobros-clientes.service.ts:134-203` — `registrarCobroCliente` no llama a `requireAdminOrGestorId()`. Solo hace `supabase.auth.getUser()` para trazabilidad y luego inserta con `createAdminClient()` (bypass RLS). No verifica: (a) que no exista ya un cobro para ese `id_presupuesto`, (b) que `montoCobro` coincida con `presupuesto.costo_total`, (c) que el presupuesto pertenezca al incidente, (d) que el incidente tenga `fue_resuelto=1`.
- `cobros-clientes.service.ts:181-185` — tras el insert, el incidente pasa a `finalizado` incondicionalmente.
- `frontend/features/pagos/pagos-tecnicos.service.ts:162-227` — `registrarPagoTecnico` tiene exactamente las mismas ausencias (sin rol, sin duplicados, `montoPago` arbitrario, no valida que `idTecnico` sea el asignado).
- No existe en el repo ninguna migración que defina constraint UNIQUE sobre `cobros_clientes(id_presupuesto)` ni `pagos_tecnicos(id_presupuesto)` (búsqueda en `supabase/migrations/` sin resultados para esas tablas).

**Escenario de falla:**
1. Doble click / doble submit en el modal de pagos → dos filas de cobro por el mismo presupuesto (la lista de pendientes filtra, pero la acción no re-verifica).
2. Cualquier usuario autenticado (un cliente o un técnico) invoca la Server Action `registrarCobroCliente` con su propio incidente y `montoCobro: 1` → su incidente pasa a `finalizado` con un "cobro" de $1 registrado.
3. Admin tipea mal el monto → el cobro registrado no coincide con el `costo_total` del presupuesto y nadie lo detecta.

**Impacto de negocio:** integridad financiera rota: doble facturación, cierre de incidentes sin cobro real, montos que no cuadran con los presupuestos. Es el hallazgo que un tribunal detecta primero preguntando "¿qué impide cobrar dos veces?".

---

### C2 — `aprobarPresupuesto` y `rechazarPresupuesto` (admin) no validan el estado del presupuesto: degradación y regresión de estados terminales

**Evidencia:**
- `frontend/features/presupuestos/presupuestos.service.ts:309-369` — `aprobarPresupuesto` lee solo `costo_materiales`/`costo_mano_obra` y actualiza a `aprobado_admin` sin verificar que el estado actual sea `enviado`.
- `presupuestos.service.ts:377-497` — `rechazarPresupuesto` tampoco valida estado del presupuesto ni del incidente antes de marcar `rechazado` y (si no es adicional) devolver el incidente a `pendiente` (línea 485-488).

**Escenario de falla:**
1. El cliente ya aprobó (`aprobado`, terminal positivo) y el técnico está trabajando. El admin re-ejecuta `aprobarPresupuesto` (pestaña vieja, doble click) → el presupuesto **retrocede** a `aprobado_admin`: el sub-estado vuelve a "Esp. cliente", el cliente recibe otra notificación de aprobar, y `getPendientesCobroCliente` (que filtra `estado_presupuesto='aprobado'`) deja de ver el presupuesto → un trabajo terminado desaparece de la cola de cobro.
2. El admin ejecuta `rechazarPresupuesto` sobre el presupuesto `aprobado` de un incidente con `fue_resuelto=1` (esperando cobro) → el incidente vuelve a `pendiente`, la asignación se marca `rechazada` y el trabajo ya realizado queda sin camino de cobro.
3. Se puede "aprobar" un presupuesto `rechazado` o `vencido` (estados documentados como terminales en `ANALISIS_FLUJOS.md` §5.3).

**Impacto de negocio:** la doble aprobación admin→cliente (preocupación explícita del equipo) es violable en ambas direcciones; estados terminales no son terminales.

---

### C3 — Transiciones sin guardas en asignaciones: aceptar asignaciones muertas y resucitar incidentes cancelados

**Evidencia:**
- `frontend/features/asignaciones/asignaciones.service.ts:157-234` — `aceptarAsignacion` actualiza `estado_asignacion='aceptada'` (177-184) y `incidentes.estado_actual='en_proceso'` (196-199) **sin verificar** el estado actual de la asignación (`pendiente`?) ni del incidente.
- `asignaciones.service.ts:236-285` — `rechazarAsignacion` idem: fuerza el incidente a `asignacion_solicitada` sin chequear su estado.
- `asignaciones.service.ts:489-555` — `cancelarIncidenteCliente` hace check-then-act no atómico: consulta asignaciones aceptadas (513-519), luego cancela pendientes (526-530) y marca `cancelado` (533-537).

**Escenario de falla:**
1. Cliente cancela su incidente (`cancelado`) mientras el técnico tiene la pantalla de "Disponibles" abierta. El técnico toca "Aceptar" → la asignación (ya `cancelada`) vuelve a `aceptada` y el incidente cancelado pasa a `en_proceso`. **Incidente zombie**: el cliente lo dio de baja pero el sistema lo revive.
2. Race inversa: el técnico acepta en la ventana entre el check (513) y el update (533) de `cancelarIncidenteCliente` → resultado: incidente `cancelado` con asignación `aceptada`; el técnico ve un trabajo activo sobre un incidente cancelado.
3. Un técnico cuya asignación fue marcada `superada` (otro aceptó primero, línea 189-194) puede igualmente ejecutar `aceptarAsignacion` → dos asignaciones `aceptada` simultáneas sobre el mismo incidente.

**Impacto de negocio:** el estado del incidente deja de ser confiable; dos técnicos pueden facturar el mismo trabajo; un cliente que canceló puede recibir la visita igual.

---

### C4 — Cancelar incidente no cierra los presupuestos en vuelo → resurrección del incidente cancelado

**Evidencia:**
- `asignaciones.service.ts:562-649` — `cancelarIncidente` (admin) bloquea solo si hay presupuesto `aprobado` (570-580). Los presupuestos en `enviado` o `aprobado_admin` **no se marcan** rechazados/vencidos: quedan vivos.
- `presupuestos.service.ts:44-55` — `getPresupuestosForAdmin` lista todos los presupuestos sin filtrar por estado del incidente.
- `presupuestos.service.ts:546-549` — `aprobarPresupuestoCliente` pone el incidente en `en_proceso` incondicionalmente.

**Escenario de falla:** admin cancela un incidente que tenía un presupuesto `enviado`. El presupuesto sigue apareciendo en la bandeja del admin → lo aprueba (C2: sin guardas) → el cliente recibe la notificación "aprobá el presupuesto" de su incidente cancelado → lo aprueba → `estado_actual` pasa de `cancelado` a `en_proceso`. El incidente cancelado revivió con un flujo de dinero activo. Lo mismo aplica a `cancelarIncidenteCliente` (489-555), que tampoco toca presupuestos (aunque su guard de estados lo hace menos probable).

**Impacto de negocio:** "cancelado" no es terminal; el dinero/presupuesto queda colgado exactamente como teme la card #230.

---

### C5 — `aprobarConformidad` sin autorización ni idempotencia: calificaciones duplicadas y técnico equivocado

**Evidencia:**
- `frontend/features/conformidades/conformidades.service.ts:263-380` — no hay `requireAdminOrGestorId()` (usa `createAdminClient()` directo). No verifica que la conformidad tenga `url_documento`, ni que no esté ya `esta_firmada=1` o `esta_rechazada=true`.
- Líneas 302-330: cada ejecución inserta una fila en `calificaciones` y recalcula `calificacion_promedio` y `cantidad_trabajos_realizados`.
- Línea 290: `const asig = asigs.find(a => a.estado_asignacion === 'completada') || asigs[0]` — si no hay completada, toma **la primera asignación del array** (orden no determinístico del join), que puede ser un técnico rechazado/cancelado previo.

**Escenario de falla:**
1. Doble click del admin en "Aprobar" → dos calificaciones para el mismo incidente, `cantidad_trabajos_realizados` inflado, promedio distorsionado (métrica que alimenta el IRT y los reportes de la tesis).
2. Incidente reasignado dos veces: el técnico A canceló, el B completó pero su asignación quedó `en_curso` (nada obliga a `completada` antes de subir conformidad, ver C7/M5) → `asigs[0]` puede ser A → **la calificación y la notificación de cierre van al técnico equivocado**.
3. Se puede aprobar una conformidad ya rechazada (`esta_rechazada=true`), contradiciendo la máxima prioridad que la doc asigna a ese sub-estado.

**Impacto de negocio:** el sistema de reputación de técnicos (uno de los diferenciales de la tesis) se corrompe silenciosamente.

---

### C6 — `rechazarVisita` deja el incidente huérfano: `en_proceso` sin técnico y sin salida

**Evidencia:**
- `frontend/features/visitas/visitas.service.ts:228-265` — cancela la asignación (243-248) pero **no** actualiza `incidentes.estado_actual`, no libera `fecha_visita_programada`, no anula inspecciones ni presupuestos.
- `asignaciones.service.ts:322-327` — `crearAsignacion` solo actualiza el estado del incidente si está en `['pendiente','asignacion_solicitada']`.
- Además: el comentario (224-227) dice que solo aplica a visitas fuera de disponibilidad, pero no hay validación de `fuera_de_disponibilidad` ni de que el caller sea el cliente dueño (la función usa `createAdminClient()` sin ningún `require*`).

**Escenario de falla:** cliente rechaza la visita propuesta → asignación `cancelada`, pero el incidente sigue `en_proceso`. El admin reasigna: la asignación nueva nace `pendiente` pero el incidente queda `en_proceso` (el update condicionado de 322-327 no matchea). Resultado: un incidente `en_proceso` cuya única asignación es `pendiente` — combinación que ningún calculador de sub-estados (`getAccionPendiente`/`getStatusKey`) contempla. Para el cliente figura "trabajo en progreso" cuando no hay nadie trabajando.

**Impacto de negocio:** estado inconsistente permanente que requiere cirugía manual en DB; es exactamente el "estado huérfano" que pregunta la card #219.

---

### C7 — Cancelación del técnico post-aprobación: presupuesto e inspección quedan vivos y contaminan la reasignación

**Evidencia:**
- `asignaciones.service.ts:357-432` — `cancelarAsignacionAceptada` (técnico se baja) devuelve el incidente a `pendiente` y limpia visitas/compromiso (400-415) ✓, pero **no anula la inspección ni el presupuesto** (que puede estar `aprobado`).
- `asignaciones.service.ts:651-742` — `darDeBajaIncidente` (admin desafecta) idem: ni inspecciones, ni presupuestos, ni visitas (a diferencia de `cancelarAsignacionAceptada`, acá tampoco se cancelan visitas activas → visita `confirmada` del técnico saliente sigue apareciendo como activa vía `getVisitaActivaDeIncidente`, `visitas.service.ts:20-31`).
- `frontend/features/inspecciones/inspecciones.service.ts:111-123` — `crearInspeccion` bloquea si existe un presupuesto en estado ≠ `rechazado`.
- `pagos-tecnicos.service.ts:104` — el pago pendiente se atribuye al técnico de la asignación activa: `find(['completada','en_curso','aceptada']) || asigs[0]`.

**Escenario de falla:** el cliente aprobó el presupuesto del técnico A ($500.000). A se baja (`cancelarAsignacionAceptada`) → incidente a `pendiente`. El admin asigna al técnico B, que acepta. Consecuencias en cadena:
1. B no puede cargar su inspección (bloqueada por el presupuesto `aprobado` de A, inspecciones.service.ts:121-122).
2. El sub-estado de B salta directo a `en_curso` (presupuesto `aprobado` existente) → B "hereda" el precio de A sin haber presupuestado.
3. Cuando B completa, `getPendientesPagoTecnico` le liquida a B el monto presupuestado por A.

**Impacto de negocio:** dinero colgado y atribución de pago incorrecta tras cualquier baja post-aprobación — el corazón de las cards #219/#230.

---

## Hallazgos MEDIOS

### M1 — El presupuesto adicional aprobado se paga al técnico pero nunca se cobra al cliente

**Evidencia:** `cobros-clientes.service.ts:63` — `getPendientesCobroCliente` filtra `incidentes.estado_actual = 'en_proceso'`. `cobros-clientes.service.ts:181-185` — el primer cobro pasa el incidente a `finalizado`. En cambio `pagos-tecnicos.service.ts:70` — `getPendientesPagoTecnico` incluye `['finalizado','resuelto','en_proceso']`.

**Escenario:** incidente con presupuesto principal + adicional, ambos `aprobado`. El admin cobra el principal → incidente `finalizado` → el adicional desaparece para siempre de la cola de cobros (filtro `en_proceso`), pero sigue apareciendo en la cola de pagos al técnico. ISBA paga el adicional y no lo cobra.

**Impacto:** pérdida económica directa y asimetría cobro/pago. Workaround: cobro manual fuera del sistema.

### M2 — El cliente recibe por email el precio SIN comisión ISBA apenas el técnico crea el presupuesto

**Evidencia:** `presupuestos.service.ts:217-219` — `crearPresupuesto` dispara `notificarPresupuestoCreado`. `frontend/features/notificaciones/notificaciones.service.ts:147-183` — ese email va **al cliente** con el `costo_total` de ese momento (materiales + mano de obra, sin `gastos_administrativos`, que el admin agrega recién en `aprobarPresupuesto`) e invita a "revisar y aprobar".

**Escenario:** técnico envía presupuesto de $100.000 → cliente recibe email "$100.000, ingresá a aprobar" (aunque en el sistema aún no puede aprobarlo). El admin aprueba con $20.000 de gastos → segundo email por $120.000. El cliente ve la comisión de ISBA por diferencia y percibe un "aumento".

**Impacto:** filtra la estructura de comisión (dato comercialmente sensible para la inmobiliaria) y contradice el flujo documentado (el cliente no debería ver el presupuesto hasta `aprobado_admin`).

### M3 — `crearAsignacion` permite dos técnicos activos en paralelo

**Evidencia:** `asignaciones.service.ts:296-311` — solo bloquea si existe asignación `pendiente`. No verifica asignaciones `aceptada`/`en_curso` ni el estado del incidente (se puede asignar técnico a un incidente `en_proceso`, `finalizado` o `cancelado`; el update de estado en 322-327 no matchea pero la asignación se inserta igual y el técnico la ve en "Disponibles").

**Escenario:** técnico A aceptó y está trabajando. Admin (por error o desde una vista desactualizada) asigna al técnico B → pasa la validación (no hay `pendiente`) → B acepta → dos asignaciones `aceptada` activas; conformidades, calificaciones y pagos eligen técnico por `find(...) || asigs[0]` (ver C5/C7).

### M4 — `enviarPresupuesto` revive presupuestos rechazados

**Evidencia:** `presupuestos.service.ts:268-304` — sin `require*` de ningún tipo y sin validar estado actual: setea `enviado` a cualquier presupuesto.

**Escenario:** el admin rechazó el presupuesto (técnico desvinculado, incidente `pendiente`). El técnico ejecuta `enviarPresupuesto(id)` → el presupuesto vuelve a `enviado` y reaparece en la bandeja del admin, sin asignación activa que lo respalde. Bypass del camino de rechazo.

### M5 — El calendario no gobierna el flujo: cero validaciones de fechas/franjas y ninguna etapa exige visita (card #218)

**Evidencia:**
- `visitas.service.ts:78-161` — `proponerVisita` no valida: fecha pasada, `horaFin > horaInicio`, superposición con otras visitas del mismo técnico. Solo calcula el flag informativo `fuera_de_disponibilidad` (96-102).
- `visitas.service.ts:353-366` — `completarVisita` permite completar una visita apenas `propuesta` (sin confirmación del cliente).
- `visitas.service.ts:168-221` — `confirmarVisita` no valida que la fecha no haya pasado.
- `inspecciones.service.ts:96-167` — `crearInspeccion` no exige visita de inspección confirmada/completada; `asignaciones.service.ts:437-476` — `completarAsignacion` no exige visita de reparación; nada en presupuestos/conformidades consulta la tabla `visitas`.
- `frontend/features/disponibilidad/disponibilidad.service.ts:10-31` — `guardarFranjasDisponibilidad` sin validación de fechas pasadas ni `hora_fin > hora_inicio` ni ownership.
- `disponibilidad.service.ts:424-468` — `getConflictosTecnicos` solo mira `asignaciones_tecnico.fecha_visita_programada`; las visitas `propuesta` (aún no confirmadas) de la tabla `visitas` no generan conflicto → el admin puede asignar a un técnico que ya propuso visita en el mismo horario.

**Escenario:** el técnico acepta a las 10:00, carga inspección a las 10:01 y presupuesto a las 10:02 sin haber propuesto ninguna visita; o propone una visita para ayer de 18:00 a 09:00. El sistema acepta todo. Todo el módulo de agenda es informativo, no normativo.

**Impacto:** la respuesta a la card #218 es sí: se puede avanzar el flujo completo sin respetar tiempos ni visitas.

### M6 — El cliente nunca puede calificar: la calificación del admin bloquea la del cliente (y la notificación lo invita igual)

**Evidencia:** `conformidades.service.ts:302-312` — `aprobarConformidad` inserta una calificación por incidente. `frontend/features/calificaciones/calificaciones.service.ts:154-157` — `crearCalificacion` (cliente) rechaza si `existeCalificacionDelCliente(id_incidente)` (que chequea por incidente, sin discriminar autor, 123-133). `conformidades.service.ts:356` — la notificación al cliente dice "Podés calificar al técnico desde el módulo de Incidentes".

**Escenario:** admin aprueba conformidad (siempre inserta calificación) → el cliente entra a calificar como le indica la notificación → "Ya existe una calificación para este incidente". El feature de calificación del cliente es inalcanzable en el flujo actual.

### M7 — Caminos de rechazo que desvinculan al técnico sin notificarle

**Evidencia:**
- `presupuestos.service.ts:670-693` — `rechazarPresupuestoCliente` (primer presupuesto): marca la asignación `rechazada` y notifica **solo al admin**; el técnico no recibe nada.
- `presupuestos.service.ts:745-766` — `rechazarPresupuestoConDecision(decision='nuevo_tecnico')`: idem, solo admin.
- `asignaciones.service.ts:525-549` — `cancelarIncidenteCliente` cancela la asignación `pendiente` del técnico y notifica solo al admin.

**Escenario:** el técnico ve desaparecer su trabajo de la lista sin explicación; puede haber comprado materiales o reservado el horario. Contrasta con `rechazarPresupuesto` admin (471-481) que sí notifica.

### M8 — Anulación de inspecciones inconsistente entre caminos de rechazo

**Evidencia:** solo `rechazarPresupuesto` (admin) anula las inspecciones del técnico saliente (`presupuestos.service.ts:463-469`). `rechazarPresupuestoCliente` (670-693) y `rechazarPresupuestoConDecision('nuevo_tecnico')` (745-755) no lo hacen.

**Escenario:** cliente rechaza con `nuevo_tecnico` → técnico B acepta → como la inspección de A sigue viva (`esta_anulada=false`), el sub-estado de B salta a "Pend. presupuesto": B presupuesta sobre la inspección de otro técnico sin visitar el inmueble.

### M9 — `actualizarIncidente` permite regresiones de estado arbitrarias

**Evidencia:** `frontend/features/incidentes/incidentes.service.ts:323-349` — bloquea solo `finalizado`/`resuelto`; acepta cualquier otro `estado_actual` (p.ej. `pendiente` o `cancelado`) sin validar el estado actual ni las guardas de `cancelarIncidente` (presupuesto aprobado, etc.). Tampoco valida rol (usa `createClient`, dependiente de RLS no verificable desde el repo).

**Escenario:** un incidente `en_proceso` con presupuesto aprobado se edita a `cancelado` desde el modal de edición → bypass total de la regla "no se puede cancelar con presupuesto aprobado" (asignaciones.service.ts:570-580).

### M10 — Cobrado sin pagar al técnico: sin vínculo, sin recordatorio; y el pago puede preceder al cobro

**Evidencia:** `registrarCobroCliente` (cobros-clientes.service.ts:187-197) notifica solo al cliente: no dispara ninguna alerta de "ahora corresponde pagarle al técnico". No existe reporte/notificación de incidentes cobrados-y-no-pagados (solo la lista pasiva de pendientes). Además `getPendientesPagoTecnico` incluye `en_proceso` (pagos-tecnicos.service.ts:70), por lo que el admin puede pagarle al técnico **antes** de cobrarle al cliente, contradiciendo el orden del `FLUJO_ESTADOS.md` (cobro → finalizado → pago).

**Escenario:** ISBA cobra $120.000 al cliente; el pago de $100.000 al técnico depende de que un humano recuerde entrar a la pestaña de pagos. Puede quedar impago para siempre sin que nada lo señale. Inversamente, puede pagarse al técnico un trabajo cuyo cliente después rechaza la conformidad.

### M11 — Editar/eliminar calificaciones no recalcula el promedio del técnico

**Evidencia:** `calificaciones.service.ts:178-222` — `actualizarCalificacion` y `eliminarCalificacion` modifican la tabla pero nunca recalculan `tecnicos.calificacion_promedio` ni `cantidad_trabajos_realizados` (el recálculo solo existe dentro de `aprobarConformidad`, conformidades.service.ts:314-329). Tampoco validan ownership.

**Escenario:** se elimina una calificación de 1★ → el promedio del técnico sigue mostrando el valor viejo en reportes, ranking y asignación.

### M12 — Integridad de montos del presupuesto no garantizada

**Evidencia:** `presupuestos.service.ts:191-225` — `crearPresupuesto` acepta `costo_total` y hasta `gastos_administrativos` provistos por el técnico, sin validar `costo_total = materiales + mano_obra` ni montos ≥ 0. `presupuestos.service.ts:230-263` — `actualizarPresupuesto` permite actualizar componentes sin recalcular `costo_total` (o viceversa). La única recomposición ocurre en `aprobarPresupuesto` (326).

**Escenario:** técnico envía `costo_materiales: 50.000, costo_mano_obra: 50.000, costo_total: 80.000` → el admin evalúa un total que no es la suma; si edita solo `costo_materiales` después, el total queda desincronizado hasta la aprobación.

---

## Hallazgos MENORES

### m1 — Enums "fuente de verdad" desactualizados respecto de los estados reales
`frontend/shared/types/enums.ts:34-48` — `EstadoIncidente` no incluye `cancelado` (escrito en asignaciones.service.ts:535,615) y `EstadoAsignacion` no incluye `cancelada` ni `superada` (191). `ANALISIS_FLUJOS.md` §2 y `FLUJO_ESTADOS.md` tampoco documentan `cancelado`. Un tribunal que contraste doc/enum/código lo detecta de inmediato.

### m2 — `firmarConformidad` es un camino legacy huérfano pero invocable
`conformidades.service.ts:172-190` — setea `esta_firmada=1` sin `fue_resuelto`, sin calificación, sin cambiar el incidente. No tiene callers en `app/`/`components/` (verificado por grep), pero como Server Action exportada sigue siendo invocable: produciría una conformidad "aprobada" con un incidente que jamás llega a cobro.

### m3 — La segunda expiración de disponibilidad no se procesa
`disponibilidad.service.ts:307` — `procesarDisponibilidadVencida` filtra `sin_visita_por_disponibilidad=false` y el flag nunca vuelve a `false` (332-334). Si el cliente carga nuevas franjas y también vencen, no hay segunda notificación ni limpieza.

### m4 — Los procesos de vencimiento dependen de que un cliente cargue una página
`app/(cliente)/cliente/incidentes/page.tsx:23-24` — `processarVisitasVencidas()` y `procesarDisponibilidadVencida()` corren solo en el SSR de la lista de incidentes del cliente. Sin tráfico de clientes, las visitas vencidas quedan `propuesta` indefinidamente. No hay cron/scheduled job.

### m5 — `marcarPresupuestoVencido` sin validación de estado ni notificaciones
`presupuestos.service.ts:502-517` — puede "vencer" un presupuesto `aprobado`; no notifica a técnico ni cliente, y no gatilla ninguna consecuencia sobre el incidente (que queda esperando un presupuesto que ya no existe).

### m6 — `eliminarInspeccion`, `eliminarAvance`, `actualizarInspeccion` sin ownership ni restricción de estado
`inspecciones.service.ts:216-230`, `avances.service.ts:98-112`, `inspecciones.service.ts:172-198` — cualquier usuario con sesión puede borrar la inspección que sostiene un presupuesto ya enviado (dejando `id_inspeccion` colgado) o avances ajenos.

### m7 — `rechazarConformidad` notifica antes de persistir
`conformidades.service.ts:411-427` (notifica) vs 429-438 (update). Si el update falla, el técnico recibió "conformidad rechazada" pero la conformidad sigue pendiente para el admin.

### m8 — `getIncidentesConPresupuestoPendiente` no filtra por cliente
`presupuestos.service.ts:108-117` — devuelve los IDs de **todos** los incidentes con presupuesto `aprobado_admin` del sistema (sin `requireClienteId` ni join por dueño). Hoy el caller lo intersecta con los incidentes propios, pero como Server Action expone información global y es frágil ante nuevos usos.

---

## Respuestas directas a las preocupaciones del equipo (Trello)

| # | Pregunta | Respuesta corta |
|---|----------|-----------------|
| #219/#230 | ¿Cancelaciones limpian calendario/dinero? | **No siempre.** `cancelarAsignacionAceptada` limpia visitas ✓; `darDeBajaIncidente`, `cancelarIncidente`, `cancelarIncidenteCliente` y `rechazarVisita` no. Presupuestos e inspecciones nunca se cierran al cancelar (C4, C6, C7). |
| #218 | ¿Se puede avanzar sin respetar el calendario? | **Sí, completamente** (M5). El calendario es informativo: ninguna transición exige visita y no hay validación de fechas/franjas/solapamientos. |
| Máquina de estados | ¿Transiciones inválidas? | Sí: sin guardas de estado previo en asignaciones, presupuestos y conformidades (C2, C3, C5, M4, M9); estado huérfano `en_proceso`-sin-técnico (C6); doble aprobación violable en ambas direcciones (C2). |
| Fase financiera | ¿Doble cobro / impago eterno / comisión? | Doble cobro posible (C1); adicional pagado y no cobrado (M1); impago al técnico sin alerta y pago posible antes del cobro (M10); comisión filtrada por email temprano (M2) y montos no validados (C1, M12). |
| Rechazos | ¿Todos recuperables? | Los caminos vuelven a `pendiente`/`asignacion_solicitada` ✓, pero dejan residuos (inspecciones sin anular M8, presupuestos vivos C4/C7) y desvinculan técnicos sin avisarles (M7). |
| Notificaciones | ¿Eventos sin aviso? | Técnico desvinculado por rechazo del cliente (M7); "cobrado → hay que pagar al técnico" (M10); `marcarPresupuestoVencido` (m5); `completarVisita` no avisa a nadie. |

---

## Recomendación de priorización (pre-defensa)

1. **Guardas de estado + rol en las 6 escrituras financieras/terminales:** `registrarCobroCliente`, `registrarPagoTecnico`, `aprobarPresupuesto`, `rechazarPresupuesto`, `aprobarConformidad`, `aceptarAsignacion`. Patrón único: `UPDATE ... WHERE id = X AND estado = <esperado>` y verificar filas afectadas (transición atómica, elimina también las races).
2. **Rutina única de "cierre de residuos"** invocada por todas las cancelaciones/bajas: anular inspecciones, marcar presupuestos no-aprobados como `vencido`, cancelar visitas activas, liberar compromiso.
3. **Fix de una línea con alto retorno:** filtrar `getPendientesCobroCliente` por `fue_resuelto=1` sin exigir `en_proceso` (M1); mover `notificarPresupuestoCreado` de `crearPresupuesto` a notificación al admin (M2); notificar al técnico en los tres caminos de M7.
4. Documentar `cancelado` y `superada` en enums y en `ANALISIS_FLUJOS.md`/`FLUJO_ESTADOS.md` (m1) — costo trivial, evita la observación más fácil del tribunal.
