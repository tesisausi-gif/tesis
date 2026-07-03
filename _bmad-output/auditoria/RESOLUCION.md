# Registro de resolución de hallazgos — Mantis

**Propósito:** trazar cada bug/hallazgo de la auditoría BMAD hasta su fix, commit, card de Trello y cómo verificarlo. Sirve para chequear después que esté todo OK. Complementa a [SINTESIS.md](SINTESIS.md) (hallazgos) y a los 4 informes por especialista.

**Alcance de esta tanda:** foco en **lógica de negocio y consistencia funcional** (decisión de Fausti: seguridad/RLS queda para después). Estado general: **10 commits locales sin pushear** (versión en armado). Todos pasan `npx tsc --noEmit` y llevan "CÓMO TESTEAR" en el mensaje del commit.

Leyenda estado: ⏳ implementado, falta prueba manual · ✅ probado OK · 🔵 decisión pendiente.

---

## Bugs resueltos (esta versión)

### 1. Cancelar/reasignar dejaba el incidente inconsistente — ⏳
- **Cards:** Trello #219, #230
- **Bug:** al cancelar (cliente/admin) o reasignar, quedaban residuos: turno ocupando el calendario del técnico, visitas activas y presupuestos "en vuelo" vivos → un incidente cancelado podía "revivir" y el nuevo técnico heredaba precio/inspección del anterior.
- **Solución:** rutina única `cerrarResiduosDeIncidente` (libera calendario, cancela visitas, anula inspecciones, cierra presupuestos) llamada en las 4 vías de cancelación/baja + guard de estado en `aceptarAsignacion` (un cancelado no revive; no hay doble aceptación).
- **Commit:** `c9a3631` · **Archivos:** `features/asignaciones/asignaciones.service.ts`
- **Verificar:** cancelar con técnico y presupuesto en vuelo → presupuesto rechazado, inspección anulada, visita cancelada, turno liberado. Reasignar → técnico nuevo limpio. Aceptar sobre incidente cancelado → falla.

### 2. El cliente veía el precio SIN la comisión de ISBA — ⏳
- **Card:** Trello #234
- **Bug:** al crear el presupuesto, al cliente le llegaba (email + portal "En revisión") el precio crudo del técnico; después veía otro con comisión → deducía el cargo de ISBA.
- **Solución:** `crearPresupuesto` notifica al ADMIN (no al cliente); el cliente solo ve el presupuesto desde `aprobado_admin` (con comisión). Filtros por estado en las 3 vistas del cliente.
- **Commit:** `b127c2a` · **Archivos:** `features/presupuestos/presupuestos.service.ts`, `app/(cliente)/cliente/presupuestos/page.tsx`, `components/cliente/presupuestos-cliente-list.tsx`
- **Verificar:** técnico carga presupuesto → cliente no recibe nada; admin aprueba con cargo → cliente ve un solo total con comisión.

### 3. El presupuesto adicional se pagaba al técnico pero no se cobraba al cliente — ⏳
- **Card:** Trello #235
- **Bug:** al cobrar el original, el incidente pasaba a `finalizado` y el adicional desaparecía de cobros (que pedía `en_proceso`) pero seguía en pagos → ISBA pagaba de más.
- **Solución:** `registrarCobroCliente` finaliza el incidente solo si no quedan presupuestos aprobados sin cobrar; `getPendientesCobroCliente` también contempla `finalizado`.
- **Commit:** `879a9d0` · **Archivos:** `features/pagos/cobros-clientes.service.ts`
- **Verificar:** original $10.000 + adicional $5.000; cobrar original → incidente NO finaliza y el adicional sigue cobrable; cobrar adicional → recién ahí finaliza.

### 4. Aprobar conformidad podía duplicar la calificación del técnico — ⏳
- **Card:** Trello #236
- **Bug:** sin idempotencia → doble click insertaba otra calificación y ensuciaba el promedio; sin asignación `completada` agarraba `asigs[0]` (técnico equivocado).
- **Solución:** aprobación idempotente (UPDATE condicional sobre `esta_firmada`); selección del técnico solo entre completada/en_curso/aceptada (sin fallback a asigs[0]).
- **Commit:** `a2dee28` · **Archivos:** `features/conformidades/conformidades.service.ts`
- **Verificar:** aprobar con 4★ → una sola calificación; repetir → falla sin duplicar. Incidente reasignado → califica al técnico actual.

### 5. Admin podía degradar/rechazar un presupuesto ya aprobado por el cliente — ⏳
- **Card:** Trello #237
- **Bug:** `aprobarPresupuesto`/`rechazarPresupuesto` (admin) no validaban estado → degradar un `aprobado` por el cliente o rechazar uno en curso devolviendo el incidente a `pendiente`.
- **Solución:** solo operan desde `enviado`/`aprobado_admin`, con UPDATE condicional (anti-carrera).
- **Commit:** `64d618b` · **Archivos:** `features/presupuestos/presupuestos.service.ts`
- **Verificar:** con presupuesto `aprobado` por cliente, reintentar aprobar/rechazar admin → falla, sin cambios.

### 6. Se podían asignar dos técnicos activos al mismo incidente — ⏳
- **Card:** Trello #238
- **Bug:** `crearAsignacion` solo bloqueaba si había una `pendiente`, no si ya había técnico `aceptada/en_curso/completada`.
- **Solución:** bloquea si el incidente ya tiene técnico en cualquiera de esos estados; para cambiar hay que dar de baja primero.
- **Commit:** `7211b78` · **Archivos:** `features/asignaciones/asignaciones.service.ts`
- **Verificar:** con técnico aceptado, intentar asignar otro → bloqueado; dar de baja y reasignar → OK.

### 7. El cliente NO califica al técnico (quitar el feature) — ⏳
- **Card:** Trello #239 (decisión tomada por Fausti: crítico)
- **Bug:** el cliente tenía widget + invitación para calificar pero siempre quedaba bloqueado (la nota la carga el admin en la conformidad; la tabla no distingue autor).
- **Solución:** eliminadas TODAS las referencias al cliente calificando (widget, tab "Calificar", funciones `crearCalificacion`/`existeCalificacionDelCliente`, invitación en notificación, bullet de landing).
- **Commit:** `f112ca4` · **Archivos:** `components/cliente/calificacion-tecnico.tsx` (borrado), `components/incidentes/incidente-detail-modal.tsx`, `features/calificaciones/calificaciones.service.ts`, `features/conformidades/conformidades.service.ts`, `components/landing/cta-section.tsx`
- **Verificar:** cliente en incidente resuelto → no hay tab/formulario para calificar; el admin sí califica al aprobar conformidad.

### 8. Renombre métrica "Satisfacción del Cliente" → "Calidad del Servicio" — ⏳
- **Card:** Trello #240
- **Bug:** como el cliente no califica, toda métrica llamada "satisfacción/calificación del cliente" era inexacta (la nota la asigna la inmobiliaria).
- **Solución:** renombrado en todos los textos visibles (Reportes, PPIs, Exportar). KPI-1 ISC → ICS "Índice de Calidad del Servicio", con narrativa reencuadrada. La métrica se conserva (alimenta ranking de asignación + reportes; el IRT usa conformidades sin rechazo, no la estrella).
- **Commit:** `0e40de1` · **Archivos:** `components/admin/reportes-content.client.tsx`, `components/admin/ppis-content.client.tsx`, `components/admin/exportar-content.client.tsx`, `features/exportar/exportar.service.ts`, `features/reportes/reportes.service.ts`, `features/reportes/metricas-ppis.service.ts`
- **Verificar:** Reportes/PPIs/Exportar muestran "Calidad del Servicio"/"ICS"; ningún texto atribuye la nota al cliente.

### 9. Al rechazar el cliente, el técnico no se enteraba ni se anulaba su inspección — ⏳
- **Card:** Trello #242
- **Bug:** cuando el cliente rechazaba (primer presupuesto o "otro técnico") solo se avisaba al admin; el técnico desvinculado no recibía notificación y su inspección quedaba viva.
- **Solución:** en ambos caminos de rechazo del cliente que desvinculan, se anula la inspección del técnico y se le notifica (coherente con el rechazo del admin).
- **Commit:** `6670545` · **Archivos:** `features/presupuestos/presupuestos.service.ts`
- **Verificar:** cliente rechaza → técnico recibe aviso + inspección anulada; reasignar → nuevo técnico limpio.

### 10. Coherencia de la PRESENTACIÓN con el sistema — ⏳
- **Cards:** relacionado con #239, #240
- **Bug:** la presentación mostraba al CLIENTE calificando (UC/HU-11/RF-09/bullet/actor cliente) y decía "satisfacción del cliente" + "tiempo real".
- **Solución:** UC "Calificar técnico" reatribuido a ADMINISTRADOR (nodo + línea de asociación + modales HU-11/RF-09); bullet del portal cliente reemplazado; RF-12 "calidad del servicio" y sin "tiempo real" (también en HU-01).
- **Commit:** `795410b` · **Archivos:** `presentacion/index.html`
- **Verificar:** actor Cliente no resalta "Calificar técnico"; el modal del UC dice ADMINISTRADOR; sin "tiempo real"/"satisfacción del cliente" en el archivo.
- **⚠️ Debe replicarse en el PDF** (delegado a un compañero): PDF y presentación deben quedar idénticos.

---

## Decisiones / pendientes

| # | Tema | Estado |
|---|------|--------|
| Trello #218 | Calendario decorativo (no valida fechas) | 🔵 Decisión: **flexibilidad documentada**, sin código. Preparar respuesta para el tribunal. |
| Trello #239 / #240 | PDF (sección 6.13.1.7 pág.148 "ISC" + HU-11/RF-09/UC) describe al cliente calificando | 🔵 Corrección del PDF **delegada a un compañero de tesis**. Debe quedar igual que código y presentación. |
| Trello #241 | Revisar TODAS las métricas/PPIs con BMAD (¿cuáles aportan valor?) | 🔵 Pendiente (post-defensa o cuando se pueda). |
| Interno | Renombrar identificadores de código (`satisfaccionCliente`, key `isc`) | Cosmético, junto con #241. |

## Limpieza de código muerto (chore) — ⏳
Verificado con `grep` exacto + `eslint` + `knip` (instalado como devDep, correr `npm run knip`). Todo con `tsc --noEmit` OK.
- **`e2722ad`** — Tab "Gestión" legacy del modal de incidente (estaba con `{false && ...}`, inalcanzable): ~153 líneas de JSX + funciones `guardarCambios`/`asignarTecnico` (duplicadas; la asignación real vive en `gestionar-pendiente-modal.tsx` y la calificación admin en `aprobarConformidad`) + imports/estados huérfanos. Cierra el hallazgo "actualizarIncidente permite regresiones" (la única UI que pasaba `estado_actual` era esta, muerta).
- **`798d23d`** — feature `features/calificaciones/` (service+types) muerta tras quitar la calificación del cliente. La tabla `calificaciones` sigue viva. + instalado `knip`.
- **`000520c`** — 4 componentes sin uso (`ui/form.tsx`, `ui/calendar.tsx`, `shared/foto-uploader`, `tecnico/notificaciones-card`) + deps `react-hook-form`, `@hookform/resolvers`.
- **`e2dd6db`** — deps prod sin uso: `@radix-ui/react-avatar`, `resend`, `@supabase/auth-helpers-nextjs`.
- **NO tocado (falso positivo):** `public/sw.js` (se registra dinámicamente).
- **Pendiente de confirmación de Fausti (parecen features intencionales no cableadas):** `components/admin/aprobar-presupuestos-content.client.tsx`, `components/tecnico/cambiar-password-primer-acceso.client.tsx`.
- **`5d7bf6e`** — 3 funciones de service muertas (0 usos verificado incluyendo llamadas internas, superseded): `enviarPresupuesto` (→ crearPresupuesto ya crea en 'enviado'), `crearConformidad` (→ crearConformidadPorTecnico), `firmarConformidad` (legacy). + import huérfano CreateConformidadDTO. Verificado con `next build` OK.

**Método de verificación reforzado (crítico, pedido de Fausti):** NO guiarse solo por knip (marca "export sin usar" aunque se use internamente — ej. `getPresupuesto` tiene 4 usos internos). Por cada candidato: grep exacto de usos reales (import externo + llamada interna) = 0, chequear intención (si hay duda, NO borrar), y `tsc --noEmit` + `next build` como compuerta final. **Todo lo borrado se probó con build exitoso → no rompió nada.**

- **PENDIENTE DE DECISIÓN de Fausti (verificado 0 usos, pero payment-related y sensible):** 6 funciones CRUD genéricas en `features/pagos/pagos.service.ts` (getPago, crearPago, actualizarPago, eliminarPago, getPagosDelPresupuesto, getPagosDelCliente) — superseded por `registrarPagoTecnico`/`registrarCobroCliente`. `getPagosForAdmin` del mismo archivo SÍ se usa (no tocar). No las borré por prudencia (tema pagos).
- **KEPT por duda de intención (NO borrar):** `calificarIncidenteAdmin` (0 usos pero puede ser feature admin intencional), `getIncidenteById`, y los 2 archivos (`aprobar-presupuestos-content`, `cambiar-password-primer-acceso` técnico).
- **Pendiente (grande, bajo valor):** resto de exports/tipos/enum members que marca knip → muchos son falsos positivos (uso interno). Revisar por feature solo si sobra tiempo. + 5 estados "fetch cargado-pero-no-leído" en incidente-detail-modal (sacarlos toca lógica de fetch).

## Candidatos aún sin abordar (menor severidad, lógica de negocio)
- ~~`actualizarIncidente` permite regresiones de estado~~ → resuelto al borrar la UI muerta (commit `e2722ad`); la función server aún aceptaría `estado_actual` pero ningún caller vivo lo usa.
- Orden pago/cobro del técnico (pago posible antes del cobro; sin recordatorio de cobro pendiente).
- Validación de que la suma del presupuesto sea coherente.

## Fuera de alcance de esta tanda (seguridad — despriorizado por Fausti)
Los hallazgos del informe [arquitectura-seguridad.md](arquitectura-seguridad.md) (guards de autorización faltantes, `createAdminClient` que bypassa RLS, Walter confiando en el `rol` del cliente, bucket de documentos público, IDOR de lectura) **no** se tocaron en esta tanda. Quedan documentados ahí para retomar.
