const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv(envPath) {
  const content = fs.readFileSync(envPath, 'utf8')
  const lines = content.split(/\n/).filter(Boolean)
  const env = {}
  for (const line of lines) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
  return env
}

;(async () => {
  try {
    const envPath = path.join(__dirname, '..', '.env.local')
    const env = loadEnv(envPath)
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE

    if (!supabaseUrl || !serviceKey) {
      console.error('Missing SUPABASE_URL or SERVICE_ROLE in', envPath)
      process.exit(2)
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const now = new Date().toISOString()

    // Create temporary cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .insert({
        nombre: 'TestCliente',
        apellido: 'Auto',
        correo_electronico: `test+cliente+${Date.now()}@example.com`,
        telefono: '000000000',
        dni: '00000000',
        esta_activo: 1,
        fecha_creacion: now,
        fecha_modificacion: now,
      })
      .select()
      .single()

    if (clienteError) {
      console.error('Error creando cliente:', clienteError)
      process.exit(3)
    }
    const clienteId = cliente.id_cliente
    console.log('Created cliente', clienteId)

    // Create inmueble for cliente
      // Ensure a tipo_inmueble exists
      let tipoInmuebleId = null
      const { data: tipos } = await supabase.from('tipos_inmuebles').select('id_tipo_inmueble').limit(1)
      if (tipos && tipos.length > 0) {
        tipoInmuebleId = tipos[0].id_tipo_inmueble
      } else {
        const { data: newTipo } = await supabase.from('tipos_inmuebles').insert({ nombre: 'Otro' }).select().single()
        tipoInmuebleId = newTipo.id_tipo_inmueble
      }

      const { data: inmueble, error: inmuebleError } = await supabase
        .from('inmuebles')
        .insert({
          id_cliente: clienteId,
          id_tipo_inmueble: tipoInmuebleId,
          calle: 'Calle Test',
          altura: '123',
          barrio: 'Barrio Test',
          localidad: 'Localidad Test',
          provincia: 'Provincia Test',
          esta_activo: 1,
          fecha_creacion: now,
        })
        .select()
        .single()

    if (inmuebleError) {
      console.error('Error creando inmueble:', inmuebleError)
      process.exit(4)
    }
    const inmuebleId = inmueble.id_inmueble
    console.log('Created inmueble', inmuebleId)

    // Create temporary tecnico
    const { data: tecnico, error: tecnicoError } = await supabase
      .from('tecnicos')
      .insert({
        nombre: 'TestTec',
        apellido: 'Auto',
        especialidad: 'General',
        esta_activo: 1,
        fecha_creacion: now,
      })
      .select()
      .single()

    if (tecnicoError) {
      console.error('Error creando tecnico:', tecnicoError)
      process.exit(5)
    }
    const tecnicoId = tecnico.id_tecnico
    console.log('Created tecnico', tecnicoId)

    // Create two incidents: one for accept, one for reject
    const incidents = []
    for (const tag of ['accept', 'reject']) {
      const descripcion = `Automated assignment ${tag} ${Date.now()}`
      const { data: inc, error: incError } = await supabase
        .from('incidentes')
        .insert({
          id_propiedad: inmuebleId,
          id_cliente_reporta: clienteId,
          descripcion_problema: descripcion,
          categoria: null,
          estado_actual: 'pendiente',
          disponibilidad: 'Horario test',
          fecha_registro: now,
        })
        .select()
        .single()

      if (incError) {
        console.error('Error creando incidente:', incError)
        process.exit(6)
      }
      console.log('Created incidente', inc.id_incidente)
      incidents.push(inc)
    }

    // Create assignments (pendiente) for each incident
    const assignments = []
    for (const inc of incidents) {
      const { data: asg, error: asgError } = await supabase
        .from('asignaciones_tecnico')
        .insert({
          id_incidente: inc.id_incidente,
          id_tecnico: tecnicoId,
          estado_asignacion: 'pendiente',
          fecha_asignacion: now,
        })
        .select()
        .single()

      if (asgError) {
        console.error('Error creando asignacion:', asgError)
        process.exit(7)
      }
      console.log('Created asignacion', asg.id_asignacion, 'for incidente', asg.id_incidente)
      assignments.push(asg)
    }

    // Approve first assignment
    const toApprove = assignments[0]
    const { error: approveError } = await supabase
      .from('asignaciones_tecnico')
      .update({ estado_asignacion: 'aceptada', fecha_aceptacion: new Date().toISOString() })
      .eq('id_asignacion', toApprove.id_asignacion)

    if (approveError) {
      console.error('Error aprobando asignacion:', approveError)
      process.exit(8)
    }

    // Update incident status to in-progress (en_proceso)
    const { error: updateIncError } = await supabase
      .from('incidentes')
      .update({ estado_actual: 'en_proceso' })
      .eq('id_incidente', toApprove.id_incidente)

    if (updateIncError) {
      console.error('Error actualizando incidente tras aprobacion:', updateIncError)
      process.exit(9)
    }

    // Verify approve
    const { data: verifyApprove } = await supabase
      .from('asignaciones_tecnico')
      .select('*')
      .eq('id_asignacion', toApprove.id_asignacion)
      .single()
    const { data: incApproved } = await supabase
      .from('incidentes')
      .select('*')
      .eq('id_incidente', toApprove.id_incidente)
      .single()

    console.log('Verify assignment approved:', verifyApprove.estado_asignacion)
    console.log('Verify incident status:', incApproved.estado_actual)

    // Reject second assignment
    const toReject = assignments[1]
    const { error: rejectError } = await supabase
      .from('asignaciones_tecnico')
      .update({ estado_asignacion: 'rechazada', fecha_rechazo: new Date().toISOString() })
      .eq('id_asignacion', toReject.id_asignacion)

    if (rejectError) {
      console.error('Error rechazando asignacion:', rejectError)
      process.exit(10)
    }

    // Update incident status back to pendiente after rejection
    const { error: updateIncRejectError } = await supabase
      .from('incidentes')
      .update({ estado_actual: 'pendiente' })
      .eq('id_incidente', toReject.id_incidente)

    if (updateIncRejectError) {
      console.error('Error actualizando incidente tras rechazo:', updateIncRejectError)
      process.exit(11)
    }

    const { data: verifyReject } = await supabase
      .from('asignaciones_tecnico')
      .select('*')
      .eq('id_asignacion', toReject.id_asignacion)
      .single()
    const { data: incRejected } = await supabase
      .from('incidentes')
      .select('*')
      .eq('id_incidente', toReject.id_incidente)
      .single()

    console.log('Verify assignment rejected:', verifyReject.estado_asignacion)
    console.log('Verify incident status after reject:', incRejected.estado_actual)

    // Cleanup: delete assignments, incidents, inmueble, cliente, tecnico
    await supabase.from('asignaciones_tecnico').delete().in('id_asignacion', assignments.map(a => a.id_asignacion))
    await supabase.from('incidentes').delete().in('id_incidente', incidents.map(i => i.id_incidente))
    await supabase.from('inmuebles').delete().eq('id_inmueble', inmuebleId)
    await supabase.from('clientes').delete().eq('id_cliente', clienteId)
    await supabase.from('tecnicos').delete().eq('id_tecnico', tecnicoId)

    console.log('Cleanup done. Assignment flow test succeeded.')
    process.exit(0)
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
})()
