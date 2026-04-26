-- ===========================================================================
-- SEED 50 CASOS — PARTE 1 (setup + casos 1-25)
-- Ejecutar ANTES de parte2. Correr en Supabase SQL Editor.
-- ===========================================================================
DO $$
DECLARE
  c1 INTEGER; c2 INTEGER; c3 INTEGER; c4 INTEGER;
  i1 INTEGER; i2 INTEGER; i3 INTEGER; i4 INTEGER;
  t1 INTEGER; t2 INTEGER; t3 INTEGER; t4 INTEGER; t5 INTEGER;
  t6 INTEGER; t7 INTEGER; t8 INTEGER; t9 INTEGER; t10 INTEGER;
  inc INTEGER; asig INTEGER; insp INTEGER; pres INTEGER; conf INTEGER;
  tid INTEGER; -- tipo inmueble Casa
BEGIN
  -- Clientes
  SELECT id_cliente INTO c1 FROM public.clientes WHERE correo_electronico='tesisausi+clienteuno@gmail.com';
  SELECT id_cliente INTO c2 FROM public.clientes WHERE correo_electronico='tesisausi+clientedos@gmail.com';
  SELECT id_cliente INTO c3 FROM public.clientes WHERE correo_electronico='tesisausi+clientetres@gmail.com';
  SELECT id_cliente INTO c4 FROM public.clientes WHERE correo_electronico='tesisausi+clientecincuenta@gmail.com';

  -- Técnicos
  SELECT id_tecnico INTO t1  FROM public.tecnicos WHERE correo_electronico='tesisausi+tectec@gmail.com';
  SELECT id_tecnico INTO t2  FROM public.tecnicos WHERE correo_electronico='tesisausi+tecnicotecnico@gmail.com';
  SELECT id_tecnico INTO t3  FROM public.tecnicos WHERE correo_electronico='raualfonso12@gmail.com';
  SELECT id_tecnico INTO t4  FROM public.tecnicos WHERE correo_electronico='tesisausi+tecnicodoce@gmail.com';
  SELECT id_tecnico INTO t5  FROM public.tecnicos WHERE correo_electronico='tesisausi+tecnicoonce@gmail.com';
  SELECT id_tecnico INTO t6  FROM public.tecnicos WHERE correo_electronico='tesisausi+tecnicodiez@gmail.com';
  SELECT id_tecnico INTO t7  FROM public.tecnicos WHERE correo_electronico='tesisausi+tecnicocuatro@gmail.com';
  SELECT id_tecnico INTO t8  FROM public.tecnicos WHERE correo_electronico='tesisausi+tecnicocinco@gmail.com';
  SELECT id_tecnico INTO t9  FROM public.tecnicos WHERE correo_electronico='tesisausi+tecnicoseis@gmail.com';
  SELECT id_tecnico INTO t10 FROM public.tecnicos WHERE correo_electronico='tesisausi+tecnicosiete@gmail.com';

  -- Tipo inmueble
  SELECT id_tipo_inmueble INTO tid FROM public.tipos_inmuebles WHERE nombre='Casa' LIMIT 1;

  -- Inmuebles (crear si no existen)
  IF NOT EXISTS(SELECT 1 FROM public.inmuebles WHERE id_cliente=c1) THEN
    INSERT INTO public.inmuebles(id_cliente,id_tipo_inmueble,calle,altura,barrio,localidad,provincia,esta_activo)
    VALUES(c1,tid,'Av. Colón','1250','Centro','Córdoba','Córdoba',true);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.inmuebles WHERE id_cliente=c2) THEN
    INSERT INTO public.inmuebles(id_cliente,id_tipo_inmueble,calle,altura,barrio,localidad,provincia,esta_activo)
    VALUES(c2,tid,'Bv. San Juan','820','Nueva Córdoba','Córdoba','Córdoba',true);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.inmuebles WHERE id_cliente=c3) THEN
    INSERT INTO public.inmuebles(id_cliente,id_tipo_inmueble,calle,altura,barrio,localidad,provincia,esta_activo)
    VALUES(c3,tid,'Calle Chacabuco','340','Güemes','Córdoba','Córdoba',true);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.inmuebles WHERE id_cliente=c4) THEN
    INSERT INTO public.inmuebles(id_cliente,id_tipo_inmueble,calle,altura,barrio,localidad,provincia,esta_activo)
    VALUES(c4,tid,'Av. Vélez Sarsfield','3600','Jardín','Córdoba','Córdoba',true);
  END IF;

  -- Inmuebles
  SELECT id_inmueble INTO i1 FROM public.inmuebles WHERE id_cliente=c1 LIMIT 1;
  SELECT id_inmueble INTO i2 FROM public.inmuebles WHERE id_cliente=c2 LIMIT 1;
  SELECT id_inmueble INTO i3 FROM public.inmuebles WHERE id_cliente=c3 LIMIT 1;
  SELECT id_inmueble INTO i4 FROM public.inmuebles WHERE id_cliente=c4 LIMIT 1;

  -- ── CASO 01: Plomería · c2 · t1 · Ene 12-20 ─────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c2,i2,'Cañería de agua caliente con pérdida bajo mesada de cocina. Mancha de humedad en pared.','Plomería','finalizado','2026-01-12 08:00:00+00','2026-01-20 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t1,'completada','2026-01-13 09:00:00+00','2026-01-13 14:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t1,false,'2026-01-14 10:00:00+00','Pérdida en unión de cañería de cobre bajo mesada. Junta desgastada.','Corrosión en junta de cobre por antigüedad.','Mancha de humedad en pared. Sin daño estructural.',1,'Codo cobre 3/4", cinta teflón, pasta selladora',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de junta y sellado de cañería cobre bajo mesada.',12000,28000,4000,44000,'aprobado','2026-01-15 11:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',44000,'transferencia','TRF-0101','2026-01-16 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c2,'final',1,false,'https://placehold.co/400x600.jpg','2026-01-19 16:00:00+00','2026-01-19 16:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t1,4,'Buen trabajo, llegó puntual y resolvió el problema sin inconvenientes.',1,'2026-01-20 10:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t1,pres,inc,40000,'transferencia','PT-0101','2026-01-20 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t1),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t1 AND estado_asignacion='completada') WHERE id_tecnico=t1;

  -- ── CASO 02: Electricidad · c3 · t7 · Ene 15-23 ──────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c3,i3,'Disyuntor principal que corta el suministro repetidamente. Sin luz en sector de dormitorios.','Electricidad','finalizado','2026-01-15 09:30:00+00','2026-01-23 16:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t7,'completada','2026-01-16 10:00:00+00','2026-01-16 15:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t7,false,'2026-01-17 11:00:00+00','Tablero con disyuntor 20A saturado. Circuito de dormitorios sobrecargado.','Suma de cargas superior a la capacidad del disyuntor. Cableado viejo.','Riesgo de corto. Sin daño visible.',1,'Disyuntor 32A bipolar, cable 2.5mm x 10m',0,NULL,2) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de disyuntor y refuerzo de circuito eléctrico dormitorios.',6000,22000,2800,30800,'aprobado','2026-01-18 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',30800,'efectivo','REC-0102','2026-01-19 12:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c3,'final',1,false,'https://placehold.co/400x600.jpg','2026-01-22 15:00:00+00','2026-01-22 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t7,5,'Excelente servicio. Explicó todo claramente y el trabajo quedó perfecto.',1,'2026-01-23 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t7,pres,inc,28000,'transferencia','PT-0102','2026-01-23 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t7),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t7 AND estado_asignacion='completada') WHERE id_tecnico=t7;

  -- ── CASO 03: Cerrajería · c4 · t10 · Ene 18-25 ───────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c4,i4,'Cerradura puerta principal rota, llave no gira. No pueden cerrar el inmueble.','Cerrajería','finalizado','2026-01-18 08:30:00+00','2026-01-25 15:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t10,'completada','2026-01-19 09:00:00+00','2026-01-19 11:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t10,false,'2026-01-20 10:00:00+00','Cerradura embutida con cilindro trabado. Mecanismo interno dañado.','Desgaste del cilindro por uso. Forzado anterior del seguro.','Puerta sin cierre seguro.',1,'Cerradura embutida doble palillo, llave seguridad',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de cerradura embutida y juego de llaves.',4000,14000,1800,19800,'aprobado','2026-01-21 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',19800,'efectivo','REC-0103','2026-01-22 09:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c4,'final',1,false,'https://placehold.co/400x600.jpg','2026-01-24 16:00:00+00','2026-01-24 16:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t10,4,'Rápido y eficiente. Quedé conforme con el trabajo.',1,'2026-01-25 10:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t10,pres,inc,18000,'transferencia','PT-0103','2026-01-25 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t10),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t10 AND estado_asignacion='completada') WHERE id_tecnico=t10;

  -- ── CASO 04: Pintura · c1 · t6 · Ene 21-29 ───────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c1,i1,'Humedad en pared medianera del comedor. Pintura desprendida y manchas verdes visibles.','Pintura','finalizado','2026-01-21 10:00:00+00','2026-01-29 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t6,'completada','2026-01-22 09:00:00+00','2026-01-22 13:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t6,false,'2026-01-23 10:00:00+00','Pared medianera 6m² con pintura desprendida, manchas de humedad y hongo superficial. Sin daño estructural.','Filtración por fisura exterior. Ausencia de impermeabilización.','Deterioro estético de la pared. Riesgo de daño a muebles.',1,'Pintura impermeabilizante, fungicida, pintura látex interior, lija',0,NULL,3) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Tratamiento de humedad y repintura pared medianera comedor 6m².',18000,40000,5800,63800,'aprobado','2026-01-24 11:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',63800,'transferencia','TRF-0104','2026-01-25 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c1,'final',1,false,'https://placehold.co/400x600.jpg','2026-01-28 16:00:00+00','2026-01-28 16:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t6,5,'Muy buen trabajo. La pared quedó impecable y el olor a hongo desapareció.',1,'2026-01-29 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t6,pres,inc,58000,'transferencia','PT-0104','2026-01-29 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t6),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t6 AND estado_asignacion='completada') WHERE id_tecnico=t6;

  -- ── CASO 05: Albañilería · c2 · t8 · Ene 25-Feb 3 ────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c2,i2,'Grieta en pared exterior del frente del edificio. Riesgo de desprendimiento de revoque.','Albañilería','finalizado','2026-01-25 09:00:00+00','2026-02-03 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t8,'completada','2026-01-26 10:00:00+00','2026-01-26 14:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t8,false,'2026-01-27 10:00:00+00','Grieta diagonal 1.2m en frente exterior, revoque suelto en 2m². Riesgo de caída.','Movimiento diferencial de fundación por saturación de suelo.','Revoque suelto con riesgo de desprendimiento. Ingreso de agua.',1,'Cemento, cal, arena gruesa, malla plástica, hidrófugo',1,1,4) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Sellado de grieta, retiro de revoque suelto y reconstrucción de frente exterior.',35000,55000,9000,99000,'aprobado','2026-01-28 11:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',99000,'transferencia','TRF-0105','2026-01-29 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c2,'final',1,false,'https://placehold.co/400x600.jpg','2026-02-02 16:00:00+00','2026-02-02 16:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t8,5,'Trabajo de calidad. El frente quedó como nuevo y explicó bien lo que hizo.',1,'2026-02-03 10:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t8,pres,inc,90000,'transferencia','PT-0105','2026-02-03 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t8),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t8 AND estado_asignacion='completada') WHERE id_tecnico=t8;

  -- ── CASO 06: Carpintería · c3 · t9 · Feb 3-10 ────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c3,i3,'Puerta de madera del baño principal desencajada. No cierra correctamente y la traba no funciona.','Carpintería','finalizado','2026-02-03 08:00:00+00','2026-02-10 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t9,'completada','2026-02-04 09:00:00+00','2026-02-04 12:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t9,false,'2026-02-05 10:00:00+00','Puerta de pino hinchada por humedad. Marco desencajado en parte superior.','Humedad del baño dilató la madera. Montaje original deficiente.','Puerta sin cierre. Privacidad comprometida.',1,'Bisagras reforzadas, spray antihongo, lija fina',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Cepillado y ajuste de puerta, reemplazo de bisagras y tratamiento antihongo.',15000,30000,4500,49500,'aprobado','2026-02-06 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',49500,'efectivo','REC-0106','2026-02-07 09:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c3,'final',1,false,'https://placehold.co/400x600.jpg','2026-02-09 16:00:00+00','2026-02-09 16:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t9,4,'Buen trabajo, la puerta cierra perfecto ahora. Puntual y ordenado.',1,'2026-02-10 10:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t9,pres,inc,45000,'transferencia','PT-0106','2026-02-10 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t9),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t9 AND estado_asignacion='completada') WHERE id_tecnico=t9;

  -- ── CASO 07: Herrería · c4 · t5 · Feb 6-14 ───────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c4,i4,'Portón corredizo de garage atascado. No desliza correctamente, ruidos metálicos al mover.','Herrería','finalizado','2026-02-06 09:00:00+00','2026-02-14 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t5,'completada','2026-02-07 10:00:00+00','2026-02-07 14:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t5,false,'2026-02-08 10:00:00+00','Portón corredizo con rodamientos desgastados. Guía inferior con acumulación de escombros y oxidación.','Falta de mantenimiento. Rodamientos sin lubricación por años.','Portón funcional pero con dificultad. Riesgo de bloqueo total.',1,'Rodamientos 6205 x4, lubricante especial, pintura anticorrosiva',0,NULL,2) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de rodamientos, limpieza de guías y lubricación de portón.',20000,32000,5200,57200,'aprobado','2026-02-09 11:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',57200,'transferencia','TRF-0107','2026-02-10 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c4,'final',1,false,'https://placehold.co/400x600.jpg','2026-02-13 15:00:00+00','2026-02-13 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t5,3,'El trabajo quedó bien pero tardó más de lo previsto. El portón funciona.',1,'2026-02-14 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t5,pres,inc,52000,'transferencia','PT-0107','2026-02-14 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t5),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t5 AND estado_asignacion='completada') WHERE id_tecnico=t5;

  -- ── CASO 08: Plomería · c1 · t2 · Feb 9-17 ───────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c1,i1,'Inodoro con pérdida de agua constante. El flotante no corta el paso de agua.','Plomería','finalizado','2026-02-09 08:30:00+00','2026-02-17 16:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t2,'completada','2026-02-10 09:00:00+00','2026-02-10 13:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t2,false,'2026-02-11 10:00:00+00','Mochila de inodoro con flotante roto. Agua corre permanentemente al pocillo.','Flotante plástico deteriorado por tiempo. Sello de válvula desgastado.','Desperdicio de agua constante.',1,'Flotante universal, válvula de entrada, sello',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de mecanismo de mochila de inodoro.',10000,22000,3200,35200,'aprobado','2026-02-12 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',35200,'efectivo','REC-0108','2026-02-13 09:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c1,'final',1,false,'https://placehold.co/400x600.jpg','2026-02-16 15:00:00+00','2026-02-16 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t2,4,'Buen trabajo. Rápido y sin vueltas. El problema quedó resuelto.',1,'2026-02-17 10:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t2,pres,inc,32000,'transferencia','PT-0108','2026-02-17 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t2),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t2 AND estado_asignacion='completada') WHERE id_tecnico=t2;

  -- ── CASO 09: Fumigación · c2 · t2 · Feb 12-18 ────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c2,i2,'Presencia de cucarachas en cocina y despensa. Situación empeoró en la última semana.','Fumigación','finalizado','2026-02-12 10:00:00+00','2026-02-18 16:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t2,'completada','2026-02-13 09:00:00+00','2026-02-13 11:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t2,false,'2026-02-14 10:00:00+00','Infestación de cucarachas en sector cocina y despensa. Huellas y excrementos visibles.','Ingreso por cañerías. Acumulación de humedad favorece proliferación.','Riesgo sanitario y contaminación de alimentos.',1,'Insecticida gel profesional, polvo residual, trampas',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Fumigación profesional de cocina y despensa con productos residuales.',5000,12000,1700,18700,'aprobado','2026-02-15 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',18700,'efectivo','REC-0109','2026-02-15 14:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c2,'final',1,false,'https://placehold.co/400x600.jpg','2026-02-17 15:00:00+00','2026-02-17 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t2,5,'Excelente. No volvimos a ver cucarachas. El producto que usaron fue muy efectivo.',1,'2026-02-18 10:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t2,pres,inc,17000,'transferencia','PT-0109','2026-02-18 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t2),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t2 AND estado_asignacion='completada') WHERE id_tecnico=t2;

  -- ── CASO 10: Gas · c3 · t1 · Feb 15-22 ───────────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c3,i3,'Olor a gas en cocina. La hornalla no enciende y hay fuerte olor al abrir la llave de paso.','Gas','finalizado','2026-02-15 08:00:00+00','2026-02-22 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t1,'completada','2026-02-16 09:00:00+00','2026-02-16 10:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t1,false,'2026-02-17 10:00:00+00','Pérdida de gas en conexión flexible de cocina. Flexible agrietado. Detección con espuma, burbujeo confirmado.','Flexible de gas con más de 10 años de uso. Material deteriorado por temperatura.','Pérdida de gas. Riesgo de explosión o intoxicación.',1,'Flexible gas certificado 60cm, llave esférica, teflón',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de flexible de gas y prueba de estanqueidad.',25000,45000,7000,77000,'aprobado','2026-02-18 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',77000,'transferencia','TRF-0110','2026-02-19 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c3,'final',1,false,'https://placehold.co/400x600.jpg','2026-02-21 15:00:00+00','2026-02-21 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t1,4,'Muy rápido para una urgencia de gas. Explicó bien el peligro y la solución.',1,'2026-02-22 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t1,pres,inc,70000,'transferencia','PT-0110','2026-02-22 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t1),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t1 AND estado_asignacion='completada') WHERE id_tecnico=t1;

  -- ── CASO 11: Climatización · c4 · t4 (Julian 5★) · Feb 18-25 ─────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c4,i4,'Aire acondicionado split no enfría. Arranca pero el aire sale caliente. Unidad exterior hace ruido.','Climatización','finalizado','2026-02-18 09:00:00+00','2026-02-25 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t4,'completada','2026-02-19 10:00:00+00','2026-02-19 14:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t4,false,'2026-02-20 10:00:00+00','Split 3000 frig con nivel de gas refrigerante bajo. Compresor funcional. Filtros sucios.','Pérdida de gas R32 por micro-fisura en conexión. Filtros sin limpieza en 3 años.','Equipo ineficiente. Sin enfriamiento efectivo.',1,'Gas R32 1kg, kit detección fugas, limpiador filtros',0,NULL,2) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Detección y sellado de fuga, recarga de gas R32 y limpieza completa de filtros.',40000,65000,10500,115500,'aprobado','2026-02-21 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',115500,'transferencia','TRF-0111','2026-02-22 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c4,'final',1,false,'https://placehold.co/400x600.jpg','2026-02-24 15:00:00+00','2026-02-24 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t4,5,'Julian es un crack. Encontró la pérdida en minutos, explicó todo y el aire ahora enfría genial.',1,'2026-02-25 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t4,pres,inc,105000,'transferencia','PT-0111','2026-02-25 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t4),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t4 AND estado_asignacion='completada') WHERE id_tecnico=t4;

  -- ── CASO 12: Carpintería · c1 · t3 · Feb 21-28 ───────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c1,i1,'Placard de dormitorio con puerta caída. La bisagra superior se rompió y la puerta cuelga.','Carpintería','finalizado','2026-02-21 10:00:00+00','2026-02-28 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t3,'completada','2026-02-22 09:00:00+00','2026-02-22 12:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t3,false,'2026-02-23 10:00:00+00','Puerta de placard 60x200cm con bisagra superior cedida. Marco en buen estado.','Bisagra de aluminio económica cedió por el peso de la puerta.','Puerta sin soporte. Riesgo de caída.',1,'Bisagras reforzadas 4" x2, tornillos largos, taco plástico',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de bisagras de placard y ajuste de puerta.',14000,28000,4200,46200,'aprobado','2026-02-24 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',46200,'efectivo','REC-0112','2026-02-25 09:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c1,'final',1,false,'https://placehold.co/400x600.jpg','2026-02-27 15:00:00+00','2026-02-27 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t3,4,'Buen trabajo y a buen precio. La puerta quedó firme.',1,'2026-02-28 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t3,pres,inc,42000,'transferencia','PT-0112','2026-02-28 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t3),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t3 AND estado_asignacion='completada') WHERE id_tecnico=t3;

  -- ── CASO 13: Cerrajería · c2 · t10 · Mar 1-8 ─────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c2,i2,'Llave de puerta trasera rota dentro de la cerradura. No se puede extraer ni abrir.','Cerrajería','finalizado','2026-03-01 09:00:00+00','2026-03-08 16:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t10,'completada','2026-03-02 09:00:00+00','2026-03-02 11:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t10,false,'2026-03-03 10:00:00+00','Llave partida dentro del cilindro de cerradura estándar. Mitad visible, mitad dentro.','Llave con desgaste y posible doblez previo. Se partió al girar con fuerza.','Puerta inaccesible desde exterior.',1,'Cerradura de reemplazo, juego de llaves',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Extracción de llave partida y reemplazo de cilindro.',3500,12000,1550,17050,'aprobado','2026-03-04 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',17050,'efectivo','REC-0113','2026-03-04 14:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c2,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-07 15:00:00+00','2026-03-07 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t10,5,'Llegó rápido y sacó la llave sin dañar la puerta. Muy profesional.',1,'2026-03-08 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t10,pres,inc,15500,'transferencia','PT-0113','2026-03-08 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t10),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t10 AND estado_asignacion='completada') WHERE id_tecnico=t10;

  -- ── CASO 14: Electricidad · c3 · t7 · Mar 3-10 ───────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c3,i3,'Tomacorriente de living quemado con olor a plástico. Uno de los enchufes no da tensión.','Electricidad','finalizado','2026-03-03 09:00:00+00','2026-03-10 16:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t7,'completada','2026-03-04 09:00:00+00','2026-03-04 12:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t7,false,'2026-03-05 10:00:00+00','Tomacorriente doble quemado. Contactos internos fundidos. Olor a plástico quemado.','Sobrecarga en el circuito. Conexión suelta que generó arco eléctrico.','Riesgo de incendio eléctrico.',1,'Tomacorriente doble 10/16A, caja de pared, cable 2.5mm',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de tomacorriente quemado y revisión del circuito.',9000,30000,3900,42900,'aprobado','2026-03-06 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',42900,'transferencia','TRF-0114','2026-03-07 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c3,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-09 15:00:00+00','2026-03-09 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t7,4,'Buen trabajo. Encontró el problema de fondo y lo solucionó.',1,'2026-03-10 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t7,pres,inc,39000,'transferencia','PT-0114','2026-03-10 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t7),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t7 AND estado_asignacion='completada') WHERE id_tecnico=t7;

  -- ── CASO 15: Pintura · c4 · t6 · Mar 5-12 ────────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c4,i4,'Techo del baño con manchas marrones extensas por goteras del piso de arriba. Pintura desprendida.','Pintura','finalizado','2026-03-05 08:00:00+00','2026-03-12 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t6,'completada','2026-03-06 09:00:00+00','2026-03-06 14:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t6,false,'2026-03-07 10:00:00+00','Techo baño con manchas extensas y pintura descascarada. Superficie húmeda al tacto.','Filtración desde piso superior. La gotera mojó el techo reiteradamente.','Daño estético severo. Posible daño en yeso si continúa.',1,'Sellador latex, pintura interior blanca, rodillo',0,NULL,2) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Tratamiento y repintura de techo de baño afectado por gotera.',22000,50000,7200,79200,'aprobado','2026-03-08 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',79200,'transferencia','TRF-0115','2026-03-09 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c4,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-11 15:00:00+00','2026-03-11 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t6,5,'El techo quedó impecable. Trabajó prolijo y sin ensuciar nada.',1,'2026-03-12 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t6,pres,inc,72000,'transferencia','PT-0115','2026-03-12 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t6),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t6 AND estado_asignacion='completada') WHERE id_tecnico=t6;

  -- ── CASO 16: Albañilería · c1 · t8 · Mar 7-14 ────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c1,i1,'Baldosas del baño fisuradas y desprendidas en zona de ducha. Riesgo de caída.','Albañilería','finalizado','2026-03-07 09:00:00+00','2026-03-14 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t8,'completada','2026-03-08 09:00:00+00','2026-03-08 13:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t8,false,'2026-03-09 10:00:00+00','5 baldosas fisuradas en zona de ducha. 2 completamente desprendidas. Contrapiso húmedo.','Movimiento diferencial y adhesivo deteriorado. Agua filtró por juntas.','Riesgo de caída y daño en contrapiso.',1,'Pegamento cerámico, baldosas 30x30 similares, pastina',0,NULL,3) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Retiro y reemplazo de baldosas dañadas en zona de ducha, rejuntado completo.',45000,65000,11000,121000,'aprobado','2026-03-10 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',121000,'transferencia','TRF-0116','2026-03-11 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c1,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-13 15:00:00+00','2026-03-13 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t8,4,'Buen trabajo. Las baldosas quedaron bien colocadas. Tardó un poco más.',1,'2026-03-14 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t8,pres,inc,110000,'transferencia','PT-0116','2026-03-14 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t8),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t8 AND estado_asignacion='completada') WHERE id_tecnico=t8;

  -- ── CASO 17: Herrería · c2 · t4 (Julian 5★) · Mar 9-16 ───────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c2,i2,'Escalera de hierro exterior oxidada con peldaño flojo. Riesgo de accidente al subir.','Herrería','finalizado','2026-03-09 08:00:00+00','2026-03-16 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t4,'completada','2026-03-10 09:00:00+00','2026-03-10 13:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t4,false,'2026-03-11 10:00:00+00','Escalera exterior 6 peldaños. Tercer peldaño con soldadura rota. Oxidación generalizada en pasamanos.','Falta de mantenimiento. Exposición a lluvia sin protección anticorrosiva.','Peldaño inseguro. Pasamanos con corrosión avanzada.',1,'Electrodo soldadura, lija, convertidor óxido, esmalte sintético negro',0,NULL,2) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Soldadura de peldaño, tratamiento anticorrosivo y pintura de escalera exterior.',22000,42000,6400,70400,'aprobado','2026-03-12 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',70400,'transferencia','TRF-0117','2026-03-13 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c2,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-15 15:00:00+00','2026-03-15 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t4,5,'Julian hizo un trabajo impecable. La escalera quedó como nueva y segura.',1,'2026-03-16 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t4,pres,inc,64000,'transferencia','PT-0117','2026-03-16 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t4),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t4 AND estado_asignacion='completada') WHERE id_tecnico=t4;

  -- ── CASO 18: Plomería · c3 · t1 · Mar 11-18 ──────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c3,i3,'Canilla de lavatorio con goteo permanente aunque esté cerrada. Pierde agua constantemente.','Plomería','finalizado','2026-03-11 09:00:00+00','2026-03-18 16:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t1,'completada','2026-03-12 09:00:00+00','2026-03-12 14:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t1,false,'2026-03-13 10:00:00+00','Canilla monocomando con pérdida por cartucho desgastado.','Cartucho cerámico con más de 8 años. Depósito mineral en mecanismo.','Desperdicio de agua. Mancha en cerámica.',1,'Cartucho cerámico 35mm, O-rings',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de cartucho de canilla monocomando lavatorio.',8000,20000,2800,30800,'aprobado','2026-03-14 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',30800,'efectivo','REC-0118','2026-03-14 14:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c3,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-17 15:00:00+00','2026-03-17 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t1,3,'Resolvió el problema pero tardó más de lo esperado en conseguir el repuesto.',1,'2026-03-18 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t1,pres,inc,28000,'transferencia','PT-0118','2026-03-18 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t1),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t1 AND estado_asignacion='completada') WHERE id_tecnico=t1;

  -- ── CASO 19: Carpintería · c4 · t9 · Mar 13-20 ───────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c4,i4,'Ventana de madera de dormitorio con marco podrido. No cierra herméticamente, entra frío y ruido.','Carpintería','finalizado','2026-03-13 10:00:00+00','2026-03-20 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t9,'completada','2026-03-14 09:00:00+00','2026-03-14 12:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t9,false,'2026-03-15 10:00:00+00','Marco de ventana con madera podrida en parte inferior. Burletes inexistentes.','Humedad acumulada por falta de mantenimiento. Sin sellado.',
  'Corriente de aire. Condensación en vidrio.',1,'Madera pino 2x3", sellador para madera, burletes, tornillos',0,NULL,2) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de marco podrido y colocación de burletes en ventana.',16000,35000,5100,56100,'aprobado','2026-03-16 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',56100,'transferencia','TRF-0119','2026-03-17 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c4,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-19 15:00:00+00','2026-03-19 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t9,4,'Muy buen trabajo. La ventana ahora cierra perfectamente y no entra más el frío.',1,'2026-03-20 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t9,pres,inc,51000,'transferencia','PT-0119','2026-03-20 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t9),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t9 AND estado_asignacion='completada') WHERE id_tecnico=t9;

  -- ── CASO 20: Fumigación · c1 · t3 · Mar 15-22 ────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c1,i1,'Hormiguero activo en jardín y cocina. Columnas de hormigas entrando por la ventana de la cocina.','Fumigación','finalizado','2026-03-15 09:00:00+00','2026-03-22 16:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t3,'completada','2026-03-16 09:00:00+00','2026-03-16 11:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t3,false,'2026-03-17 10:00:00+00','Hormiguero principal en jardín exterior, ramificaciones ingresando por junta de ventana cocina.','Nido maduro buscando alimentos. Época de expansión primaveral.','Contaminación de alimentos. Problema sanitario.',1,'Cebo hormiguicida profesional, insecticida perimetral',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Tratamiento de hormiguero con cebo y sellado de ingresos.',7000,15000,2200,24200,'aprobado','2026-03-18 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',24200,'efectivo','REC-0120','2026-03-18 14:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c1,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-21 15:00:00+00','2026-03-21 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t3,5,'Desaparecieron las hormigas en 48hs. Muy efectivo el tratamiento.',1,'2026-03-22 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t3,pres,inc,22000,'transferencia','PT-0120','2026-03-22 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t3),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t3 AND estado_asignacion='completada') WHERE id_tecnico=t3;

  -- ── CASO 21: Gas · c2 · t3 · Mar 17-24 ───────────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c2,i2,'Calefón a gas que no enciende. Sin agua caliente desde hace 2 días.','Gas','finalizado','2026-03-17 08:00:00+00','2026-03-24 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t3,'completada','2026-03-18 09:00:00+00','2026-03-18 13:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t3,false,'2026-03-19 10:00:00+00','Calefón 14L con piloto que no enciende. Termocupla agotada. Electroválvula funcional.','Termocupla agotada por uso. Depósito de carbonilla en quemador.','Sin agua caliente. Imposible uso de ducha.',1,'Termocupla universal, kit limpieza quemador',0,NULL,2) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de termocupla y limpieza de quemador de calefón.',30000,55000,8500,93500,'aprobado','2026-03-20 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',93500,'transferencia','TRF-0121','2026-03-21 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c2,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-23 15:00:00+00','2026-03-23 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t3,4,'Solucionó el problema sin inconvenientes. El calefón funciona perfecto.',1,'2026-03-24 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t3,pres,inc,85000,'transferencia','PT-0121','2026-03-24 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t3),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t3 AND estado_asignacion='completada') WHERE id_tecnico=t3;

  -- ── CASO 22: Herrería · c3 · t5 · Mar 19-26 ──────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c3,i3,'Barandas del balcón con tres balaustres rotos. Riesgo de caída al primer piso.','Herrería','finalizado','2026-03-19 09:00:00+00','2026-03-26 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t5,'completada','2026-03-20 09:00:00+00','2026-03-20 14:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t5,false,'2026-03-21 10:00:00+00','Baranda de balcón con 3 balaustres de hierro redondo rotos al nivel del piso.','Oxidación interna avanzada. Golpes acumulados debilitaron la sección inferior.','Riesgo de caída. Baranda no cumple función de seguridad.',1,'Hierro redondo 3/4" x 3m, electrodo, anticorrosivo, esmalte',0,NULL,2) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de balaustres rotos, soldadura y pintura anticorrosiva.',18000,38000,5600,61600,'aprobado','2026-03-22 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',61600,'transferencia','TRF-0122','2026-03-23 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c3,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-25 15:00:00+00','2026-03-25 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t5,4,'Buen trabajo. La baranda quedó firme y segura.',1,'2026-03-26 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t5,pres,inc,56000,'transferencia','PT-0122','2026-03-26 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t5),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t5 AND estado_asignacion='completada') WHERE id_tecnico=t5;

  -- ── CASO 23: Electricidad · c4 · t7 · Mar 21-28 ──────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c4,i4,'Luz de escalera interna con sensor de movimiento que no funciona. Queda encendida permanentemente.','Electricidad','finalizado','2026-03-21 10:00:00+00','2026-03-28 16:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t7,'completada','2026-03-22 09:00:00+00','2026-03-22 13:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t7,false,'2026-03-23 10:00:00+00','Sensor de movimiento quemado. Luz permanece encendida sin presencia.','Sensor de bajo costo averiado. Instalación de hace 6 años sin mantenimiento.','Alto consumo eléctrico. Bombilla sobrecalentada.',1,'Sensor movimiento empotrable 360°, bombilla LED 12W',0,NULL,1) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de sensor de movimiento y bombilla en escalera.',11000,32000,4300,47300,'aprobado','2026-03-24 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',47300,'efectivo','REC-0123','2026-03-25 09:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c4,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-27 15:00:00+00','2026-03-27 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t7,5,'Muy eficiente. El sensor nuevo funciona mucho mejor que el anterior.',1,'2026-03-28 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t7,pres,inc,43000,'transferencia','PT-0123','2026-03-28 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t7),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t7 AND estado_asignacion='completada') WHERE id_tecnico=t7;

  -- ── CASO 24: Pintura · c1 · t6 · Mar 23-30 ───────────────────────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c1,i1,'Frente de casa con pintura descascarada por heladas. Varios sectores con revoque expuesto.','Pintura','finalizado','2026-03-23 09:00:00+00','2026-03-30 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t6,'completada','2026-03-24 09:00:00+00','2026-03-24 14:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t6,false,'2026-03-25 10:00:00+00','Frente exterior 30m² con pintura descascarada en 60% de la superficie. Revoque expuesto en zonas altas.','Pintura sin imprimación y ciclos de helada/deshielo que despegaron la película.','Deterioro estético y exposición de revoque a la humedad.',1,'Imprimación, pintura exterior texturada beige, lija',1,1,4) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Preparación y repintura de frente exterior 30m² con imprimación y pintura texturada.',25000,55000,8000,88000,'aprobado','2026-03-26 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',88000,'transferencia','TRF-0124','2026-03-27 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c1,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-29 15:00:00+00','2026-03-29 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t6,4,'Buen resultado. El frente quedó lindo, aunque tardó un poco más de lo previsto.',1,'2026-03-30 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t6,pres,inc,80000,'transferencia','PT-0124','2026-03-30 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t6),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t6 AND estado_asignacion='completada') WHERE id_tecnico=t6;

  -- ── CASO 25: Carpintería · c2 · t4 (Julian 5★) · Mar 25-Abr 1 ────────────
  INSERT INTO public.incidentes(id_cliente_reporta,id_propiedad,descripcion_problema,categoria,estado_actual,fecha_registro,fecha_cierre,fue_resuelto)
  VALUES(c2,i2,'Escalera de madera interior con peldaño central roto. Peligro de accidente al subir.','Carpintería','finalizado','2026-03-25 08:00:00+00','2026-04-01 17:00:00+00',1) RETURNING id_incidente INTO inc;
  INSERT INTO public.asignaciones_tecnico(id_incidente,id_tecnico,estado_asignacion,fecha_asignacion,fecha_aceptacion)
  VALUES(inc,t4,'completada','2026-03-26 09:00:00+00','2026-03-26 13:00:00+00') RETURNING id_asignacion INTO asig;
  INSERT INTO public.inspecciones(id_incidente,id_tecnico,esta_anulada,fecha_inspeccion,descripcion_inspeccion,causas_determinadas,danos_ocasionados,requiere_materiales,descripcion_materiales,requiere_ayudantes,cantidad_ayudantes,dias_estimados_trabajo)
  VALUES(inc,t4,false,'2026-03-27 10:00:00+00','Peldaño N°6 de escalera interior de madera cedro completamente partido. Otros peldaños con pequeñas fisuras.','Madera con más de 20 años. Impacto puntual sobre zona debilitada.','Riesgo de accidente. Imposible usar escalera con seguridad.',1,'Tabla cedro 30x4cm, tornillos madera, barniz',0,NULL,2) RETURNING id_inspeccion INTO insp;
  INSERT INTO public.presupuestos(id_incidente,id_inspeccion,descripcion_detallada,costo_materiales,costo_mano_obra,gastos_administrativos,costo_total,estado_presupuesto,fecha_aprobacion)
  VALUES(inc,insp,'Reemplazo de peldaño roto y refuerzo de los adyacentes.',20000,35000,5500,60500,'aprobado','2026-03-28 10:00:00+00') RETURNING id_presupuesto INTO pres;
  INSERT INTO public.pagos(id_incidente,id_presupuesto,tipo_pago,monto_pagado,metodo_pago,numero_comprobante,fecha_pago)
  VALUES(inc,pres,'total',60500,'transferencia','TRF-0125','2026-03-29 10:00:00+00');
  INSERT INTO public.conformidades(id_incidente,id_cliente,tipo_conformidad,esta_firmada,esta_rechazada,url_documento,fecha_creacion,fecha_conformidad)
  VALUES(inc,c2,'final',1,false,'https://placehold.co/400x600.jpg','2026-03-31 15:00:00+00','2026-03-31 15:00:00+00') RETURNING id_conformidad INTO conf;
  INSERT INTO public.calificaciones(id_incidente,id_tecnico,puntuacion,comentarios,resolvio_problema,fecha_calificacion)
  VALUES(inc,t4,5,'Julian hizo un trabajo hermoso. El peldaño nuevo encajó perfecto y barnizó toda la escalera.',1,'2026-04-01 09:00:00+00');
  INSERT INTO public.pagos_tecnicos(id_tecnico,id_presupuesto,id_incidente,monto_pago,metodo_pago,referencia_pago,fecha_pago)
  VALUES(t4,pres,inc,55000,'transferencia','PT-0125','2026-04-01 11:00:00+00');
  UPDATE public.tecnicos SET calificacion_promedio=(SELECT ROUND(AVG(puntuacion)::numeric,1) FROM public.calificaciones WHERE id_tecnico=t4),cantidad_trabajos_realizados=(SELECT COUNT(*) FROM public.asignaciones_tecnico WHERE id_tecnico=t4 AND estado_asignacion='completada') WHERE id_tecnico=t4;

  RAISE NOTICE 'PARTE 1 COMPLETADA — 25 casos insertados';
END $$;
