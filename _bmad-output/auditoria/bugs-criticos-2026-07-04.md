# Cacería de bugs críticos — 2026-07-04

**Método:** 4 especialistas BMAD en paralelo (2 Edge Case Hunters + 2 Cynical Reviews) guiados por el diagrama de secuencia de Fausti ("Diagrama sin título", draw.io) + **verificación manual posterior de cada hallazgo leyendo el código** (regla: solo se reporta lo demostrado con la cadena causal completa). Excluye seguridad (ya en [arquitectura-seguridad.md](arquitectura-seguridad.md)) y lo resuelto en [RESOLUCION.md](RESOLUCION.md).

Leyenda: ✅ verificado por mí en el código · ⚠️ requiere verificación en DB (SQL provisto) · ❌ refutado.

---

## Veredicto de las anotaciones del diagrama

| # | Anotación de Fausti | Veredicto |
|---|--------------------|-----------|
| 1 | Reportar incidente sin franja para TODOS los días seleccionados | ✅ CONFIRMADA (bug B7). Walter en cambio SÍ valida cada franja (inconsistencia solo del form manual) |
| 2a | La asignación figura en el calendario del técnico sin aceptarla | ✅ Confirmada a medias: `getFranjasAgendaTecnico` incluye asignaciones `pendiente` y muestra la disponibilidad del cliente en "Mi Agenda", pero con badge "Pend. respuesta" (UX, menor) |
| 2b | Con >1 asignación solo se ve la última (se pisan) | ❌ REFUTADA con evidencia: bandeja y agenda indexan por `id_incidente`/`id_asignacion`, sin upsert ni UNIQUE por técnico; se listan todas |
| 3 | El técnico no elige día de inspección al aceptar | ✅ CONFIRMADA y peor (bug B6): puede cargar la inspección sin coordinar visita, e incluso sin haber aceptado |
| 4 | Notificación realtime al cliente cuando el técnico acepta con fecha | Las notificaciones existen y son correctas (aceptación en `aceptarAsignacion:230-241`; la fecha llega después vía `proponerVisita:122-155` por diseño). El problema es que el realtime del inbox está roto/es riesgoso → B5 + P1/P2 |
| 0 | Eliminar Workflow (redundante con timeline) | Decisión de producto, fuera de alcance de bugs |
| — | "Evalúa presupuesto (SOLO VE EL TOTAL SIN DISCREPANCIAS DE LOS ÍTEMS)" | ✅ CONFIRMADO como comportamiento actual: la card de aprobación muestra solo `costo_total` (`presupuestos-cliente-list.tsx:168`); el desglose Materiales / Mano de obra (con comisión ya fundida en mano de obra, seguro post-#234) existe (`desglosarPresupuesto:131-137`) pero solo se muestra dentro del diálogo de RECHAZO (`:261-287`). Mover ese mismo desglose a la card de aprobación es mejora de diseño, no bug |
| — | "Hasta este momento el cliente puede cambiar disponibilidad" / "puede negociar de nuevo" | ✅ Las ventanas del diagrama coinciden con la UI: `puedeAutogestionar = pendiente \|\| asignacion_solicitada` (`incidentes-content.client.tsx:325`) y re-negociación vía banner de disponibilidad vencida (`:395`). El service `guardarFranjasDisponibilidad` no valida estado (cualquier caller puede reescribir franjas siempre), pero eso cae en el bucket de guards/seguridad ya documentado |

**Nota sobre 2b ("se pisan"):** re-verificado también en la UI además de los services — `AgendaContent` acumula por fecha en arrays (`porFecha[f.fecha].push(f)`, `agenda-tecnico.client.tsx:164-167`) y `getFranjasAgendaTecnico` mapea por `id_incidente` sin sobrescribir. La observación era real pero de una versión anterior (el diagrama la describe en pasado); en el código actual no se reproduce.

---

## Bugs CRÍTICOS confirmados

### B1 — Rechazar una conformidad y que el técnico resuba rompe el modal de detalle ✅
- **Causa:** `rechazarConformidad` conserva la fila (`esta_rechazada=true`, `conformidades.service.ts:382-389`); `crearConformidadPorTecnico` inserta una fila NUEVA (solo chequea `esta_rechazada=false`, `:141-146`); no hay UNIQUE sobre `id_incidente` (migración `20260225100000`). Quedan 2 filas → `getConformidadDelIncidente` usa `.maybeSingle()` sin filtro (`:25-29`) → error PGRST116 → el `Promise.all` de `cargarIncidente` se rechaza entero y el `catch` solo loguea (`incidente-detail-modal.tsx:619-651`).
- **Efecto:** inspecciones, presupuestos, conformidad, franjas y visitas quedan vacíos en el modal. El admin ve "No hay conformidad subida aún" (no puede aprobar la resubida); el técnico ve el form de carga pero al enviar recibe "Ya existe una conformidad pendiente". **El camino de recuperación del sub-estado `conformidad_rechazada` está roto.**
- **Fix:** filtrar la vigente en `getConformidadDelIncidente` (`.eq('esta_rechazada', false).order('fecha_creacion', {ascending:false}).limit(1).maybeSingle()`).

### B2 — Tras un rechazo de conformidad, el badge admin queda clavado y no se puede dar de baja al técnico ✅
- **Causa A:** `getAccionPendiente` evalúa `conformidades.find(c => c.esta_rechazada)` ANTES que la pendiente (`incidentes-content.client.tsx:92-99`) y `INCIDENTE_SELECT` trae todas las conformidades sin filtro → la fila histórica rechazada gana para siempre; badge "Conf. rechaz." `disabled: true` aunque el técnico haya resubido.
- **Causa B:** `darDeBajaIncidente` bloquea si existe CUALQUIER conformidad con `url_documento` (`asignaciones.service.ts:727-735`), incluida la rechazada → tras un rechazo, si el técnico se desentiende, el admin no tiene ninguna vía para desvincularlo.
- **Fix:** en ambos lugares excluir `esta_rechazada=true` cuando exista una conformidad más nueva no rechazada / al evaluar el guard de baja.

### B3 — Tab "Pagos" vacío para cliente y técnico cuando hay presupuesto original + adicional aprobados ✅
- **Causa:** `getMisPagosDeIncidente` (`cobros-clientes.service.ts:400-411`) y `getMisPagosTecnicoDeIncidente` (`pagos-tecnicos.service.ts:416-423`) usan `.eq('estado_presupuesto','aprobado').maybeSingle()`. Con 2 aprobados (escenario legítimo desde el fix #235) `data` viene null → `return { pendiente: null, realizados: [] }`.
- **Efecto:** el tab Pagos del incidente muestra vacío total: ni deuda pendiente ni historial de lo ya cobrado/pagado. Regresión directa habilitada por el fix de adicionales.
- **Fix:** leer lista (sin `maybeSingle`) y armar pendientes/realizados por presupuesto.

### B4 — El PPI SP8 "Deuda Pendiente de Cobro" no puede mostrar deuda jamás ✅
- **Causa:** `getSp8Data` filtra `estado_presupuesto='aprobado'` + `estado_actual IN ('finalizado','resuelto')` (`metricas-ppis.service.ts:~1097`). Pero el ÚNICO camino a `finalizado` (`registrarCobroCliente:217-221`) exige que no quede ningún aprobado sin cobrar. La deuda real vive en `en_proceso` (sub-estado `pendiente_pago`) → conjunto vacío por construcción. El panel muestra siempre "✓ Sin deuda pendiente". Era el riesgo de demo A de la auditoría anterior; sigue sin corregirse.
- **Fix:** replicar el filtro ya corregido en `getPendientesCobroCliente` (`.in(..., ['en_proceso','finalizado'])`, `cobros-clientes.service.ts:63-66`).

### B5 — Ingresos en $0 / contradictorios: 6 superficies de reportes leen la tabla `pagos`, que ya no escribe nadie ✅
- **Causa:** el flujo real escribe en `cobros_clientes` (`:182`) y `pagos_tecnicos` (`:209`). La única pantalla que insertaba en `pagos` (`app/(admin)/dashboard/pagos/nuevo/`) está huérfana (0 links, verificado por grep). Leen de `pagos`: `getEstadoFinanciero` (`reportes.service.ts:237`) y `exportar.service.ts:105, 494 (R4), 1069 (R10), 1162 (R11), 1224 (R12)`.
- **Efecto:** "Estado Financiero" y los reportes R4/R10/R11/R12 muestran ingresos $0 (o resto histórico), mientras R5/R13 del mismo módulo (que usan las tablas correctas) muestran los montos reales → cifras contradictorias en la misma pantalla de exportación. Letal para la demo.
- **Fix:** migrar esas 6 lecturas a `cobros_clientes`/`pagos_tecnicos` como ya hacen R5/R13.

### B6 — El técnico puede cargar la inspección sin visita coordinada y con la asignación aún sin aceptar ✅
- **Causa:** el modal se abre con `rol="tecnico"` desde la bandeja de pendientes (`disponibles-content.client.tsx:424`); `hasTecnicoTabs` solo excluye `rechazada` (`incidente-detail-modal.tsx:1429`) → con asignación `pendiente` las tabs quedan operativas; `crearInspeccion` solo bloquea si hay presupuesto activo — no exige visita completada ni asignación aceptada — y setea `fecha_inspeccion = new Date()` del submit (`inspecciones.service.ts:96-134`).
- **Efecto:** inspección cargada con el incidente todavía en `asignacion_solicitada` (estado que ningún flujo posterior espera) y "fecha de inspección" que documenta cuándo se tipeó, no cuándo/si hubo visita. Confirma y agrava la anotación 3 del diagrama.
- **Fix:** guard en `crearInspeccion` (asignación `aceptada`/`en_curso` del técnico) + gating de tabs por estado.

### B7 — Reportar incidente: días seleccionados sin franja horaria se descartan en silencio ✅ (anotación 1 del diagrama)
- **Causa:** el submit valida solo `franjasConSlot.length === 0` (`app/(cliente)/cliente/incidentes/nuevo/page.tsx:168-178`); `emitChange` solo emite días con slots (`calendario-disponibilidad.tsx:385-394`) → un día marcado sin horario no viaja al servidor.
- **Efecto:** el cliente cree que ofreció 3 días y el sistema registró 1. Walter, en cambio, exige `fecha+hora_inicio+hora_fin` por franja con JSON Schema (`walter.service.ts:604-628`) — la validación dura existe solo en un camino.
- **Fix:** bloquear submit si algún día seleccionado no tiene franja (o quitarlo explícitamente con aviso).

### B8 — Inbox realtime: el filtro es por rol, no por destinatario → notificaciones cruzadas entre usuarios ✅ (código) / ⚠️ (manifestación)
- **Causa:** `notificaciones-panel.client.tsx:310-326` — canal `postgres_changes` sin `filter`, y el chequeo es `nueva.id_tecnico != null` / `nueva.id_cliente != null` (cualquier técnico/cliente), nunca compara con el usuario logueado. La carga SSR sí filtra bien; el bug es exclusivo del camino realtime.
- **Efecto:** si los eventos llegan (ver P1), todo técnico conectado ve en vivo las notificaciones de cualquier otro técnico (con datos del incidente ajeno), ídem clientes.
- **Fix:** pasar `idTecnico`/`idCliente` como prop + `filter: 'id_tecnico=eq.N'` en la suscripción.

---

## Bugs MEDIO-ALTOS confirmados

### B9 — Vencimientos con fecha UTC: disponibilidad y visitas caducan hasta 3 h antes, todos los días ✅
`procesarDisponibilidadVencida` (`disponibilidad.service.ts:275`) y `processarVisitasVencidas` (`visitas.service.ts:292`) usan `new Date().toISOString().slice(0,10)` (fecha UTC) contra fechas guardadas en fecha calendario argentina. Entre las 21:00 y las 00:00 ART el server ya está en "mañana": franjas de esa misma noche se marcan vencidas (aviso falso "ningún técnico pudo visitarte") y visitas propuestas para esa noche se cancelan por "no confirmada a tiempo". **Fix:** calcular "hoy" en `America/Argentina/Buenos_Aires`.

### B10 — El técnico se da de baja y el cliente no se entera ✅
`cancelarAsignacionAceptada` solo notifica al admin; `darDeBajaIncidente` (misma consecuencia iniciada por admin) sí notifica al cliente (`asignaciones.service.ts:799-807`). El incidente del cliente "retrocede" a pendiente sin explicación. **Fix:** replicar el bloque de notificación al cliente.

### B11 — El PDF imprimible dice "Satisfacción" donde la pantalla dice "Calidad" ✅
`app/(imprimir)/exportar/imprimir/page.tsx:159,161,169,173,242,244,248` quedó afuera del renombre del commit `0e40de1`. El mismo botón que en pantalla dice "Calidad" genera un PDF "Satisfacción Mantis". Reintroduce en papel el problema de fondo (el cliente no califica). **Fix:** renombrar las 7 ocurrencias.

### B12 — El gráfico WIP no clasifica `pendiente_pago` ✅
`getWipData` no trae `fue_resuelto` en el select (`metricas-ppis.service.ts:442-451`) → incidentes terminados esperando cobro caen en "Trabajo en ejecución" (responsable: Técnico), ocultando cuellos de botella administrativos. **Fix:** select `fue_resuelto` + etapa "Esperando cobro".

### B13 — Toast del admin "Cliente aprobó un presupuesto" puede dispararse en falso ✅ (código) / ⚠️ (depende de replica identity)
`realtime-notificaciones.client.tsx:18-31` compara `payload.old.estado_presupuesto`; con `REPLICA IDENTITY DEFAULT`, `old` solo trae la PK → `prev?.estado_presupuesto` es `undefined` → la condición da true en CUALQUIER update de un presupuesto ya aprobado.

---

## ⚠️ Pendiente de verificación en DB (token de Supabase vencido — renovar PAT)

El PAT `sbp_8952…` (perfil `tesis`) fue rechazado por la Management API ("Unauthorized"). Renovar en supabase.com → Account → Access Tokens, actualizar `~/.claude/mcp-profiles/tesis.json` + `mem`/`mcp_tokens.md`, re-correr `mcp-switch tesis` y reiniciar Claude Code. Luego ejecutar:

```sql
-- P1: ¿'notificaciones' está en la publication? Si NO está, el inbox realtime NUNCA recibe eventos
--     (explicación más directa del "error de notificación crítica al inbox"). Si SÍ está, B8 es el bug activo.
select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename;

-- P2: replica identity de 'presupuestos' (para B13) y RLS real de 'notificaciones'
select c.relname, case c.relreplident when 'd' then 'DEFAULT' when 'f' then 'FULL' when 'n' then 'NOTHING' when 'i' then 'INDEX' end as replica_identity, c.relrowsecurity as rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relname in ('notificaciones','presupuestos');
```

Si `notificaciones` no está en la publication: `alter publication supabase_realtime add table notificaciones;` (y entonces corregir B8 ANTES de habilitarla, para no activar el leak).

---

## Refutado / degradado en verificación (no reportar como bug)

- **"Las asignaciones se pisan en el calendario" (anotación 2b):** refutado — sin upsert ni clave única; todas se listan.
- **Asimetría `finalizado` en `getMisCobrosComoCliente` (`:343`):** el escenario no es alcanzable de forma demostrable — `aprobarPresupuestoCliente:548` devuelve el incidente a `en_proceso` al aprobar un adicional, con lo cual el filtro del cliente lo vuelve a ver. Alinearlo con el filtro admin (`['en_proceso','finalizado']`) queda como **consistencia preventiva**, no como bug confirmado.

## Análisis de impacto y criterio — bug vs. lógica de negocio (pedido de Fausti 2026-07-04)

Regla aplicada: antes de fixear, (a) veredicto explícito de si es bug o decisión de negocio defendible, (b) radio de impacto del fix, (c) qué hay que decidir primero.

### Grupo 1 — Bugs inequívocos, fix contenido y seguro

| Bug | Fix | Impacto del fix | Riesgo |
|-----|-----|----------------|--------|
| **B1** modal roto tras rechazo+resubida | Definir "conformidad vigente" = última NO rechazada si existe, si no la última rechazada (así el sub-estado `conformidad_rechazada` sigue funcionando pre-resubida). **No** filtrar a secas `esta_rechazada=false`: rompería el badge del técnico | `getConformidadDelIncidente` tiene UN solo caller (el modal). Pero la misma semántica debe aplicarse en los otros 4 lugares que eligen entre múltiples filas (ver B2) → conviene helper canónico compartido | Bajo |
| **B2-badge** admin clavado en "Conf. rechazada" | Mismo helper "vigente" en `getAccionPendiente` — respaldado por CLAUDE.md §5.5 (tras resubida debe volver a `completada_pendiente`). **Alcance ampliado verificado:** el lado técnico (`trabajos/page.tsx:44-47`) arma el mapa con last-wins SIN order → indeterminado con 2 filas; y `getWipData` también trae `conformidades` sin criterio. 5 puntos en total | Medio (5 archivos, misma regla) | Bajo si se centraliza |
| **B8** realtime filtra por rol | Prop `idTecnico`/`idCliente` + `filter:` en el canal | Un componente. **Prerequisito:** P1 (publication) — si hoy los eventos no llegan, arreglar el filtro ANTES de habilitar la publication, no después | Bajo |
| **B9** UTC vence 3h antes | Helper "hoy en America/Argentina/Buenos_Aires" + grep de TODOS los `toISOString().slice(0,10)` para aplicar el mismo criterio (hay más usos: p.ej. `incidentes-content.client.tsx:327`) | Transversal pero mecánico | Bajo |
| **B11** PDF "Satisfacción" | Renombrar 7 strings en `imprimir/page.tsx` | Solo texto | Nulo |
| **B13** toast falso positivo | No depender de `payload.old`: reaccionar solo a `next.estado==='aprobado'` + dedup por `id_presupuesto` visto, o refetch | Un componente | Bajo |

### Grupo 2 — Bug real pero el fix cambia contratos: diseñar antes de tocar

| Bug | Por qué no es swap directo |
|-----|---------------------------|
| **B3** tab Pagos vacío | El shape `{pendiente: T\|null}` asume UN pendiente. Fix mínimo (elegir el más reciente sin cobrar) muestra 1 de 2 deudas → mentira parcial. Fix correcto: `{pendientes: T[]}` → toca types + UI del tab en cliente Y técnico. Decidir shape antes de codear |
| **B5** reportes leen `pagos` | NO reemplazar a ciegas: por superficie hay que decidir la tabla semánticamente correcta — "ingresos" = `cobros_clientes.monto_cobro`; "costo/egreso" = `pagos_tecnicos.monto_pago`. `getEstadoFinanciero.distribucionPagos` agrupa por `tipo_pago`, que en las tablas nuevas es `metodo_pago` (labels de UI cambian). R4 "Costo total": ¿costo para ISBA (pagos a técnicos) o facturación (cobros)? Definir columna por reporte ANTES del fix |

### Grupo 3 — Zona gris: decisión de negocio de Fausti ANTES de cualquier fix

| Hallazgo | La decisión a tomar |
|----------|--------------------|
| **B2-baja** no se puede dar de baja al técnico tras conformidad rechazada | ¿Debe poder? La conformidad (aunque rechazada) prueba que el trabajo se HIZO — dar de baja implica reasignar un trabajo terminado y decidir si al técnico saliente se le paga. Opciones: (a) permitir baja solo si la única conformidad está rechazada y no hubo resubida; (b) mantener bloqueo y agregar recordatorio/reclamo de resubida. **No es un fix de una línea: es política de ISBA** |
| **B4** SP8 deuda siempre 0 | El "cero estructural" ES bug. Pero el fix depende de la definición de "deuda" del PPI en el documento de tesis: ¿deuda EXIGIBLE (trabajo terminado esperando cobro → filtrar `fue_resuelto=true`) o todo aprobado sin cobrar (incluye trabajos en ejecución → copiar filtro operativo)? Revisar la definición de SP8 en el PDF y alinear código+documento |
| **B6-visita** inspección sin visita coordinada | Puede ampararse en el criterio académico ya documentado en el diagrama ("no se validarán las fechas para avanzar") → defendible como flexibilidad operativa. **B6-pendiente** (inspección con asignación sin aceptar) NO es defendible: rompe la premisa de la máquina de estados → ese sí fixear (guard en `crearInspeccion`: asignación `aceptada`/`en_curso`; ningún flujo legítimo lo alcanza, riesgo bajo) |
| **B7** días sin franja descartados | La decisión ya está tomada por Fausti en el diagrama ("NO PERMITIR"). Definir UX del fix: bloquear submit con error claro vs. des-seleccionar el día automáticamente con aviso |
| **B10** baja de técnico sin avisar al cliente | ¿ISBA quiere avisar al cliente inmediatamente, o prefiere comunicar recién al reasignar (no alarmar)? El camino admin sí avisa → por consistencia probablemente sí, pero es tono de comunicación del negocio |
| **B12** WIP sin etapa "esperando cobro" | Agregar la etapa cambia un gráfico que puede estar definido con etapas fijas en el documento de tesis. Verificar la definición del PPI en el PDF antes; si se agrega, actualizar también la doc |

---

## SEGUNDA OLA (zonas no cubiertas por la 1ª) — verificada a mano igual que la primera

### W1 — CRÍTICO MÁXIMO — Toda alta administrativa de usuarios está rota: `crearEmpleado` y `aprobarSolicitudTecnico` nunca crean la fila en `public.usuarios` ✅
- **Causa raíz:** la migración `20260625000002_trigger_on_email_confirmed.sql` **eliminó** el trigger `on_auth_user_created` (AFTER INSERT) y lo reemplazó por `on_auth_user_email_confirmed` (AFTER **UPDATE**, solo cuando `email_confirmed_at` pasa de NULL a valor). Pero `admin.createUser({email_confirm: true})` inserta la fila YA confirmada — un solo INSERT, ningún UPDATE → **ningún trigger dispara**. El propio comentario de `aprobarSolicitudTecnico:543-544` ("Rol 'gestor' para que el trigger solo inserte en `usuarios`") delata que el código fue escrito para el trigger viejo.
- **Cadena verificada:** `crearEmpleado` (`usuarios.service.ts:766-823`) SOLO llama a `createUser` — cero inserts propios. `aprobarSolicitudTecnico` (`:523-626`) inserta `tecnicos` a mano pero el paso 4 hace `UPDATE usuarios ... eq(id)` sobre una fila inexistente — sin `.select()`, 0 filas afectadas no produce error → marca la solicitud aprobada y manda el email con credenciales. El usuario loguea OK en Auth, pero `middleware.ts:41-49` obtiene `userRole=null` → `/dashboard` lo echa a `/login` (`:112-113`) y `/login` lo manda a `/dashboard` (`:127`) → **loop infinito de redirects, demostrable en vivo**.
- **Veredicto:** bug inequívoco (regresión de la migración del 25/6; el flujo de auto-registro con verificación de email sí funciona porque `verifyOtp` produce el UPDATE).
- **Impacto del fix:** insertar explícitamente en `public.usuarios` (+`clientes` para rol cliente) dentro de `crearEmpleado`, y en `aprobarSolicitudTecnico` insertar `usuarios` en vez de updatear (o verificar filas afectadas con `.select()`). Compensación ya existente (deleteUser) se mantiene. ⚠️ Confirmar con el token nuevo que la migración esté aplicada en prod (si no lo está, el bug no se manifiesta aún pero explotará al aplicarla). **Además: reparar los usuarios ya creados rotos** (query: filas de `auth.users` sin par en `public.usuarios`).

### W2 — CRÍTICO — Walter le muestra al cliente el precio SIN comisión (reabre #234 por otra vía) ✅
`executeConsultarEstado` (`walter.service.ts:657-682`) trae TODOS los `presupuestos(estado_presupuesto, costo_total)` sin filtro y los devuelve como JSON crudo al modelo (`:713`), también para rol cliente. Un presupuesto en `enviado` tiene el costo crudo del técnico; la página real del cliente filtra `['aprobado_admin','aprobado','rechazado']` — Walter no. **Veredicto:** bug inequívoco (contradice la regla de negocio que el propio `crearPresupuesto` documenta). **Fix contenido:** para rol cliente, excluir `borrador`/`enviado` (o no traer `costo_total` hasta `aprobado_admin`). Riesgo bajo.

### W3 — CRÍTICO — Walter admin `consultar_pagos_cobros` lee la tabla `pagos` huérfana ✅
`walter.service.ts:1039,1044` — 7ª superficie del mismo defecto de B5: el asistente respondería "no se registraron cobros" con cobros reales en `cobros_clientes`. **Tratamiento:** sumarlo al mapeo semántico del Grupo 2-B5 (mismo diseño de fix, misma tanda).

### W4 — IMPORTANTE — Conformidades: archivos huérfanos en Storage + técnico ciego tras reintento ✅
`handleSubirConformidad` (`incidente-detail-modal.tsx:1172-1214`): sube 2 archivos y recién después inserta; verificado que **no existe ningún `.remove(` en todo el modal**. Si el insert responde "ya existe pendiente" (típico reintento tras timeout: el 1er intento SÍ creó la conformidad pero el técnico nunca vio la confirmación), los 2 archivos recién subidos quedan huérfanos en el bucket y el técnico sigue viendo el formulario — puede reintentar infinitas veces generando basura. **Fix contenido:** `remove()` en los returns de error + al recibir "ya existe", refrescar (`cargarIncidente()`) para que vea su conformidad ya cargada.

### W5 — MEDIO — El "máx. 10 MB" de la UI de conformidad no se valida en ningún lado ✅
Verificado: cero chequeos de `file.size`/`file.type` en el modal; el flujo sube directo del browser a Storage sin pasar por la validación server-side que SÍ tiene `documentos.service.ts`. **Fix trivial** en los dos `onChange`.

### W6 — MEDIO — Walter filtra técnicos por especialidad usando solo el campo singular ✅
`walter.service.ts:866-874` compara contra `especialidad` (que es solo `especialidades[0]`); el patrón canónico del sistema (`TecnicosTab.tsx`, en 4 lugares) usa el array con fallback. Un técnico con `['Plomería','Electricidad']` no aparece al pedir electricistas. **Fix contenido:** replicar el patrón del array.

### W7 — MEDIO — Walter `consultar_incidentes_aging` cuenta cancelados como "atrasados" ✅
`walter.service.ts:1469-1473` solo excluye `finalizado`; el patrón canónico (`metricas-ppis.service.ts:1782`) excluye también `cancelado` y `resuelto`. **Fix de una línea.**

### W8 — IMPORTANTE (decisión de diseño) — Recuperar contraseña: la cambia ANTES de garantizar el envío del email ✅
`recuperar-password.service.ts`: paso 3 pisa la contraseña real en `auth.users`, paso 5 envía el email sin try/catch propio — si el envío falla, el usuario ve "Error inesperado, intentá de nuevo" pero su contraseña vieja **ya no sirve** y la nueva nunca le llegó. Se autocorrige si reintenta y el email sale; se bloquea si el problema de SMTP persiste. **Decisión:** fix mínimo (try/catch propio + mensaje honesto "se generó pero no pudimos enviarla, contactá al admin") vs. rediseño (cambiar la contraseña solo tras envío exitoso). Recomiendo el mínimo para la defensa.

### W9 — MENOR — `rechazarSolicitud` sin guard de estado previo ✅
`usuarios.service.ts:504-521` — mismo patrón ya corregido en presupuestos (#237): falta `.eq('estado_solicitud','pendiente')`. Fix de una línea; manifestación requiere UI stale/carrera.

### Reclasificados / menores de la ola 2
- **Usuario desactivado sigue operando hasta expirar su JWT (~1h):** confirmado (`esta_activo` no se chequea en ningún guard ni en el middleware; `cerrarSesionesUsuario` solo revoca refresh tokens) — **reclasificado al backlog de SEGURIDAD** (bucket excluido/post-defensa, junto con los guards de arquitectura-seguridad.md, porque el fix correcto es el mismo wrapper de autorización).
- **Overlay `CambiarPasswordPrimerAcceso` (cliente):** desincronizado (solo actualiza metadata, no la columna que lee el middleware) e **inalcanzable** hoy — código muerto con bug latente; limpieza.
- **Overlay técnico `cambiar-password-primer-acceso`:** confirmado huérfano (0 imports) — cierra el pendiente de RESOLUCION.md; `/cambiar-password` genérica ya cubre el caso.
- **`/reset-password`:** página huérfana — nadie la linkea y el evento que la destraba nunca se dispara (spinner infinito si se entra directo); borrar o cablear.
- **`APP_URL` hardcodeado** en `email.service.ts:5` en vez de `NEXT_PUBLIC_SITE_URL`; menor.

### Verificación transversal por herramientas (ola 2, 4º agente)
- **Baseline sano:** `tsc --noEmit` 0 errores · `next build` verde (33 rutas) · eslint: 370 errores pero ~345 son `no-explicit-any` (deuda de tipado, no funcional).
- **H3 (medio):** `test_e2e_lifecycle.mjs` certifica el ciclo de vida VIEJO (inserta en tabla `pagos` muerta, cierra con `estado 'resuelto'` que ya nadie escribe, cobra antes de la conformidad) — da verde sin ejecutar ni una línea de la app. Falsa confianza de regresión → se reescribe.
- **H4 (latente):** `requireAdminOrGestorId()` retorna `parseInt(UUID)` = NaN/basura; los 30+ callers lo descartan (guard puro) así que hoy es inocuo — fix de firma antes de que alguien use el valor.
- **H1 (bajo):** `app/inmueble/[id]/page.tsx` — `notFound()` dentro de un try que lo captura a sí mismo; 404 legítimos se loguean como errores.
- **H6 (bajo):** los 2 caminos de creación de incidente (form + Walter) descartan el `ActionResult` de `guardarFranjasDisponibilidad` — si falla, incidente sin disponibilidad y mensaje de éxito.
- **H5 (cosmético):** gráficos del chat de Walter dividen por `total`/`max` sin guard → "NaN%" con datos todo-cero.
- **H2 (deuda):** 6 componentes con bailouts del React Compiler (sin efecto runtime hoy).
- Patrones peligrosos barridos y LIMPIOS: ~75 `.single()` verificados uno a uno, `JSON.parse` (3, todos con try), `parseInt` de formularios, divisiones por cero en services, `toFixed`, promesas flotantes.

### Verificado SIN problemas en la ola 2 (cobertura)
`crear_incidente` de Walter = idéntico al form manual (campo a campo); manejo de errores del stream de Walter no cuelga conversaciones; links de Walter todos a rutas existentes; colisiones de nombres de archivo (timestamp+random, `upsert:false`); no hay DELETE físico de incidentes/inmuebles (no hay huérfanos por borrado); adjunto de imagen a Walter re-comprime bien; guards `require*()` derivan identidad del servidor; recuperación busca email case-insensitive; verificación de email del cliente OK; validaciones de alta de inmuebles OK.

### Orden de ataque revisado

1. **Decisiones de Fausti** (Grupo 3): B2-baja, B4-definición, B6-visita, B10, B12 — 10 minutos de decisiones destraban todo.
2. **Diseño corto** (Grupo 2): shape de B3 + mapeo tabla-por-reporte de B5.
3. **Fixes contenidos** (Grupo 1): B1+B2-badge (helper "vigente" compartido), B6-pendiente, B7, B9, B11, B13.
4. **Token Supabase** → P1/P2 → B8 (filtro primero, publication después).
