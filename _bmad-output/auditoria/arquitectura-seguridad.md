# Auditoría de Arquitectura y Seguridad — Sistema Mantis

**Revisor:** Winston (System Architect, BMAD) — método de revisión adversarial/cínica
**Fecha:** 2026-07-03
**Alcance:** autorización en Server Actions, uso de `createAdminClient()`, RLS, Walter (IA), arquitectura feature-based, Storage.
**Método:** cada hallazgo verificado releyendo el código; se cita `archivo:línea`. Se distingue entre huecos reales y anti-patrones contenidos por RLS.

---

## 1. Resumen ejecutivo

El modelo de seguridad declarado es **"cada Server Action llama a `require*()` + RLS en la base"**. La auditoría encuentra que ese modelo **está roto de forma sistémica**, por dos razones que se combinan:

1. **La aplicación bypassea RLS casi en todos lados.** La abrumadora mayoría de las funciones usan `createAdminClient()` (clave `service_role`), que **ignora por completo Row Level Security**. RLS existe y está bien escrito en 5 tablas, pero es **prácticamente decorativo** porque el código casi nunca pasa por él. La seguridad efectiva depende, entonces, al 100% de los guards en código.

2. **Una fracción enorme de esas funciones no tiene guard.** Familias enteras de servicios (`reportes`, `exportar`, `metricas-ppis`, `disponibilidad`, `visitas`) **no importan siquiera un `require*`**. En `usuarios`, `conformidades`, `presupuestos`, `pagos`, `incidentes` y `notificaciones-inapp` hay escrituras que crean usuarios, cierran incidentes, aprueban presupuestos y registran cobros **sin verificar rol ni pertenencia**.

Como toda función `export`-ada en un archivo `'use server'` es un **endpoint HTTP invocable directamente** (POST con un action-id estable — no hace falta pasar por la UI ni por el middleware), cualquier usuario autenticado —y en varios casos sin sesión— puede invocarlas con IDs arbitrarios.

**Consecuencia más grave:** `usuarios.service.ts:766 crearEmpleado` crea un usuario en Supabase Auth con el `rol` que reciba en el payload, sin guard → **escalada a administrador para cualquiera**. A partir de ahí, todo lo demás cae.

**Veredicto para la defensa:** el patrón feature-based está bien y los guards que existen están bien diseñados, pero la decisión de usar `service_role` como cliente por defecto (en lugar de reservarlo para los 3 casos justificados) invirtió el modelo de seguridad: la base dejó de proteger y el código no cubrió el hueco. Es corregible con un wrapper de autorización uniforme; conviene hacerlo **antes** de la defensa o tener la respuesta preparada (§7).

### Conteo de hallazgos

| Severidad | Cantidad (familias/funciones) |
|-----------|-------------------------------|
| CRÍTICO   | 8 grupos (≈60 funciones sin guard con bypass de RLS) |
| MEDIO     | 7 |
| MENOR     | 5 |
| Fortalezas defendibles | 6 |

---

## 2. Cobertura de autorización (función → guard → estado)

Leyenda: **Admin** = `createAdminClient()` (bypassea RLS) · **Srv** = `createClient()` (RLS activo) · OK = guard correcto · **FALTA** = sin guard.

### 2.1 Servicios SIN NINGÚN guard importado (archivo completo expuesto)

| Archivo | Cliente | Estado |
|---|---|---|
| `reportes/reportes.service.ts` (14 fns) | Admin | **FALTA (todas)** — vuelca finanzas/rentabilidad/desempeño de todo el sistema |
| `exportar/exportar.service.ts` (17 fns) | Admin | **FALTA (todas)** — reportes R1–R13, ingresos, costos, márgenes |
| `reportes/metricas-ppis.service.ts` (≈14 fns) | Admin | **FALTA (todas)** — PPIs globales (TCI, FPY, WIP, OEE, ISC…) |
| `disponibilidad/disponibilidad.service.ts` (12 fns) | Admin | **FALTA (todas)** — incluye 4 escrituras |
| `visitas/visitas.service.ts` (9 fns) | Admin | **FALTA (todas)** — incluye 4 escrituras |
| `documentos/documentos.service.ts` (3 fns) | Admin | **FALTA (todas)** — uploads/borrado a Storage |

### 2.2 Servicios con guards parciales

| Función | Línea | Cliente | Guard | Estado |
|---|---|---|---|---|
| **usuarios** `crearEmpleado` | 766 | Admin | — | **FALTA — CRÍTICO (rol arbitrario)** |
| `eliminarUsuario` | 825 | Admin | — | **FALTA — CRÍTICO** |
| `aprobarSolicitudTecnico` | 523 | Admin | — | **FALTA — CRÍTICO** |
| `actualizarTecnico` / `actualizarCliente` | 453 / 892 | Admin | — | **FALTA — cambian email en `auth.users` (takeover)** |
| `toggleActivoTecnico/Empleado/Cliente` | 326/867/990 | Admin | — | **FALTA — desactivan cuentas + cierran sesión (DoS)** |
| `verificarEstadoEmail` | 71 | Admin | — | **FALTA — enumeración de cuentas** |
| `getClientesAdmin` / `getTecnicos` / `getFiabilidadTecnicos` | 52/115/190 | Admin | — | **FALTA — directorios completos** |
| `getUsuarios`/`getEmpleados`/`getClientes`/… | varias | Srv | — | FALTA guard; RLS contiene parcialmente |
| **asignaciones** `crearAsignacion` | 287 | Admin | — | **FALTA — CRÍTICO** |
| `cancelarIncidente` / `darDeBajaIncidente` | 562 / 651 | Admin | — | **FALTA — CRÍTICO** |
| `aceptarAsignacion` / `rechazarAsignacion` | 157 / 236 | Srv | — | FALTA; solo RLS |
| `completarAsignacion` | 437 | Srv | requireTecnicoId (440) | Rol OK, **update no filtra `id_tecnico`** (pertenencia FALTA) |
| `getAsignacionesActivas` | 108 | Admin | requireTecnicoId (111) | OK (filtra id_tecnico) |
| `getAsignacionesPendientes`/`getCount…` | 73/91 | Srv | requireTecnicoId | OK |
| `cancelarIncidenteCliente` | 489 | Admin | requireClienteId (495) | OK (verifica `id_cliente_reporta`) |
| **incidentes** `getIncidentesForAdmin` | 44 | Admin | requireAdminOrGestorId (46) | OK |
| `getAsignacionesDelIncidente` | 163 | Admin | — | **FALTA — fuga por ID** |
| `getTimelineData` / `getTimelineIncidente` | 181 / 544 | Admin | — | **FALTA — fuga completa por ID** |
| `getDashboardStats`/`getDashboardActividad`/`getMetricasDashboard` | 227/259/382 | Admin | — | **FALTA — métricas globales** |
| `actualizarIncidente` | 323 | Srv | — | FALTA; RLS contiene (cliente no tiene UPDATE) |
| `calificarIncidenteAdmin` | 354 | Srv | — | **FALTA — un técnico asignado puede escribir `calificacion_admin`** |
| `getIncidentesByCurrentUser` | 89 | Srv | requireClienteId (91) | OK |
| **presupuestos** `aprobarPresupuestoCliente` | 522 | Srv+Admin | — | **FALTA — CRÍTICO (aprueba en nombre de cualquier cliente)** |
| `rechazarPresupuestoCliente` / `…ConDecision` | 603 / 706 | Srv+Admin | — | **FALTA — CRÍTICO** |
| `responderOportunidadTecnico` | 803 | Admin | — | **FALTA — CRÍTICO (desvincula técnico, resetea incidente)** |
| `crearPresupuesto` | 191 | Admin | requireTecnicoId (202) | Rol OK, **no valida asignación al `id_incidente`** (bypass RLS) |
| `actualizarPresupuesto` / `enviarPresupuesto` | 230 / 268 | Srv | — | FALTA; solo RLS |
| `getPresupuestosDelIncidente` | 61 | Admin | — | **FALTA — fuga por ID** |
| `aprobarPresupuesto`/`rechazarPresupuesto`/`marcar…Vencido` | 309/377/502 | Srv/Admin | requireAdminOrGestorId | OK |
| **conformidades** `aprobarConformidad` | 263 | Admin | — | **FALTA — CRÍTICO (cierra incidente, califica técnico)** |
| `rechazarConformidad` | 387 | Admin | — | **FALTA — CRÍTICO** |
| `crearConformidad` / `crearConformidadPorTecnico` | 132 / 197 | Admin | — | **FALTA — CRÍTICO** |
| `firmarConformidad` | 172 | Srv | — | FALTA; solo RLS |
| `getConformidadesPendientes`/`Historial` | 39/70 | Admin | requireAdminOrGestorId | OK |
| **pagos** `registrarCobroCliente` | 134 | Admin | — | **FALTA — CRÍTICO (finaliza incidente ajeno)** |
| `registrarPagoTecnico` | 162 | Admin | — | **FALTA — CRÍTICO** |
| `getPendientesCobroCliente`/`getPendientesPagoTecnico`/… | 49/53/106/133/232 | Admin | — | **FALTA — listas globales de cobros/pagos** |
| `getMisCobrosComoCliente`/`getMisPagos…` | 237/282 | Admin/Srv | requireClienteId/TecnicoId | OK |
| `getMisPagosTecnicoDeIncidente` | 391 | Admin | requireTecnicoId (398) | Rol OK, **bloque `pendiente` no filtra por `id_tecnico`** (IDOR lectura) |
| `pagos.service.ts` (crear/actualizar/eliminar/getForAdmin) | varias | Srv | requireAdminOrGestorId | OK |
| **notificaciones-inapp** `getNotificacionesAdmin`/`contar…` | 97/114 | Admin | — | **FALTA — cualquiera lee notif. de admin** |
| `marcarNotificacionLeida` | 168 | Admin | — | **FALTA — IDOR sobre cualquier notificación** |
| `crearNotificacion` / `…Cliente` / `…Admin` | 215/230/245 | Admin | — | **FALTA — spoofing/spam de notificaciones** |
| `eliminarNotificacion` / `marcarTodasLeidas` | 137 / 187 | Admin | requireTecnico/ClienteId según `rol` | **Rama `admin` sin guard; `rol` lo elige el llamante** |
| `getNotificaciones/contar Tecnico/Cliente` | 21/39/59/77 | Admin | requireTecnicoId/ClienteId | OK |
| **walter** tools admin (`consultar_*`) | 1891–1925 | Admin | requireAdminOrGestorId por tool | OK |
| `executeConsultarEstado` (rama admin) | 698–711 | Admin | — | **FALTA — ver §5** |
| `executeListarIncidentes` (rama admin) | 768 | Admin | requireAdminOrGestorId | OK |
| tools cliente/técnico | 727/749/1928/1932 | Admin | requireClienteId/TecnicoId | OK |
| **inmuebles** writes (`crearInmueble`/`actualizar`/`toggle`) | 122/152/208 | Srv | requireClienteId solo en crear | Parcial; RLS contiene |
| **avances** `crearAvance` | 46 | Admin | requireTecnicoId (48) | Rol OK (no valida asignación) |
| **auth** `require*` helpers | — | Srv | — | **Diseño correcto (§6)** |

> El detalle completo por función (44 archivos, ~180 funciones) está respaldado por la revisión de los servicios grandes; la tabla lista las funciones con carga de seguridad.

---

## 3. Hallazgos CRÍTICOS

### C-1 · `crearEmpleado` permite auto-escalada a administrador
`usuarios.service.ts:766` (admin client en :778). Sin guard. Crea usuario en Supabase Auth y fila `usuarios` con el `rol` recibido en el payload. Cualquier usuario autenticado (o request directo al action) puede crearse una cuenta `admin`. **Es la llave maestra de todo el sistema.**
**Fix:** `await requireAdmin()` al inicio + validar que `rol ∈ {gestor, tecnico}` (no permitir crear `admin` desde acá).

### C-2 · Gestión de usuarios sin autorización (takeover / DoS / enumeración)
`eliminarUsuario` (825), `aprobarSolicitudTecnico` (523), `actualizarTecnico` (453) y `actualizarCliente` (892) —estas dos **cambian el email en `auth.users`** vía `auth.admin.updateUserById` → **account takeover**—, `toggleActivo{Tecnico,Empleado,Cliente}` (326/867/990) → desactivan cualquier cuenta y cierran sus sesiones (**DoS dirigido**), y `verificarEstadoEmail` (71) → **enumeración de cuentas**. Todas Admin, todas sin guard.
**Fix:** `requireAdmin()` en todas; `verificarEstadoEmail` debería ser rate-limited o eliminado del flujo público.

### C-3 · Escrituras de flujo de negocio sin guard (bypass RLS)
Cualquier usuario puede alterar el estado del negocio de incidentes ajenos:
- `asignaciones`: `crearAsignacion` (287), `cancelarIncidente` (562), `darDeBajaIncidente` (651).
- `presupuestos`: `aprobarPresupuestoCliente` (522), `rechazarPresupuestoCliente` (603), `rechazarPresupuestoConDecision` (706), `responderOportunidadTecnico` (803).
- `conformidades`: `aprobarConformidad` (263) —además **crea calificación del técnico y marca el incidente resuelto**—, `rechazarConformidad` (387), `crearConformidad` (132), `crearConformidadPorTecnico` (197).
- `pagos`: `registrarCobroCliente` (134) —marca el incidente `finalizado`—, `registrarPagoTecnico` (162).
- `disponibilidad`: `guardarFranjasDisponibilidad` (10), `guardarCompromisoTecnico` (107), `liberarCompromisoDeIncidente` (409), `procesarDisponibilidadVencida` (272) —batch global disparable a demanda—.
- `visitas`: `proponerVisita` (78), `confirmarVisita` (168), `rechazarVisita` (228) —cancela la asignación del técnico—, `completarVisita` (353).

**Fix:** guard de rol + verificación de pertenencia (el técnico/cliente de sesión debe ser el dueño del recurso). Las acciones "del cliente" deben derivar `id_cliente` de `requireClienteId()` y comprobar que el presupuesto/incidente le pertenece, no confiar en el ID del payload.

### C-4 · Fuga de datos de negocio de todo el sistema (lecturas Admin sin guard)
`reportes.service.ts` (14 fns), `exportar.service.ts` (17 fns) y `metricas-ppis.service.ts` (≈14 fns) exponen **ingresos, costos, márgenes, rentabilidad por técnico/inmueble y PPIs** a cualquiera. Sumado a `incidentes`: `getDashboardStats/Actividad/MetricasDashboard` (227/259/382), `getTimelineData/Incidente` (181/544), `getAsignacionesDelIncidente` (163); `presupuestos.getPresupuestosDelIncidente` (61); `pagos` listas de pendientes (49/53/106/133/232); `usuarios.getClientesAdmin/getTecnicos/getFiabilidadTecnicos` (52/115/190); `notificaciones-inapp.getNotificacionesAdmin/contar` (97/114).
**Fix:** `requireAdminOrGestorId()` al inicio de cada reporte y lectura de dashboard; en lecturas por ID que un cliente/técnico legítimamente consulta, verificar pertenencia.

### C-5 · IDOR de lectura por ID en detalles de incidente
`getIncidenteById` (106), `getIncidenteCompleto` (138), `getIncidentesByInmueble` (298) usan `createClient()` **por lo que RLS los contiene** — pero varias de sus hermanas (`getTimelineData`, `getAsignacionesDelIncidente`, `getPresupuestosDelIncidente`) usan Admin y **no**. Un cliente puede pedir `getTimelineData(idAjeno)` y obtener inspecciones, presupuestos, pagos y conformidades de un incidente que no es suyo.
**Fix:** unificar estas lecturas a `createClient()` (que RLS filtre) **o** añadir verificación de pertenencia explícita.

### C-6 · Walter: `rol` controlado por el cliente + `consultar_estado` admin sin guard
`walter.service.ts:1834 sendMessageToWalter(messages, rol, …)` recibe `rol` como **parámetro del cliente** (`components/ai-help-chat.tsx:705`). Los tools exclusivos de admin están protegidos individualmente con `requireAdminOrGestorId()` (bien), **pero** `consultar_estado_incidente` está disponible para todos los roles y su ejecutor `executeConsultarEstado` (698–711) **omite toda verificación cuando `rol==='admin'`** ("admin puede ver cualquiera"). Un cliente que invoque el action con `rol='admin'` y pida "consultá el incidente N" obtiene el detalle completo de **cualquier** incidente (descripción, cliente, técnicos, presupuestos, conformidades).
**Fix:** derivar `rol` en el servidor desde `getCurrentUser()` e ignorar el parámetro; y/o agregar `requireAdminOrGestorId()` en la rama admin de `executeConsultarEstado`. (`listar_incidentes` admin ya llama al guard — imitar ese patrón.)

### C-7 · `crearAsignacion` y `crearPresupuesto` sin verificación de pertenencia
`crearAsignacion` (287, sin guard) permite asignar cualquier técnico a cualquier incidente. `crearPresupuesto` (191) verifica que sea técnico pero **no** que esté asignado al `id_incidente` (y usa Admin, sin red RLS) → un técnico inyecta presupuestos en incidentes ajenos.
**Fix:** `requireAdmin()` en `crearAsignacion`; en `crearPresupuesto`, verificar que exista `asignaciones_tecnico` (técnico, incidente, estado activo).

### C-8 · Notificaciones: IDOR + spoofing
`marcarNotificacionLeida` (168) actualiza por `id_notificacion` sin dueño → cualquiera marca leída cualquier notificación. `crearNotificacion/…Cliente/…Admin` (215/230/245) permiten **inyectar notificaciones falsas** a cualquier destinatario (phishing interno). `eliminarNotificacion`/`marcarTodasLeidas` tienen rama `admin` sin guard, seleccionable por el llamante.
**Fix:** filtrar por el `id` de sesión; los `crearNotificacion*` deberían ser helpers internos (no exportados como action) o exigir `requireAdmin()`.

---

## 4. Hallazgos MEDIOS

- **M-1 · Escrituras contenidas solo por RLS.** `aceptarAsignacion`/`rechazarAsignacion` (157/236), `actualizarIncidente` (323), `actualizarPresupuesto`/`enviarPresupuesto` (230/268), `firmarConformidad` (172): sin guard pero sobre `createClient()`. Hoy RLS las salva; el día que alguien las migre a Admin (como pasó con el resto) se vuelven CRÍTICAS. Añadir guard igual — defensa en profundidad.
- **M-2 · `calificarIncidenteAdmin` (354).** Escritura pensada para admin, sin guard, sobre `createClient()`. La política UPDATE de `incidentes` permite al **técnico asignado** actualizar el incidente, por lo que un técnico podría escribir `calificacion_admin`. Hueco lógico. Guard `requireAdmin()`.
- **M-3 · `getMisPagosTecnicoDeIncidente` (391).** Tiene `requireTecnicoId`, pero el bloque `pendiente` consulta presupuestos filtrando solo por `id_incidente` (no por `id_tecnico`): un técnico ve montos/descripción de un incidente no asignado. IDOR parcial de lectura.
- **M-4 · `completarAsignacion` (437).** Verifica rol técnico pero el `UPDATE` filtra solo por `id_asignacion` → un técnico puede completar la asignación de otro (RLS lo mitiga, no lo elimina).
- **M-5 · Storage `documentos` es un bucket público.** `documentos.service.ts` y `walter.service.ts:1651` usan `getPublicUrl()` y no hay `createSignedUrl` en ninguna parte; no hay creación de bucket privado en las migraciones. Fotos de inspección/diagnóstico y —según dónde se suban— comprobantes y conformidades quedan accesibles por URL **sin autenticación**. Los paths llevan `Date.now()+random` (no trivialmente adivinables) pero las URLs se persisten y comparten. Para documentos sensibles usar bucket privado + URLs firmadas de corta duración.
- **M-6 · Tablas sin RLS.** `notificaciones`, `inspecciones`, `calificaciones` no aparecen en ninguna migración con `ENABLE ROW LEVEL SECURITY`. Como la app las accede por Admin, no cambia el riesgo hoy, pero elimina la única red de seguridad si se corrigieran los guards migrando a `createClient()`. Habilitar RLS + policies.
- **M-7 · `verificarEstadoEmail` / enumeración.** Ver C-2; se clasifica también como MEDIO si el flujo de registro lo requiere: mitigar con respuestas genéricas y rate-limiting en lugar de exponer estado exacto de la cuenta.

---

## 5. Hallazgos MENORES

- **m-1 · IDs de cliente en la firma en vez de la sesión.** `getPagosDelCliente(idCliente)` (pagos:76), `getPresupuestosDelCliente(idCliente)` (presupuestos:136), `getInmueblesDeCliente(idCliente)` (usuarios:241), `getClienteById(idCliente)` (usuarios:98): reciben el ID por parámetro y hoy RLS los contiene. Anti-patrón: derivar de `requireClienteId()`.
- **m-2 · Naming engañoso.** `getAsignacionesForAdmin` (asignaciones:58) usa `createClient()` sin guard: un técnico que lo invoque recibe (por RLS) solo sus asignaciones, no un error. No es hueco, pero el nombre miente sobre su control de acceso.
- **m-3 · Fuga de mensajes de error crudos.** Varias funciones devuelven `error.message` de Postgres al cliente (mitigado parcialmente por `translateDbError`). Evitar filtrar detalles de esquema.
- **m-4 · `notificar*` de `notificaciones.service.ts` exportadas.** Son helpers internos post-acción pero, al ser `'use server'` exportadas, quedan como endpoints (spam de notificaciones). Bajo impacto; conviene no exportarlas o guardarlas.
- **m-5 · `eliminarFotoInspeccion` (documentos:131).** Borra de Storage por URL sin verificar que la foto pertenezca a una inspección del solicitante. Bajo impacto, pero es un borrado sin dueño.

---

## 6. Fortalezas defendibles (para el tribunal)

1. **Los guards `require*` están bien diseñados.** `auth.service.ts:38–108` derivan la identidad **del servidor** (`supabase.auth.getUser()` sobre la cookie de sesión), nunca de input del cliente. Donde se aplican, la autorización es correcta y no falsificable.
2. **Donde hay guard, la pertenencia se filtra por el ID de sesión**, no por el del payload: `getMisCobrosComoCliente`, `getNotificacionesCliente/Tecnico`, `listar_incidentes` (cliente/técnico) en Walter, `getAsignacionesPendientes`. Es el patrón correcto y demuestra que el equipo sabe hacerlo.
3. **Walter aísla los tools de admin con `requireAdminOrGestorId()` por herramienta** (1891–1925): aunque el `rol` venga falsificado, esos 10 tools no filtran datos. El único hueco es `consultar_estado` admin (C-6), acotado y de fix trivial.
4. **Las políticas RLS que existen están bien escritas**: por-rol, con verificación de pertenencia (`id_cliente_reporta`, `id_tecnico`), `FORCE ROW LEVEL SECURITY` e índices de apoyo (`rls_tablas_criticas.sql`). El problema no es el diseño de RLS, sino que la app lo saltea.
5. **`createAdminClient()` está correctamente encapsulado** (`admin.ts`) usando `service_role` solo en servidor; nunca se filtra al cliente.
6. **El middleware aplica protección de rutas por rol** (`middleware.ts:97–115`) con redirects — buena primera capa para la navegación de la UI (no sustituye la autorización de los actions, pero es correcta en su capa).

---

## 7. Recomendaciones priorizadas

1. **Tapar C-1/C-2 hoy** (usuarios): `requireAdmin()` en `crearEmpleado`, `eliminarUsuario`, `aprobarSolicitudTecnico`, `actualizar{Tecnico,Cliente}`, `toggleActivo*`. Es el radio de explosión mayor con el menor esfuerzo.
2. **Introducir un wrapper de autorización uniforme** (p.ej. `withAuth(rol, fn)` o llamar `require*()` como primera línea de cada action) y aplicarlo a `reportes`, `exportar`, `metricas-ppis`, `disponibilidad`, `visitas`, `conformidades`, `pagos`, `presupuestos`, `notificaciones-inapp`.
3. **Revertir el uso de `createAdminClient()` a los 3 casos justificados** (crear/eliminar usuario en Auth, y operaciones que legítimamente deben saltar RLS). El resto debe usar `createClient()` para que RLS actúe como segunda capa.
4. **Walter (C-6):** derivar `rol` de `getCurrentUser()` en `sendMessageToWalter` e ignorar el parámetro.
5. **Storage:** mover documentos sensibles (conformidades, comprobantes) a un bucket privado con URLs firmadas.
6. **Habilitar RLS** en `notificaciones`, `inspecciones`, `calificaciones`.

**Respuesta preparada para la defensa** si no se alcanza a corregir todo: *"El modelo de seguridad es guard-en-código + RLS. Durante la auditoría detectamos que un subconjunto de Server Actions usa el cliente administrativo sin el guard previo, invirtiendo el modelo. La corrección es un wrapper de autorización uniforme y reservar `service_role` para los tres casos justificados; los guards ya existentes demuestran que el patrón correcto está implementado y es replicable."* Honesto, técnico, y convierte un hueco en una decisión de ingeniería consciente.

---

*Fin del informe.*
