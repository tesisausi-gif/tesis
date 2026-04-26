-- ===========================================================================
-- SIMULACIÓN DE INCIDENTE COMPLETO — ENERO 2026
-- ===========================================================================
-- Escenario: Reja de acceso principal rota en inmueble de Cliente Uno
-- Técnico asignado: Julian Vicente (Herrería)
-- Período: 10 al 20 de enero de 2026
--
-- Cómo ejecutar: Supabase Dashboard → SQL Editor → pegar y correr
-- ===========================================================================

DO $$
DECLARE
  v_id_cliente          INTEGER;
  v_id_tecnico          INTEGER;
  v_id_inmueble         INTEGER;
  v_id_incidente        INTEGER;
  v_id_asignacion       INTEGER;
  v_id_inspeccion       INTEGER;
  v_id_presupuesto      INTEGER;
  v_id_conformidad      INTEGER;
BEGIN

  -- ── 0. Obtener IDs reales de la DB ────────────────────────────────────────

  SELECT id_cliente INTO v_id_cliente
    FROM public.clientes
    WHERE correo_electronico = 'tesisausi+clienteuno@gmail.com';

  IF v_id_cliente IS NULL THEN
    RAISE EXCEPTION 'Cliente Uno no encontrado. Verificar correo_electronico en tabla clientes.';
  END IF;

  SELECT id_tecnico INTO v_id_tecnico
    FROM public.tecnicos
    WHERE correo_electronico = 'tesisausi+tecnicodoce@gmail.com';

  IF v_id_tecnico IS NULL THEN
    RAISE EXCEPTION 'Técnico Julian Vicente no encontrado. Verificar correo_electronico en tabla tecnicos.';
  END IF;

  SELECT id_inmueble INTO v_id_inmueble
    FROM public.inmuebles
    WHERE id_cliente = v_id_cliente
    LIMIT 1;

  IF v_id_inmueble IS NULL THEN
    RAISE EXCEPTION 'Cliente Uno no tiene inmuebles registrados. Registrar al menos uno primero.';
  END IF;

  RAISE NOTICE 'IDs resueltos — cliente: %, técnico: %, inmueble: %',
    v_id_cliente, v_id_tecnico, v_id_inmueble;


  -- ── 1. INCIDENTE (10 ene · 09:30) ────────────────────────────────────────
  -- Estado final: finalizado, fue_resuelto: 1

  INSERT INTO public.incidentes (
    id_cliente_reporta,
    id_propiedad,
    descripcion_problema,
    categoria,
    estado_actual,
    fecha_registro,
    fecha_cierre,
    fue_resuelto,
    disponibilidad
  )
  VALUES (
    v_id_cliente,
    v_id_inmueble,
    'La reja de acceso principal tiene un barrote central completamente doblado y la bisagra inferior desprendida del marco. No cierra correctamente, comprometiendo la seguridad del edificio.',
    'Herrería',
    'finalizado',
    '2026-01-10 09:30:00+00',
    '2026-01-19 16:00:00+00',
    1,
    'Lunes a viernes de 9 a 18 hs, coordinar con portería'
  )
  RETURNING id_incidente INTO v_id_incidente;

  RAISE NOTICE 'Incidente creado: #%', v_id_incidente;


  -- ── 2. ASIGNACIÓN (11 ene · 10:00 → aceptada 14:00 → completada 18 ene) ──

  INSERT INTO public.asignaciones_tecnico (
    id_incidente,
    id_tecnico,
    estado_asignacion,
    fecha_asignacion,
    fecha_aceptacion,
    fecha_completado,
    observaciones
  )
  VALUES (
    v_id_incidente,
    v_id_tecnico,
    'completada',
    '2026-01-11 10:00:00+00',
    '2026-01-11 14:15:00+00',
    '2026-01-18 15:30:00+00',
    'Se requiere verificar estado de reja y barrotes. Cliente coordina acceso por portería.'
  )
  RETURNING id_asignacion INTO v_id_asignacion;

  RAISE NOTICE 'Asignación creada: #%', v_id_asignacion;


  -- ── 3. INSPECCIÓN (13 ene · 10:00) ───────────────────────────────────────

  INSERT INTO public.inspecciones (
    id_incidente,
    id_tecnico,
    esta_anulada,
    fecha_inspeccion,
    descripcion_inspeccion,
    causas_determinadas,
    danos_ocasionados,
    requiere_materiales,
    descripcion_materiales,
    requiere_ayudantes,
    cantidad_ayudantes,
    dias_estimados_trabajo
  )
  VALUES (
    v_id_incidente,
    v_id_tecnico,
    false,
    '2026-01-13 10:00:00+00',
    'Reja de acceso de hierro cuadrado 3/4". Barrote central (segundo desde la izquierda) doblado aproximadamente 35° por impacto. Bisagra inferior de 4" completamente desprendida del poste de mampostería; los tirafondos arrancaron el taco de fijación. La bisagra superior presenta desgaste pero funciona. Marco general en buen estado, sin deformaciones.',
    'Impacto de vehículo (maniobra de estacionamiento) contra el lateral de la reja. El golpe torció el barrote y generó una carga excesiva sobre la bisagra inferior que ya mostraba oxidación y desgaste previo, provocando el arranque.',
    'Barrote central requiere enderezamiento con prensa y refuerzo con soldadura eléctrica en la zona de la curvatura. Bisagra inferior necesita reemplazo completo: retiro de bisagra dañada, taladrado de nuevos puntos de fijación, colocación de tacos Fischer y bisagra nueva. Pintura anticorrosiva en zonas trabajadas.',
    1,
    'Bisagra de hierro 4" x 2 unidades, tornillos galvanizados 3/8" x 10 unidades, tacos Fischer #10 x 10 unidades, pintura anticorrosiva esmalte negro 0.5L, electrodo soldadura 3.2mm x 1 caja',
    0,
    NULL,
    2
  )
  RETURNING id_inspeccion INTO v_id_inspeccion;

  RAISE NOTICE 'Inspección creada: #%', v_id_inspeccion;


  -- ── 4. PRESUPUESTO (14 ene · 09:00, aprobado 15 ene · 11:00) ─────────────
  -- costo_materiales: 18.500 | costo_mano_obra: 35.000 | gastos_admin: 5.250
  -- costo_total: 58.750 (lo que paga el cliente)

  INSERT INTO public.presupuestos (
    id_incidente,
    id_inspeccion,
    descripcion_detallada,
    costo_materiales,
    costo_mano_obra,
    gastos_administrativos,
    costo_total,
    estado_presupuesto,
    fecha_aprobacion,
    alternativas_reparacion
  )
  VALUES (
    v_id_incidente,
    v_id_inspeccion,
    'Reparación de reja de acceso principal: (1) Enderezamiento de barrote central con prensa hidráulica y refuerzo mediante soldadura eléctrica en zona de curvatura. (2) Retiro de bisagra inferior dañada y reparación de puntos de anclaje en mampostería. (3) Colocación de bisagra nueva 4" con tornillería galvanizada. (4) Ajuste y regulación de bisagra superior. (5) Lijado y aplicación de pintura anticorrosiva color negro en todas las zonas trabajadas. (6) Prueba de funcionamiento de apertura y cierre.',
    18500,
    35000,
    5250,
    58750,
    'aprobado',
    '2026-01-15 11:00:00+00',
    'Alternativa económica: solo reemplazo de bisagra sin enderezar barrote ($38.000). No recomendada por riesgo estético y estructural a mediano plazo.'
  )
  RETURNING id_presupuesto INTO v_id_presupuesto;

  RAISE NOTICE 'Presupuesto creado: #% (total: $58.750)', v_id_presupuesto;


  -- ── 5. PAGO DEL CLIENTE (16 ene · 12:00) ─────────────────────────────────

  INSERT INTO public.pagos (
    id_incidente,
    id_presupuesto,
    tipo_pago,
    monto_pagado,
    metodo_pago,
    numero_comprobante,
    fecha_pago,
    observaciones
  )
  VALUES (
    v_id_incidente,
    v_id_presupuesto,
    'total',
    58750,
    'transferencia',
    'TRF-20260116-004821',
    '2026-01-16 12:00:00+00',
    'Transferencia bancaria Banco Galicia. Pago total del presupuesto aprobado.'
  );

  RAISE NOTICE 'Pago del cliente registrado: $58.750';


  -- ── 6. CONFORMIDAD (18 ene · 15:00, firmada) ─────────────────────────────

  INSERT INTO public.conformidades (
    id_incidente,
    id_cliente,
    tipo_conformidad,
    esta_firmada,
    esta_rechazada,
    url_documento,
    fecha_creacion,
    fecha_conformidad,
    observaciones
  )
  VALUES (
    v_id_incidente,
    v_id_cliente,
    'final',
    1,
    false,
    'https://placehold.co/800x1100/f8fafc/334155?text=Conformidad+Firmada',
    '2026-01-18 15:00:00+00',
    '2026-01-18 15:00:00+00',
    'Cliente firma conformidad final. Trabajo completado a satisfacción. Reja reparada, funciona correctamente.'
  )
  RETURNING id_conformidad INTO v_id_conformidad;

  RAISE NOTICE 'Conformidad creada: #%', v_id_conformidad;


  -- ── 7. CALIFICACIÓN DEL CLIENTE (20 ene · 10:00) ─────────────────────────
  -- 5 estrellas, resolvio_problema: 1

  INSERT INTO public.calificaciones (
    id_incidente,
    id_tecnico,
    puntuacion,
    comentarios,
    resolvio_problema,
    fecha_calificacion
  )
  VALUES (
    v_id_incidente,
    v_id_tecnico,
    5,
    'Excelente trabajo. Julian fue muy puntual, explicó todo lo que iba a hacer antes de empezar y dejó el lugar limpio. La reja quedó perfecta, mejor que antes del golpe. Lo recomiendo ampliamente.',
    1,
    '2026-01-20 10:00:00+00'
  );

  RAISE NOTICE 'Calificación registrada: 5 estrellas';


  -- ── 8. PAGO AL TÉCNICO (20 ene · 11:00) ──────────────────────────────────
  -- Monto = materiales + mano de obra (sin gastos_administrativos)

  INSERT INTO public.pagos_tecnicos (
    id_tecnico,
    id_presupuesto,
    id_incidente,
    monto_pago,
    metodo_pago,
    referencia_pago,
    fecha_pago,
    marcado_por_email,
    marcado_por_nombre,
    observaciones
  )
  VALUES (
    v_id_tecnico,
    v_id_presupuesto,
    v_id_incidente,
    53500,
    'transferencia',
    'TRF-20260120-TEC-JV-001',
    '2026-01-20 11:00:00+00',
    'admin@isba.com',
    'Administración ISBA',
    'Pago por reparación reja de acceso principal. Materiales ($18.500) + Mano de obra ($35.000).'
  );

  RAISE NOTICE 'Pago al técnico registrado: $53.500';


  -- ── 9. ACTUALIZAR ESTADÍSTICAS DEL TÉCNICO ───────────────────────────────

  UPDATE public.tecnicos
  SET
    calificacion_promedio = (
      SELECT ROUND(AVG(puntuacion)::numeric, 1)
      FROM public.calificaciones
      WHERE id_tecnico = v_id_tecnico
    ),
    cantidad_trabajos_realizados = (
      SELECT COUNT(*)
      FROM public.asignaciones_tecnico
      WHERE id_tecnico = v_id_tecnico
        AND estado_asignacion = 'completada'
    )
  WHERE id_tecnico = v_id_tecnico;

  RAISE NOTICE 'Estadísticas del técnico actualizadas';


  -- ── RESUMEN ───────────────────────────────────────────────────────────────
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'SIMULACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '  Incidente #%  |  Asignación #%', v_id_incidente, v_id_asignacion;
  RAISE NOTICE '  Inspección #%  |  Presupuesto #%', v_id_inspeccion, v_id_presupuesto;
  RAISE NOTICE '  Conformidad #%', v_id_conformidad;
  RAISE NOTICE '  Técnico: Julian Vicente  |  Cliente: Cliente Uno';
  RAISE NOTICE '  Período: 10 al 20 de enero de 2026';
  RAISE NOTICE '  Ingresos (cliente): $58.750  |  Pago técnico: $53.500';
  RAISE NOTICE '==============================================';

END $$;
