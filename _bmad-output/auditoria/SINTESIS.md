# Síntesis de auditoría BMAD — Mantis (pre-defensa)

**Fecha:** 2026-07-03 · **Método:** 4 especialistas BMAD en paralelo (Mary/analista + edge-case hunter, Winston/arquitecto + revisión adversarial, Sally/UX + revisión estructural, Paige/tech writer). Responde a la card Trello #223.

**Informes completos:**
- [logica-de-negocio.md](logica-de-negocio.md) — 7 críticos, 12 medios, 8 menores
- [arquitectura-seguridad.md](arquitectura-seguridad.md) — autorización, RLS, Walter, Storage
- [presentacion.md](presentacion.md) — los 7 pedidos de la card #233 + calidad proyector (#224)
- [consistencia-pdf-codigo.md](consistencia-pdf-codigo.md) — 4 riesgos altos, 5 medios, 6 bajos + 11 verificaciones positivas

---

## Los 2 hallazgos raíz (todo lo demás deriva de acá)

**R1 — La seguridad declarada no es la seguridad real.** El sistema declara "guard `require*` + RLS", pero casi todos los services usan `createAdminClient()` (service_role → bypassea RLS) y muchas funciones no tienen guard. La RLS quedó decorativa; donde falta el guard, no hay nada.

**R2 — Las Server Actions no validan el estado previo antes de transicionar.** La UI oculta los botones inválidos, pero los services aceptan transiciones ilegales si se los invoca directo: incidentes cancelados que reviven, dobles cobros, dos técnicos aceptados, estados huérfanos.

**Fix estructural común (barato y defendible):**
1. Wrapper de autorización uniforme al inicio de cada action + reservar `service_role` a crear/eliminar usuarios.
2. Patrón `UPDATE ... WHERE estado = <esperado>` (transición condicional atómica) en cada cambio de estado + rutina única de "cierre de residuos" al cancelar.

---

## Prioridad 0 — antes de la defensa (seguridad explotable)

| # | Hallazgo | Dónde |
|---|----------|-------|
| 1 | `crearEmpleado` sin guard acepta `rol` del payload → auto-escalada a admin | usuarios.service.ts:766 |
| 2 | Gestión de usuarios sin guard: eliminar, aprobar solicitud, actualizar (cambio de email → takeover), toggleActivo | usuarios.service.ts |
| 3 | Walter: el `rol` lo controla el cliente → `rol='admin'` lee cualquier incidente | walter.service.ts |
| 4 | Cobro/pago sin rol, sin anti-duplicados, monto arbitrario del caller → doble cobro | cobros-clientes.service.ts:134-203 |
| 5 | Escrituras de negocio sin guard con bypass RLS (asignaciones, cancelaciones, aprobaciones, visitas, disponibilidad) | varios service.ts |
| 6 | Bucket `documentos` público: conformidades firmadas y comprobantes accesibles por URL | storage / getPublicUrl |
| 7 | ~45 lecturas globales sin guard (reportes, exportar, métricas, dashboards) + IDOR de lectura por ID | reportes/, exportar/, incidentes/ |

## Prioridad 1 — integridad del negocio (los "estados zombie")

| # | Hallazgo | Card Trello |
|---|----------|-------------|
| 1 | Cancelar incidente no cierra presupuestos en vuelo → la cadena de aprobaciones lo resucita | #219 #230 |
| 2 | `aceptarAsignacion` sin verificar estados → revive cancelados, permite 2 técnicos | #219 |
| 3 | `rechazarVisita` cancela la asignación pero no el incidente → `en_proceso` sin técnico, irrecuperable | — |
| 4 | Baja de técnico post-aprobación deja presupuesto/inspección vivos → nuevo técnico hereda precio ajeno | — |
| 5 | Calendario 100% decorativo: sin validación de fechas/solapamientos, ninguna etapa exige visita | #218 |
| 6 | Adicional aprobado se paga al técnico pero nunca se cobra al cliente | — |
| 7 | Email al cliente con precio SIN comisión ISBA al crear presupuesto | — |
| 8 | `aprobarConformidad` sin idempotencia → calificaciones duplicadas / técnico equivocado | — |

**Respuestas directas a las preocupaciones del Trello:**
- **#218** (avanzar sin respetar calendario): confirmado — el calendario no bloquea nada; decidir si es validación dura o se documenta como "flexibilidad operativa" para la defensa.
- **#219/#230** (cancelación pre/post asignación): confirmado — quedan residuos (presupuestos vivos, visitas del técnico sin limpiar); falta una rutina única de cierre.

## Prioridad 2 — documento de tesis (preguntas del tribunal)

1. **A1:** El mandato (p.54) excluye "cobranza de pagos", pero el sistema tiene módulo financiero completo y el propio PDF lo documenta después. Contradicción interna — preparar respuesta o corregir el mandato.
2. **A2:** UC y BPMN del PDF dicen asignar→`en_proceso`; el código (y la máquina de estados del mismo PDF, p.120) usa `asignacion_solicitada`.
3. **A3:** PDF dice que si admin rechaza presupuesto "el técnico rehace"; el código desvincula al técnico y vuelve a `pendiente`.
4. **A4:** Matriz de trazabilidad con RF renumerados distinto a la tabla 6.2 + HUs citan RF inexistentes.
5. Rol `gestor` existe en el código pero el PDF declara 3 roles.
6. Riesgo de demo: el PPI de deuda (SP8) filtra por `finalizado` → nunca puede mostrar deuda; Pagos usa otro criterio.

**Escudo:** el informe de Paige lista 11 verificaciones positivas código↔PDF (sub-estados, PPIs, DER, conformidad por foto, nombres de tablas) para citar en la defensa.

## Prioridad 3 — presentación (card #233 confirmada punto por punto)

1. Falta la slide del **dolor real** tras "6 problemas estructurales" (propuesta lista en el informe).
2. Matriz "Cada problema tiene su solución" **100% desalineada**: ningún título coincide, fila huérfana ("Subtrabajos pagos"), "Estado fuera de control" sin fila. Mapeo 1:1 propuesto.
3. Quitar "Problema y objetivo": OK, pero migrar el objetivo del sistema a la nueva slide "El mandato".
4. "El mandato": propuesta completa (objetivo como banda + DESDE→HASTA + chips de módulos, 207→110 palabras).
5. Metodología: 6 datos desactualizados (cronograma dice Dic 2025–Abr 2026 con 352 commits posteriores, bugs #211–#229 superados, "daily semanal", etc.).
6. Portales y Walter: propuestas gráficas (mini-pipeline por rol / conversación simulada con chips de tools).

**Extras (card #224):** numeración de hoja de ruta rota (Flujos duplicado en 06/07, Indicadores dice 14 vs 11) · términos prohibidos aún visibles: "trazabilidad" ×3 (l. 3781/3785 + modales) y "tiempo real" ×2 (modales HU-01/RF-12) · top slides con exceso de texto: matriz (293 palabras), Valor agregado (282), Portales (223) · Indicadores sin citar fuente (etiquetar como datos del seed).

---

## Orden de ataque sugerido

1. **Hoy/mañana:** P0 items 1-4 (son pocas líneas cada uno: agregar guard + validar rol server-side en Walter + anti-duplicado en cobro/pago).
2. **Esta semana:** wrapper de autorización + transiciones condicionales (R1+R2 de una vez) y rutina de cierre en cancelaciones (#219/#230).
3. **En paralelo (no toca código):** correcciones de la presentación (card #233) y las 4 inconsistencias ALTAS del PDF.
4. **Decisión de diseño a conversar:** calendario — ¿validación dura o flexibilidad documentada? (#218).
