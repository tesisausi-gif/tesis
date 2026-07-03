# Auditoría UX + estructural — Presentación de defensa "Mantis"

**Autora:** Sally (UX Designer, BMAD) · con método de revisión estructural de Paige (Tech Writer)
**Fecha:** 2026-07-03
**Archivo auditado:** `presentacion/index.html` (5.195 líneas, Reveal.js, proyección 1600×900)
**Alcance:** Card Trello #233 (7 pedidos) + Card #224 (revisión general de calidad para defensa)
**Regla de la revisión:** el contenido es sacrosanto — se propone cómo organizarlo y comunicarlo, no se cambian las ideas. **No se modificó ningún archivo.**

---

## Resumen del documento

- **Propósito:** sostener una defensa oral de ~30-40 min ante tribunal académico, con demo en vivo.
- **Audiencia:** tribunal (lectura a distancia, sin control del ritmo, evalúa rigor y coherencia).
- **Modelo estructural aplicable:** narrativa lineal (Tutorial/Guide) con espina Pirámide: problema → mandato → solución → valor.
- **Estado:** 26 slides + 4 modales de datos (tech, FODA, flujos, metodología). La narrativa existe pero tiene 3 quiebres: falta el "dolor de fondo", la matriz problema→solución no espeja los 6 problemas, y la numeración de la hoja de ruta no coincide con los corners reales.

---

# PARTE 1 · Pedidos de la card #233

## Pedido 1 — Falta la diapo del DOLOR REAL tras "Los 6 problemas estructurales"

**Estado actual (líneas 2091-2139):** la slide "Los 6 problemas estructurales" cierra el diagnóstico y salta directo al FODA del equipo (línea 2144). Los 6 problemas se enuncian en clave operativa ("sin registro", "sin base de técnicos") pero nunca se dice **qué le costaba eso a ISBA como negocio**. El único rastro del costo real aparece tarde y disperso: "Subtrabajos pagos sin haberse hecho" (línea 2833, matriz) y el KPI financiero de Valor agregado (línea 3794).

**Veredicto:** el pedido es correcto. Sin esta slide, el tribunal ve síntomas de proceso, no un problema de negocio. La cadena causal "caos → costo" queda implícita, y en una defensa lo implícito no puntúa.

**Qué cambiar:** insertar UNA slide entre "6 problemas" (cierra en línea 2139) y FODA (línea 2144). Misma familia visual del diagnóstico (acentos `--warm`, fondo claro).

**Propuesta de contenido:**

> - Corner: `03 · Diagnóstico` · Eyebrow: `La consecuencia de fondo`
> - Título: **"Lo que ese caos le costaba a ISBA"** (alternativa: "El problema detrás de los problemas")
> - 3 tarjetas grandes (máx. 12 palabras el titular, 1 línea de apoyo):
>   1. **Plata que se escapa** — Trabajos pagados sin estar hechos; cobros que nadie registró ni reclamó. *(acá se muda "Subtrabajos pagos sin haberse hecho", hoy huérfano en la matriz — ver Pedido 2)*
>   2. **Clientes que se van** — El propietario que no ve respuesta se lleva el inmueble a otra administración. La gestión vive de la confianza.
>   3. **Capacidad desperdiciada** — Las horas del administrador se queman coordinando por teléfono, no gestionando más incidentes.
> - Banda oscura de cierre (estilo `val-anchor` / bloque `--ink`):
>   **"El área de mantenimiento no podía crecer: cada incidente extra sumaba caos, no ingresos."**

**Cuidado académico:** si la tesis no cuantifica estas pérdidas, mantener las tarjetas en clave cualitativa (como arriba) y anclar con "Síntesis de entrevistas · Tesis sec. 4.x" para que el tribunal no pida una cifra que no existe.

---

## Pedido 2 — La matriz "Cada problema tiene su solución" no coincide 1:1 con los 6 problemas

**Estado actual:** slide "Los 6 problemas estructurales" (líneas 2104-2135) vs. matriz (líneas 2790-2839). Desalineación exacta, título por título:

| # | "6 problemas" (l. 2104-2135) | Matriz (l. 2790-2839) | Diagnóstico |
|---|---|---|---|
| 01 | Estado fuera de control | Registro no estructurado de incidentes | **Sin fila propia.** El problema #1 del diagnóstico (visibilidad del estado) no tiene solución en la matriz |
| 02 | Sin registro formal | Documentación manual y pérdida de información | Corresponde a la fila 01 de la matriz, con otro título |
| 03 | Comunicación sin rastro | Sin base de técnicos ni medición de desempeño | Corresponde a la fila 04 de la matriz ("Comunicación descentralizada"), otro título y otra posición |
| 04 | Sin base de técnicos | Comunicación descentralizada entre áreas | Corresponde a la fila 03 de la matriz, invertidos |
| 05 | Información dispersa | Sin reportes ni métricas para decidir | Corresponde (parcialmente) a la fila 02 de la matriz ("Documentación manual") |
| 06 | Cero estadísticas | Subtrabajos pagos sin haberse hecho | "Cero estadísticas" = fila 05 de la matriz; la fila 06 **no existe entre los 6 problemas** — aparece de la nada |

En síntesis: ningún título coincide textualmente, el orden 03/04 está invertido, el problema "Estado fuera de control" no tiene fila, y "Subtrabajos pagos" es una fila huérfana. Además la matriz usa el encuadre de las 4 falencias de "Problema y objetivo" (l. 2240-2253), no el de los 6 problemas — son dos taxonomías del mismo diagnóstico conviviendo en la presentación.

**Qué cambiar (correspondencia 1:1):**

1. Renombrar y reordenar las 6 filas de la matriz con **los mismos títulos y el mismo orden 01-06** de la slide de problemas. El tribunal tiene que poder superponerlas mentalmente.
2. Fila nueva para **01 · Estado fuera de control**: Mandato: "Seguimiento del incidente punta a punta" · Modelación: "Máquina de estados · UC Ver Timeline" · Sistema: "Estado y sub-estados visibles en los 3 portales" · Valor: "Cualquiera en ISBA responde el estado en segundos".
3. Reasignar filas actuales: fila 1→problema 02 · fila 2→problema 05 · fila 3→problema 04 · fila 4→problema 03 · fila 5→problema 06.
4. **Mover "Subtrabajos pagos sin haberse hecho"** a la slide de dolor del Pedido 1 (tarjeta "Plata que se escapa"). Su contenido de solución (conformidad firmada antes del cobro) ya está cubierto en Valor agregado, tarjeta "Calidad y riesgo" (l. 3798-3804).

**El valor real (gestionar más y mejor = ganar más plata):** hoy la columna "Valor" de la matriz cierra en frases correctas pero neutras ("Legajo digital único"). Falta el remate económico. Propuesta: banda de cierre debajo de la matriz (reemplaza espacio de la fila eliminada, no agrega densidad):

> **"¿Para qué todo esto? Para que ISBA gestione más incidentes con la misma estructura, cobre todo lo que hace y retenga a sus propietarios."**
> Tres chips: `+ capacidad` · `+ cobranza` · `+ retención`

**Compensación de densidad (esta ya es la slide más cargada del deck, 293 palabras):** reducir la columna "Modelación" a chips (`Flujo 5 · UC-01`) — el detalle ya vive en el modal clickeable (`data-trace`), no hace falta duplicarlo en la celda.

---

## Pedido 3 — Quitar "Problema y objetivo" (Mandato 1/2)

**Estado actual (líneas 2214-2272):** slide con dos bloques: (a) planteamiento del problema + 4 falencias (l. 2233-2256), (b) objetivo del sistema en banda oscura (l. 2259-2264). Footer "05 · MANDATO 1/2".

**Veredicto:** de acuerdo con quitarla, **con una condición**. Análisis de pérdida:

- **Las 4 falencias — pérdida nula.** Son redundantes con los 6 problemas: falencia 1 ↔ problema 02, falencia 2 ↔ problema 05, falencia 3 ↔ problema 04, falencia 4 ↔ problema 06. Es la tercera vez que el tribunal escucha el diagnóstico (antes/después → 6 problemas → falencias). Cortar sin duelo.
- **El planteamiento textual (l. 2236)** — se pierde la formulación de tesis, pero la nueva slide de dolor (Pedido 1) más los 6 problemas lo cubren con más fuerza.
- **El objetivo del sistema (l. 2261-2263) — ES LO ÚNICO IRREEMPLAZABLE.** Es la frase que el tribunal va a pedir explícitamente ("¿cuál era el objetivo?"). No puede desaparecer del deck.

**Reubicación de lo esencial:**
1. El **objetivo del sistema** pasa a ser la banda protagonista de la nueva slide "El mandato" (Pedido 4) — textual, sin reescritura.
2. La referencia de fuente ("Tesis sec. 4.7.1-4.7.2 · pp. 47-49") se suma al pie de "El mandato" (que ya cita 4.7.3-4.7.6): queda "Tesis · secciones 4.7.1 a 4.7.6 · pp. 47-50".
3. Actualizar el corner/footer: al desaparecer "1 de 2", el mandato deja de ser "parte 2 de 2" (l. 2224, 2281, 2287, 2383).

**Efecto colateral positivo:** el deck pierde ~159 palabras y una slide, y el bloque 03→05 pasa de 4 slides de problema a 3 con clímax (problemas → dolor → mandato).

---

## Pedido 4 — Reemplazar "Alcance y delimitación" por "El mandato"

**Estado actual (líneas 2277-2385):** la 4ª slide más densa del deck (207 palabras): 5 tarjetas de módulos con descripción (l. 2298-2319) + 3 columnas (fuera de alcance / límites / actores, l. 2323-2377). Es un inventario, no un compromiso: informa mucho y comunica poco. Título "Alcance y delimitación" suena a sección de documento, no a promesa ante el cliente.

**Propuesta de slide "El mandato" (estructura completa):**

> - Corner: `05 · Mandato` · Eyebrow: `A qué nos comprometimos` · Título: **"El mandato"**
> - **Banda 1 — El objetivo (protagonista, banda oscura, tipografía display grande):** la frase textual del objetivo del sistema que hoy vive en la slide eliminada (l. 2261-2263): *"Desarrollar un sistema que permita registrar y hacer seguimiento de los reclamos […] mejorando la eficiencia del seguimiento, la calidad del servicio y habilitando una toma de decisiones basada en información confiable."*
> - **Banda 2 — Los límites como línea de proceso (horizontal):** `DESDE` registro del incidente → `HASTA` cierre con conformidad, cobro y reporte final. (Contenido actual de l. 2340-2343, hoy enterrado en la columna del medio; es la definición más citable del mandato y merece jerarquía.)
> - **Banda 3 — Qué construimos:** los 5 módulos como chips de una sola línea, sin descripción (Usuarios · Propiedades · **Incidentes CORE** · Técnicos · Reportes). El detalle ya se despliega en casos de uso y flujos, dos slides después.
> - **Banda 4 — Qué NO (una sola línea, texto de apoyo):** "Fuera de alcance: gestión financiera/contable · CRM externos · denuncias y multas · aspectos legales de datos."
> - **Banda 5 — Con quiénes:** los 3 avatares A/C/T actuales (l. 2353-2375) en fila horizontal — este componente está bien resuelto, se conserva tal cual.
> - Pie: `Fuente · Tesis · secciones 4.7.1 a 4.7.6 · pp. 47-50`

**Impacto:** de ~207 a ~110 palabras; ninguna pieza de contenido nueva que defender; todos los cuerpos de texto ≥14px (hoy hay 12.5-13px en descripciones y roles).

---

## Pedido 5 — "Cascada para definir, Scrum para construir": qué está desactualizado

**Estado actual:** slide en líneas 2848-2897; datos de los modales en `METOD_INFO`, líneas 4938-5018.

**Desactualizaciones identificadas (verificadas contra el repositorio):**

1. **El rango "Dic 2025 – Abr 2026" quedó corto (l. 2876 y 4965).** S8 declara "Cierre de Proyecto" el 02-15/04/2026 con "Entrega formal al Lic. Villagra" (l. 4989-4991). Pero el repositorio registra **352 commits posteriores al 16/04/2026**, con features y fixes de producto hasta el 01/07/2026: coordinación de visita de obra entre presupuesto y conformidad, cancelación de incidentes desde administración, disponibilidad de inspección vencida, endurecimiento de auth, gráfico de incidentes por mes, paginación de notificaciones, etc. Si el tribunal pregunta "¿cuándo terminaron?", la slide contradice la evidencia. **Corrección:** extender la línea de tiempo ("Dic 2025 – Jul 2026") y agregar una fase/sprints reales, p. ej. "S9+ · Mejoras funcionales y estabilización (Abr–Jul 2026): coordinación de visitas, cancelaciones, hardening de seguridad".
2. **S7 declara bugs "#211–#229" como corrección cerrada (l. 4986-4988)** — el tablero ya va por #233+; la corrección continuó después del rango declarado. Reformular como "primera campaña de estabilización".
3. **Etapa 08 · entregable "Defensa aprobada" (l. 5017)** — la defensa todavía no ocurrió. Debe decir "Defensa preparada" (detalle chico, pero es exactamente lo que un tribunal detecta).
4. **"daily semanal" (l. 4965)** — oxímoron; decir "seguimiento semanal" o "weekly sync".
5. **Pill "07 Pruebas" como etapa secuencial (l. 2890)** vs. su modal que dice "integradas en cada sprint" (l. 5012) — la vista de pills vende cascada pura y el modal la desmiente. Etiquetar el pill: "07 Pruebas · en cada sprint".
6. **S6: "Revisión final de aceptación con ISBA (90% avance)" (l. 4984)** — con 3 meses de desarrollo posterior, "final" y "90%" quedaron falsos. Reformular como "revisión de aceptación intermedia".

**Consistencia colateral:** si se agrega la fase Abr-Jul, revisar también el flujo demo 3 (l. 3572-3618): el sistema hoy tiene fase de **visita de obra** entre presupuesto aprobado y ejecución (commits 25/06) y el diagrama salta directo de "cliente aprueba" a "técnico ejecuta". Si en la demo en vivo aparece esa pantalla, el diagrama de la slide debe reflejarla.

---

## Pedido 6 — "Un sistema, tres portales conectados": hacerla más gráfica/interactiva

**Estado actual (líneas 3204-3295):** tabs por rol + panel con ruta, párrafo y **lista de 7-8 bullets de texto plano por portal** (3ª slide más densa: 223 palabras). La única interactividad es cambiar de tab; lo que se ve es siempre texto. Es la slide menos "de producto" de toda la sección Estructura.

**Propuesta (dos niveles, elegir según tiempo disponible):**

**Nivel A — rediseño del panel (bajo esfuerzo, mismo HTML/JS):**
1. Franja superior fija dentro del panel: **mini-pipeline del incidente** `Registrar → Asignar → Presupuestar → Ejecutar → Cerrar`; al cambiar de tab se iluminan los pasos donde ese rol actúa (cliente: 1-3-5 · técnico: 2-3-4 · admin: todos). Comunica "un solo proceso, tres miradas" sin leer bullets.
2. Reducir los bullets de 8 a **4 acciones clave por rol**, con icono (los SVG inline ya son patrón del deck). El resto de las acciones vive en la demo — no hace falta enumerarlas.
3. Sumar una **captura real del portal** (screenshot del sistema, imagen estática pequeña, embebida como data URI o archivo local junto al HTML) a la izquierda del panel. Nada ancla más que ver el producto antes de la demo.
4. Remate de una línea bajo el panel: "Los tres portales leen y escriben el mismo dato — nadie pregunta, todos ven." (conecta con "Mismo dato, tres miradas" de Valor agregado, l. 3809).

**Nivel B — rediseño conceptual (más esfuerzo):** diagrama hub-and-spoke: base de datos al centro, 3 portales alrededor, y **un incidente-ejemplo que viaja** entre portales al click (GSAP ya está cargado en el deck). Solo si sobra una semana; el Nivel A resuelve el pedido.

### Pedido 6.1 — Slide "Walter" ídem

**Estado actual (líneas 3300-3361 + JS 4694-4820):** tabs por rol → panel que lista **nombres técnicos de tools con descripción** (`consultar_estado_incidente → …`). Es documentación de API proyectada en pantalla: correcta para el anexo, fría para la defensa. El valor de Walter (preguntar en castellano y recibir datos reales) se describe pero nunca se ve.

**Propuesta — mostrar una conversación, no un catálogo:**
1. Reemplazar (o anteponer) en el panel una **conversación simulada** de 3 burbujas por rol:
   - Usuario: pregunta real en lenguaje natural — Cliente: *"¿Cómo viene el arreglo de la pérdida en Urquiza 1550?"* · Técnico: *"¿Qué tengo asignado para esta semana?"* · Admin: *"¿Qué técnico de plomería tiene mejor calificación y menos carga?"*
   - Chip intermedio con la tool ejecutada (`consultar_estado_incidente`) — mantiene el rigor técnico sin listar las 12.
   - Respuesta de Walter con un dato concreto (con formato de dato del sistema).
2. Animar la secuencia al click del tab (aparición escalonada tipo typing; el patrón `animation-delay` ya existe en `renderWalterPanel`, l. 4783).
3. El detalle de los grupos de tools puede quedar como estado secundario (link "ver las 12 tools" que expande lo actual). Conteos por rol (4/2/12) se conservan en los tabs — ya están bien.

---

# PARTE 2 · Revisión general de calidad (card #224)

## 2.1 Legibilidad a distancia — las slides con más texto

Ranking por palabras visibles (medido sobre el HTML, sin SVG/estilos):

| # | Slide | Palabras | Riesgo principal |
|---|---|---|---|
| 1 | Cada problema tiene su solución (l. 2755) | **293** | 36 celdas de tabla; texto de celda pequeño. Mitigación: Pedido 2 (chips en "Modelación") |
| 2 | Valor agregado aportado a ISBA (l. 3747) | **282** | 6 tarjetas × 4 bloques (antes/ahora/KPI); cuerpos ~12-13px |
| 3 | Un sistema, tres portales (l. 3204) | **223** | 8 bullets por tab. Mitigación: Pedido 6 |
| 4 | Alcance y delimitación (l. 2277) | **207** | Desaparece con el Pedido 4 |
| 5 | Flujos del proceso (l. 2646) | **194** | 9 tarjetas con descripciones a **11px** — ilegible a distancia; las descripciones pueden borrarse (el título del flujo alcanza; el detalle está en el modal) |

Regla práctica para 1600×900 proyectado: **ningún texto que deba leerse desde la última fila por debajo de ~16px**; 10-12px solo para metadatos que se verbalizan pero no se leen (fuentes, corners). Hoy incumplen: descripciones de flujos (11px), items FODA (~12px estimado con 17 bullets), bloques antes/ahora de Valor agregado, descripciones de módulos del alcance (13px), roles de actores (12.5px).

**Sugerencia específica para Valor agregado:** es la slide de cierre argumental y la 2ª más densa. Opción quirúrgica: eliminar el bloque "Antes" de cada tarjeta (el "antes" ya se contó tres veces en el acto 1) y dejar categoría + título + "Ahora" + KPI. Baja ~70 palabras y sube el cuerpo a 14-15px sin tocar el layout.

## 2.2 Narrativa — ¿fluye problema → mandato → solución → valor?

La espina existe y es buena. Tres quiebres:

1. **FODA del equipo (l. 2144) interrumpe la historia del cliente.** El acto 1 es "ISBA sufre"; el FODA habla de nosotros (debilidades del equipo, reuniones, capacitación). Recomendación: moverlo junto a Metodología (después de "Cascada/Scrum", donde su contenido de mitigación con Azure DevOps encaja natural), o al menos re-encuadrar el eyebrow como "Antes de comprometernos: ¿podíamos?" para justificar su posición. Con la slide de dolor del Pedido 1, la secuencia diagnóstico → dolor → mandato queda perfecta si el FODA no se interpone.
2. **La matriz (l. 2755) llega antes de conocer el sistema.** Funciona como promesa ("esto vamos a resolver así") pero sus columnas "Sistema" y "Valor" describen pantallas que el tribunal todavía no vio. Es defendible como mapa anticipado — pero entonces conviene decirlo en el subtítulo ("la volveremos a ver cumplida al final") o repetir la matriz en versión "cumplido ✓" antes de Valor agregado. Con el Pedido 2 aplicado, la matriz alineada 1:1 se vuelve el mejor "hilo conductor" posible: mismo orden en problemas, matriz y (idealmente) tarjetas de Valor agregado.
3. **Indicadores (l. 3694) muestra 347/336/5.2 días sin fuente.** Todo el deck cita "Tesis sec. X · p. Y" y esta slide no dice de dónde salen los números. Si son datos del seed, decirlo ("sobre 347 casos de prueba del seed") — un tribunal pregunta exactamente eso.

## 2.3 Numeración y hoja de ruta — inconsistencias exactas

- **Hoja de ruta (l. 1957-1968) tiene un duplicado:** ítem 06 "Flujos del proceso · 9 flujos agrupados por dominio" e ítem 07 "Flujos del proceso · 9 flujos modelados · 5 en demo". En el deck existe **una sola** slide de flujos (l. 2646). Uno de los dos ítems sobra (liberando lugar para la slide de dolor del Pedido 1 en la hoja de ruta).
- **Regresión de numeración:** tras "09 · Metodología" (l. 2852), el hero "Conocé a Mantis" y toda su sección (stack, arquitectura, portales, Walter, demo ×5) vuelven a **08** (l. 2908, 2955, 3074, 3208, 3304, 3371, 3430…). La hoja de ruta lo anuncia como **10**.
- **Salto fantasma:** Indicadores usa corner/footer **14** (l. 3698, 3740) — la hoja de ruta dice **11**; no existen los ítems 13 ni 14 en ninguna parte.
- **Valor agregado** usa 12 (coincide con hoja de ruta) pero queda después del "14", desordenando la lectura.
- **Menor:** hoja de ruta ítem 03 "FODA · Análisis interno…" vs corner "04 · Análisis interno" — el desfase +1 nace de que la hoja de ruta no se numera a sí misma pero los corners sí (01 · Hoja de ruta).

**Recomendación:** renumerar una sola vez, de corrido, tomando los corners como fuente de verdad, y regenerar la hoja de ruta desde esa lista (con los cambios de los Pedidos 1, 3 y 4 ya aplicados). Verificación final: los tres lugares — hoja de ruta, corner y footer — deben decir el mismo número en cada slide.

## 2.4 Términos prohibidos — verificación por grep

| Término | Resultado | Ubicación exacta | Acción |
|---|---|---|---|
| BPMN | **Solo interno** (clases CSS `.bpmn-*`, comentarios HTML, claves JS) | l. 413-1014, 3424+, 4223+ | Nada visible; opcional renombrar clases, no urgente |
| trazabilidad | **VISIBLE — 3 lugares** | (1) categoría de tarjeta "Trazabilidad y auditoría", l. 3781; (2) KPI "cobertura de trazabilidad", l. 3785 — ambos en Valor agregado; (3) "Crear matriz de trazabilidad" en modales de Metodología, l. 4955 y 5004 | (1)→"Historial y auditoría"; (2)→"% de incidentes con historial completo"; (3)→"matriz de seguimiento problema→solución" |
| tiempo real | **VISIBLE — 2 modales** | descripción HU-01 ("notifica al administrador en tiempo real"), l. 4620; descripción RF-12 ("calculados en tiempo real"), l. 4642 — se muestran al clickear chips en Casos de uso | Reemplazar por "al instante" (coherente con el título ya corregido de Indicadores) |
| realtime | Ausente | — | OK |
| PPIs | Ausente en la presentación | — | OK (existe en la app, tab de métricas — fuera de alcance de esta auditoría, pero si la demo muestra esa pantalla, el término aparecerá en vivo: revisar el label del tab en el sistema) |
| sweet spot | Ausente | — | OK |
| TypeScript end-to-end | Ausente | — | OK |

## 2.5 Otros hallazgos menores

- **"Demo guiada" consistencia:** la promesa "5 flujos en 4 slides" se repite idéntica en hoja de ruta, hero de demo y slide de flujos — bien resuelto, mantener.
- **Portada y cierre:** excelente jerarquía y poca densidad; el subtítulo de portada ("reemplaza el WhatsApp… por seguimiento real") es la mejor frase del deck — considerar retomarla textual en el cierre "Gracias" para el efecto de eco.
- **Slide corner del hero demo (l. 3371)** dice "08 · Conocé a Mantis · Demo guiada" pero su footer dice solo "DEMO GUIADA" sin número — unificar cuando se renumere.
- **FODA "Tocá cada ítem" (l. 2202):** el hint está solo en el cuadrante Amenazas pero los clickeables están en Debilidades y Amenazas — mover el hint a una posición neutral bajo la grilla.

---

## Plan de acción priorizado (orden sugerido de ejecución)

1. **Renumeración global + hoja de ruta** (tocaría todo lo demás; hacerla al final es rehacerla dos veces → definir el orden final de slides primero, con Pedidos 1/3/4 decididos).
2. **Pedido 3 + 4** (eliminar "Problema y objetivo", crear "El mandato") — desbloquea la narrativa del acto 2.
3. **Pedido 1** (slide de dolor) + mudanza de "Subtrabajos pagos".
4. **Pedido 2** (alinear matriz 1:1 + banda de valor real).
5. **Términos prohibidos** (6 reemplazos puntuales, 15 minutos).
6. **Pedido 5** (actualizar metodología con fechas reales Abr-Jul 2026).
7. **Pedido 6 y 6.1** (portales nivel A + chat simulado de Walter) — el mayor salto de calidad percibida por hora invertida después de la narrativa.
8. **Dieta de texto**: flujos (borrar descripciones 11px), Valor agregado (quitar bloques "Antes"), FODA (condensar o reubicar).

**Reducción estimada si se aplica todo:** ~350-400 palabras menos en pantalla (-15% del texto del deck), 1 slide menos y 1 más (neto 0), ninguna idea perdida.
