# Registro de resolución — Cacería de bugs 2026-07-04

**Propósito:** trazar cada fix de [bugs-criticos-2026-07-04.md](bugs-criticos-2026-07-04.md) hasta su implementación, con archivos tocados y CÓMO TESTEAR. Se actualiza fix por fix a medida que se implementan. Todo va en **UN solo commit** al final (pedido de Fausti), previa batería de tests (unit + E2E DB + tsc + build + verificación en navegador).

**Decisiones de negocio tomadas por Fausti (2026-07-04):**
- B2-baja: se PERMITE dar de baja al técnico si la conformidad vigente está rechazada (sin resubida).
- B4: la deuda del PPI SP8 es la EXIGIBLE (`fue_resuelto=true` esperando cobro).
- B10: SÍ se notifica al cliente cuando el técnico se da de baja.
- B12: SÍ se agrega la etapa "Esperando cobro" al WIP (revisar que el PDF no fije etapas).
- B7: bloquear el submit (decisión previa del diagrama: "NO PERMITIR").
- B6-visita: queda como flexibilidad documentada (criterio académico); solo se fixea B6-pendiente.

Leyenda: ⏳ implementado, falta prueba · ✅ probado OK.

---

## Grupo 1 — Conformidades: regla canónica "vigente" (B1 + B2) — ⏳

- **Bugs:** B1 (modal roto tras rechazo+resubida por 2 filas + `.maybeSingle()`), B2 (badge admin clavado en "Conf. rechazada" + baja de técnico bloqueada por rechazada histórica).
- **Solución:** nuevo helper puro `conformidadVigente()` en `shared/utils/conformidades.ts` (última NO rechazada; si todas rechazadas, la rechazada más reciente). Aplicado en 6 puntos:
  1. `getConformidadDelIncidente` (lista + vigente, sin maybeSingle) — `features/conformidades/conformidades.service.ts`
  2. `getAccionPendiente` (admin) — `components/admin/incidentes-content.client.tsx`
  3. Mapa del técnico (antes last-wins sin ORDER BY) — `app/(tecnico)/tecnico/trabajos/page.tsx`
  4. `darDeBajaIncidente`: el guard ignora rechazadas (`.eq('esta_rechazada', false)`) — `features/asignaciones/asignaciones.service.ts`
  5. `getWipData` (clasificación de etapa) — `features/reportes/metricas-ppis.service.ts`
  6. `getIncidentesConConformidadSubida` (sub-estado cliente) excluye rechazadas — `conformidades.service.ts`
- **UI:** tab Conformidad del técnico en el modal — si la vigente está rechazada muestra banner rojo + formulario de RESUBIDA (antes quedaba clavado en "en revisión") — `components/incidentes/incidente-detail-modal.tsx`.
- **CÓMO TESTEAR:** técnico sube conformidad → admin rechaza → (a) técnico abre el incidente: ve banner rojo + form y puede resubir; (b) resube → admin ve la foto nueva y el badge vuelve a "Ver conform."; (c) el modal carga todas las secciones sin quedar vacío; (d) con conformidad rechazada SIN resubir, admin puede dar de baja al técnico; con una vigente no rechazada, la baja sigue bloqueada.

## Grupo 2 — Tab Pagos con presupuesto adicional (B3) — ⏳

- **Bug:** con original + adicional ambos `aprobado`, `.maybeSingle()` devolvía null → tab Pagos vacío para cliente y técnico.
- **Solución:** `getMisPagosDeIncidente` y `getMisPagosTecnicoDeIncidente` devuelven `pendientes[]` (todos los aprobados sin cobrar/pagar, orden cronológico). El modal renderiza N tarjetas ("— presupuesto original" / "— adicional" cuando hay más de una).
- **Archivos:** `features/pagos/cobros-clientes.service.ts`, `features/pagos/pagos-tecnicos.service.ts`, `components/incidentes/incidente-detail-modal.tsx`.
- **CÓMO TESTEAR:** incidente con original $10.000 cobrado + adicional $5.000 sin cobrar → cliente abre tab Pagos: ve 1 pendiente ($5.000) + historial ($10.000). Con ambos sin cobrar: 2 tarjetas pendientes. Técnico ídem con sus montos (mat+mdo, sin comisión).

## Grupo 3 — Reportes financieros (B4 + B5 + W3 + B12 + timeline) — ⏳

- **B4 (SP8/DPC deuda siempre $0):** `getSp8Data` ahora filtra deuda EXIGIBLE: presupuestos `aprobado` sin cobro de incidentes `fue_resuelto=true` en estados `en_proceso`/`finalizado` — `features/reportes/metricas-ppis.service.ts`.
- **B5 (tabla `pagos` huérfana) — mapeo semántico por superficie:**
  - `getEstadoFinanciero`: Total Cobrado = `cobros_clientes.monto_cobro`; distribución por `metodo_pago` — `features/reportes/reportes.service.ts`.
  - `getPagosParaExportar` (CSV/PDF de pagos): une `cobros_clientes` (tipo `cobro_cliente`) + `pagos_tecnicos` (tipo `pago_tecnico`) — `features/exportar/exportar.service.ts`.
  - R4 costo por propiedad = cobros al cliente de sus incidentes.
  - R10 rentabilidad: ingresos = cobros; costos = pagos a técnicos (antes usaba presupuesto total CON comisión → rentabilidad nunca positiva).
  - R11 comparativo: "Ingresos ($)" = cobros del período.
  - R12 indicadores globales: ingresos = cobros; costos = pagos a técnicos.
  - Timeline del incidente (`getTimelineData`): eventos de pago desde `cobros_clientes` (alias a nombres históricos) — `features/incidentes/incidentes.service.ts`.
  - Limpieza: la página admin de Pagos ya no llama `getPagosForAdmin()` (prop `pagos` no se usaba en el componente) — `app/(admin)/dashboard/pagos/page.tsx`, `components/admin/pagos-content.client.tsx`.
- **W3 (Walter `consultar_pagos_cobros`):** reescrito sobre `cobros_clientes` + `pagos_tecnicos`; devuelve total cobrado, total pagado a técnicos y neto; schema del tool actualizado (`tipo_pago: 'cobro_cliente'|'pago_tecnico'`) — `features/walter/walter.service.ts`.
- **B12 (WIP):** `getWipData` trae `fue_resuelto` y clasifica en nueva etapa "Esperando cobro al cliente" (responsable Administración) con prioridad máxima, como `getAccionPendiente` — `features/reportes/metricas-ppis.service.ts`.
- **CÓMO TESTEAR:** (a) con un incidente `fue_resuelto` sin cobrar, el panel SP8 "Cobros pendientes al cliente" muestra el monto (antes siempre "✓ Sin deuda"); (b) Reportes → Estado Financiero: Total Cobrado = suma de la pantalla Cobros (ya no $0); (c) Exportar R10/R11/R12: ingresos coinciden con R5/R13; (d) WIP: incidentes esperando cobro aparecen en su propia barra teal; (e) Walter (admin): "¿cuánto cobramos?" responde con las cifras de cobros reales; (f) timeline del incidente muestra el evento de cobro registrado.

## Grupo 4 — Alta administrativa de usuarios rota (W1 + W9) — ⏳

- **W1 (crítico máximo):** la migración `20260625000002` eliminó el trigger AFTER INSERT sobre `auth.users`; `admin.createUser({email_confirm:true})` no dispara el trigger de confirmación → `crearEmpleado`/`aprobarSolicitudTecnico` dejaban usuarios SIN fila en `public.usuarios` → login en loop infinito `/login⇄/dashboard`.
- **Solución:** ambas funciones insertan explícitamente en `public.usuarios` (+`clientes`/`tecnicos` según rol, replicando el trigger) con chequeo previo de existencia (seguro si un trigger legacy siguiera vivo) y compensación completa en fallos (borra filas creadas + deleteUser). `aprobarSolicitudTecnico` inserta en vez de updatear la fila fantasma.
- **W9:** `rechazarSolicitud` ahora es transición condicional (`.eq('estado_solicitud','pendiente')` + verificación de filas afectadas).
- **Archivos:** `features/usuarios/usuarios.service.ts`.
- **CÓMO TESTEAR:** admin crea un empleado (o aprueba una solicitud de técnico) → loguear con esas credenciales → entra al portal correcto sin loop. Rechazar una solicitud ya aprobada → error claro sin pisarla. **PENDIENTE con token nuevo:** reparar usuarios rotos preexistentes (filas de `auth.users` sin par en `usuarios`).

## Grupo 5 — Walter (W2 + C2 + W6 + W7) — ⏳

- **W2 (crítico):** `consultar_estado_incidente` filtra para rol cliente los presupuestos `borrador`/`enviado` (precio crudo SIN comisión) — misma regla que la página de presupuestos del cliente. Ya no puede filtrar el precio del técnico ni deducirse la comisión.
- **C2:** el select ahora trae `inspecciones` y `visitas` → Walter puede distinguir `pendiente_inspeccion` de "pend. presupuesto" como el resto del sistema.
- **W6:** `consultar_tecnicos` filtra por el array `especialidades` con fallback al singular (patrón de TecnicosTab) — un plomero+electricista ahora aparece al pedir electricistas.
- **W7:** `consultar_incidentes_aging` excluye `cancelado` y `resuelto` (antes contaba cancelados como "atrasados").
- **Fechas:** el prompt y la validación de franjas de Walter usan fecha calendario ARGENTINA (antes UTC: después de las 21:00 Walter creía que era mañana y rechazaba franjas de hoy).
- **Archivos:** `features/walter/walter.service.ts`.
- **CÓMO TESTEAR:** con un presupuesto en `enviado`, preguntarle a Walter (como cliente) por ese incidente → no menciona monto; aprobarlo como admin → ahí sí muestra el total con comisión. Como admin: "¿técnicos de electricidad?" incluye a los que la tienen como 2ª especialidad; "¿incidentes atrasados?" no lista cancelados.

## Grupo 6 — Calendario / inspecciones / notificaciones (B6 + B7 + B8 + B9 + B10 + B13 + W4 + W5) — ⏳

- **B6-pendiente:** `crearInspeccion` exige asignación `aceptada`/`en_curso` del técnico (antes se podía cargar inspección con la asignación sin aceptar). `features/inspecciones/inspecciones.service.ts`.
- **B7:** el form de reporte bloquea el submit si algún día seleccionado quedó sin franja horaria (lista los días faltantes). Nuevo callback `onDiasSinFranjaChange` en `CalendarioDisponibilidad`. `app/(cliente)/cliente/incidentes/nuevo/page.tsx`, `components/ui/calendario-disponibilidad.tsx`.
- **B8:** el inbox realtime compara contra el `id_tecnico`/`id_cliente` del usuario logueado (via `getCurrentUser()`), no solo el rol — sin leak entre usuarios del mismo rol. `components/shared/notificaciones-panel.client.tsx`.
- **B9:** nuevo helper `hoyArgentina()` (`shared/utils/fechas.ts`) usado en `procesarDisponibilidadVencida`, `getIncidentesNecesitanNuevaDisponibilidadInspeccion`, `processarVisitasVencidas` y el `hoy` del listado del cliente — se acabó el vencimiento 3 h antes (21:00–00:00 ART).
- **B10:** `cancelarAsignacionAceptada` notifica también al CLIENTE ("estamos buscando reemplazo"), consistente con `darDeBajaIncidente`. `features/asignaciones/asignaciones.service.ts`.
- **B13:** el toast admin "Cliente aprobó un presupuesto" deduplica por `id_presupuesto` y no depende de `payload.old`. `components/admin/realtime-notificaciones.client.tsx`.
- **W4:** `handleSubirConformidad` borra de Storage los archivos recién subidos si el registro no se concreta (huérfanos), y ante "ya existe una conformidad pendiente" refresca para que el técnico vea la suya cargada. `components/incidentes/incidente-detail-modal.tsx`.
- **W5:** validación real de 10 MB + tipo (imagen/PDF) al seleccionar foto y comprobante (el cartel "máx. 10 MB" era decorativo).
- **CÓMO TESTEAR:** técnico con asignación pendiente intenta cargar inspección → bloqueado. Reportar incidente marcando 3 días con horario en 1 → submit bloqueado con detalle. Dos técnicos logueados a la vez → cada uno recibe solo sus notificaciones. Franja para esta noche a las 22:00 → no vence. Técnico se da de baja → el cliente recibe aviso. Archivo de 15 MB en conformidad → rechazado al instante.

## Grupo 7 — Menores (B11 + W8 + H1 + H4 + H5 + H6 + APP_URL) — ⏳

- **B11:** PDF imprimible R6/R7/R12 renombrado "Satisfacción" → "Calidad" (7 textos). `app/(imprimir)/exportar/imprimir/page.tsx`.
- **W8:** recuperación de contraseña — si el email falla DESPUÉS de cambiar la contraseña, el mensaje lo dice honestamente (reintentar genera otra). `features/auth/recuperar-password.service.ts`.
- **H1:** `notFound()` fuera del try que se auto-capturaba; errores reales ya no se degradan a 404. `app/inmueble/[id]/page.tsx`.
- **H4:** `requireAdminOrGestorId()` ya no devuelve `parseInt(UUID)` (NaN latente) — ahora es guard puro `Promise<void>`. `features/auth/auth.service.ts`.
- **H5:** guard de división por cero en el gráfico torta/donut del chat de Walter. `components/ai-help-chat.tsx`.
- **H6:** los 2 caminos de creación de incidente (form + Walter) verifican el resultado de `guardarFranjasDisponibilidad` y avisan si falló.
- **APP_URL** de emails desde `NEXT_PUBLIC_SITE_URL` con fallback. `features/email/email.service.ts`.

## Limpieza incidental
- La página admin de Pagos ya no lee la tabla legacy `pagos` (`getPagosForAdmin` sin callers vivos; el prop no se usaba).
- El timeline del incidente muestra cobros reales (`cobros_clientes` aliasado).

## Batería de tests corrida — TODO VERDE ✅

1. **`npm run test`** (unit, `tsx --test`, nuevos): 12/12 — `conformidadVigente()` (8 casos incluyendo rechazo+resubida, doble rechazo, orden aleatorio) + `hoyArgentina()` (4 casos incluyendo el instante 22:00 ART / 01:00 UTC).
2. **`npm run test:db`** (nuevo `tests/e2e-lifecycle-db.ts`, contra el esquema REAL con service key, cleanup completo): **20/20 checks** — ciclo de vida vigente completo + predicados de los fixes (2 filas de conformidad y vigente correcto, guard de baja, SP8 nuevo muestra deuda / SP8 viejo la ocultaba, 2 aprobados conviven, cobro parcial no finaliza, totalCobrado desde cobros_clientes, alias del timeline). Reemplaza al viejo `test_e2e_lifecycle.mjs` (eliminado — certificaba el ciclo obsoleto, hallazgo H3).
3. **`npx tsc --noEmit`** → 0 errores. **`npm run build`** → verde (33 rutas). **eslint** → sin errores nuevos (archivos nuevos limpios; la deuda `no-explicit-any` preexistente no cambió).
4. **Verificación en NAVEGADOR (Playwright sobre dev server + DB real):**
   - Login admin temporal → `/dashboard` ✓.
   - **W1 por la UI real:** "Nuevo Empleado" (rol gestor) → fila en `auth.users` Y `public.usuarios` verificadas por query ✓ → logout → **login del gestor recién creado → `/dashboard` sin loop de redirects** ✓.
   - `/dashboard/metricas` → tab Finanzas renderiza; verificación por query de que "Sin deuda pendiente" es correcto en el seed (331 aprobados exigibles, todos cobrados) — el predicado corre sin error.
   - Usuarios temporales eliminados al final (auth + tablas).

## ⚠️ Descubrimientos de la batería (importantes para la defensa)

1. **La DB de producción está DESFASADA de las migraciones del repo:**
   - `fue_resuelto` sigue siendo **INTEGER 0/1** (la migración `20260303200000` a BOOLEAN no está aplicada). El test E2E lo detectó y **cazó un bug en el propio fix de SP8** (`.eq(fue_resuelto, true)` fallaba) → corregido a `.eq(..., 1)`, válido en ambos tipos.
   - **El trigger legacy `AFTER INSERT` sigue VIVO en prod** (la migración `20260625000002` tampoco está aplicada): lo probó el alta del admin temporal (la fila apareció por trigger). Por eso W1 hoy es **latente**: explota el día que se apliquen las migraciones. El fix es seguro en AMBOS estados (chequea existencia antes de insertar) — verificado en vivo con el trigger activo.
   - **Decisión pendiente de Fausti:** sincronizar prod con las migraciones del repo (aplicarlas) o marcar las no-aplicadas como obsoletas. Mientras el desfase exista, cualquier query nueva debe ser compatible con ambos tipos (usar `1`/`0` para fue_resuelto).

## Herramientas de test que quedan en el repo
- `npm run test` → unit tests (`tests/unit/*.test.ts`).
- `npm run test:db` → E2E DB del ciclo vigente (`tests/e2e-lifecycle-db.ts`).
- `tests/e2e-usuario-admin-temporal.ts` → crear/borrar admin temporal para pruebas en navegador.
