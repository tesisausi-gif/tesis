'use server'

/**
 * Servicio de Usuarios
 * Lecturas y escrituras para Server Components y Server Actions
 *
 * NOTA: Para getCurrentUser() usar @/features/auth/auth.service
 */

import { translateDbError } from '@/shared/lib/db-errors'
import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import type { Usuario, Cliente, Tecnico, TecnicoActivo } from './usuarios.types'
import type { ActionResult } from '@/shared/types'

// --- Lecturas ---

/**
 * Obtener todos los usuarios (admin)
 */
export async function getUsuarios(): Promise<Usuario[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as Usuario[]
}

/**
 * Obtener empleados (admin/gestor)
 */
export async function getEmpleados(): Promise<Usuario[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .in('rol', ['admin', 'gestor'])
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as Usuario[]
}

/**
 * Obtener todos los clientes (admin) - usa admin client para bypass RLS
 */
export async function getClientesAdmin(): Promise<Cliente[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as Cliente[]
}

/**
 * Verificar si un email ya está registrado como cliente.
 * Usa adminClient para evitar restricciones de RLS en el registro público.
 */
export async function verificarEmailDisponible(email: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clientes')
    .select('id_cliente')
    .eq('correo_electronico', email)
    .limit(1)
  return !data || data.length === 0
}

/**
 * Obtener todos los clientes (admin)
 */
export async function getClientes(): Promise<Cliente[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as Cliente[]
}

/**
 * Obtener cliente por ID
 */
export async function getClienteById(idCliente: number): Promise<Cliente> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id_cliente', idCliente)
    .single()

  if (error) throw error
  return data as Cliente
}

/**
 * Obtener todos los técnicos (admin)
 * Calificación y cantidad de trabajos se calculan desde la tabla calificaciones (no dependen de columnas denormalizadas).
 */
export async function getTecnicos(): Promise<Tecnico[]> {
  const supabase = createAdminClient()

  const [tecnicosRes, calsRes] = await Promise.all([
    supabase.from('tecnicos').select('*').order('id_tecnico', { ascending: false }),
    supabase.from('calificaciones').select('id_tecnico, puntuacion'),
  ])

  if (tecnicosRes.error) throw tecnicosRes.error

  // Agrupar calificaciones por técnico
  const calsPorTecnico = new Map<number, number[]>()
  for (const c of calsRes.data ?? []) {
    const arr = calsPorTecnico.get(c.id_tecnico) ?? []
    arr.push(c.puntuacion)
    calsPorTecnico.set(c.id_tecnico, arr)
  }

  return (tecnicosRes.data ?? []).map((t: any) => {
    const cals = calsPorTecnico.get(t.id_tecnico) ?? []
    const cantidad = cals.length
    const promedio = cantidad > 0
      ? parseFloat((cals.reduce((s, v) => s + v, 0) / cantidad).toFixed(2))
      : null
    return { ...t, cantidad_trabajos_realizados: cantidad, calificacion_promedio: promedio }
  }) as Tecnico[]
}

/**
 * Obtener técnicos activos (para selects de asignación)
 */
export async function getTecnicosActivos(): Promise<TecnicoActivo[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tecnicos')
    .select('id_tecnico, nombre, apellido, especialidad, especialidades')
    .eq('esta_activo', true)
    .order('nombre')

  if (error) throw error
  return data as TecnicoActivo[]
}

/**
 * Obtener técnicos activos con calificación y trabajos (para modal de asignación)
 */
export async function getTecnicosParaAsignacion(): Promise<Tecnico[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .eq('esta_activo', true)
    .order('calificacion_promedio', { ascending: false })

  if (error) throw error
  return data as Tecnico[]
}

export interface FiabilidadTecnico {
  id_tecnico: number
  /** % de asignaciones que rechazó (no aceptó) (0–100) */
  tasaRechazo: number
  rechazadas: number
  /** % de asignaciones que canceló tras aceptar (0–100) */
  tasaCancelacion: number
  canceladas: number
  totalAsignaciones: number
}

/**
 * Calcula tasa de rechazo y cancelación de cada técnico.
 * Se usa en el modal de asignación para mostrar confiabilidad.
 */
export async function getFiabilidadTecnicos(): Promise<Record<number, FiabilidadTecnico>> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('asignaciones_tecnico')
    .select('id_tecnico, estado_asignacion')
    // 'superada' se excluye: el admin reasignó o aceptó otro técnico — no es decisión del técnico
    .in('estado_asignacion', ['completada', 'cancelada', 'en_curso', 'aceptada', 'rechazada'])

  const stats: Record<number, { total: number; canceladas: number; rechazadas: number }> = {}
  for (const row of (data ?? []) as any[]) {
    if (!stats[row.id_tecnico]) stats[row.id_tecnico] = { total: 0, canceladas: 0, rechazadas: 0 }
    stats[row.id_tecnico].total++
    if (row.estado_asignacion === 'cancelada') stats[row.id_tecnico].canceladas++
    if (row.estado_asignacion === 'rechazada') stats[row.id_tecnico].rechazadas++
  }

  const result: Record<number, FiabilidadTecnico> = {}
  for (const [id, s] of Object.entries(stats)) {
    const idN = Number(id)
    result[idN] = {
      id_tecnico: idN,
      rechazadas: s.rechazadas,
      tasaRechazo: s.total > 0 ? Math.round((s.rechazadas / s.total) * 100) : 0,
      canceladas: s.canceladas,
      tasaCancelacion: s.total > 0 ? Math.round((s.canceladas / s.total) * 100) : 0,
      totalAsignaciones: s.total,
    }
  }
  return result
}

/**
 * Obtener técnico por ID
 */
export async function getTecnicoById(idTecnico: number): Promise<Tecnico> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .eq('id_tecnico', idTecnico)
    .single()

  if (error) throw error
  return data as Tecnico
}

/**
 * Obtener inmuebles de un cliente
 */
export async function getInmueblesDeCliente(idCliente: number): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inmuebles')
    .select('*, tipos_inmuebles(nombre)')
    .eq('id_cliente', idCliente)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtener solicitudes de registro
 */
export async function getSolicitudesRegistro(): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('solicitudes_registro')
    .select('*')
    .order('fecha_solicitud', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtener especialidades
 */
export async function getEspecialidades(): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('especialidades')
    .select('*')
    .order('nombre')

  if (error) throw error
  return data || []
}

/**
 * Obtener especialidades activas
 */
export async function getEspecialidadesActivas(): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('especialidades')
    .select('id_especialidad, nombre')
    .eq('esta_activa', true)
    .order('nombre')

  if (error) throw error
  return data || []
}

/**
 * Obtener calificaciones de un técnico
 */
export async function getCalificacionesTecnico(idTecnico: number): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calificaciones')
    .select(`
      *,
      incidentes:id_incidente (
        descripcion_problema
      )
    `)
    .eq('id_tecnico', idTecnico)
    .order('fecha_calificacion', { ascending: false })

  if (error) throw error
  return (data || []).map((cal: any) => ({
    ...cal,
    incidente_descripcion: cal.incidentes?.descripcion_problema,
  }))
}

// --- Escrituras: Técnicos ---

export async function toggleActivoTecnico(
  idTecnico: number,
  nuevoEstado: boolean
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    // Obtener email del técnico para localizar el auth user
    const { data: tec } = await supabase
      .from('tecnicos')
      .select('correo_electronico')
      .eq('id_tecnico', idTecnico)
      .maybeSingle()

    const { error } = await supabase
      .from('tecnicos')
      .update({ esta_activo: nuevoEstado })
      .eq('id_tecnico', idTecnico)

    if (error) return { success: false, error: translateDbError(error) }

    // Si se da de baja, cerrar sesión activa en todos los dispositivos
    if (!nuevoEstado && tec?.correo_electronico) {
      const { data: usr } = await supabase
        .from('usuarios')
        .select('id')
        .eq('correo_electronico', tec.correo_electronico)
        .maybeSingle()
      if (usr?.id) await cerrarSesionesUsuario(usr.id)
    }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado' }
  }
}

export interface VerificacionDesactivacionTecnico {
  incidentesEnProceso: number
  incidentesCancelables: number[]
  incidentesBloqueantes: number[]
}

/**
 * Verifica si un técnico puede ser desactivado según el estado de sus incidentes activos.
 * - Cancelables: sin conformidad subida y sin fue_resuelto → se pueden dar de baja automáticamente.
 * - Bloqueantes: conformidad subida o fue_resuelto=true → impiden la baja.
 */
export async function verificarIncidentesTecnico(
  idTecnico: number
): Promise<ActionResult<VerificacionDesactivacionTecnico>> {
  try {
    const supabase = createAdminClient()

    const { data: asigs, error } = await supabase
      .from('asignaciones_tecnico')
      .select('id_incidente')
      .eq('id_tecnico', idTecnico)
      .in('estado_asignacion', ['pendiente', 'aceptada', 'en_curso', 'completada'])

    if (error) return { success: false, error: error.message }
    if (!asigs || asigs.length === 0) {
      return { success: true, data: { incidentesEnProceso: 0, incidentesCancelables: [], incidentesBloqueantes: [] } }
    }

    const ids = asigs.map(a => a.id_incidente)

    const { data: incidentes, error: errInc } = await supabase
      .from('incidentes')
      .select('id_incidente, fue_resuelto')
      .in('id_incidente', ids)
      .eq('estado_actual', 'en_proceso')

    if (errInc) return { success: false, error: errInc.message }
    if (!incidentes || incidentes.length === 0) {
      return { success: true, data: { incidentesEnProceso: 0, incidentesCancelables: [], incidentesBloqueantes: [] } }
    }

    const idsEnProceso = incidentes.map(i => i.id_incidente)

    const { data: conformidades } = await supabase
      .from('conformidades')
      .select('id_incidente')
      .in('id_incidente', idsEnProceso)
      .not('url_documento', 'is', null)

    const idsConConformidad = new Set((conformidades ?? []).map(c => c.id_incidente))
    const idsConFueResuelto = new Set(incidentes.filter(i => i.fue_resuelto).map(i => i.id_incidente))

    const bloqueantes = idsEnProceso.filter(id => idsConConformidad.has(id) || idsConFueResuelto.has(id))
    const cancelables = idsEnProceso.filter(id => !idsConConformidad.has(id) && !idsConFueResuelto.has(id))

    return {
      success: true,
      data: {
        incidentesEnProceso: idsEnProceso.length,
        incidentesCancelables: cancelables,
        incidentesBloqueantes: bloqueantes,
      },
    }
  } catch {
    return { success: false, error: 'Error inesperado al verificar incidentes del técnico' }
  }
}

/**
 * Desactiva un técnico cancelando previamente sus incidentes cancelables.
 * Requiere haber verificado que no hay incidentes bloqueantes.
 */
export async function desactivarTecnicoConBajas(
  idTecnico: number,
  incidentesCancelables: number[]
): Promise<ActionResult> {
  try {
    const { darDeBajaIncidente } = await import('@/features/asignaciones/asignaciones.service')

    for (const idIncidente of incidentesCancelables) {
      const res = await darDeBajaIncidente(idIncidente, 'El técnico asignado fue dado de baja del sistema')
      if (!res.success) return { success: false, error: `Error al cancelar incidente #${idIncidente}: ${res.error}` }
    }

    return await toggleActivoTecnico(idTecnico, false)
  } catch {
    return { success: false, error: 'Error inesperado al desactivar técnico' }
  }
}

export async function actualizarTecnico(
  idTecnico: number,
  data: {
    nombre: string
    apellido: string
    correo_electronico: string
    telefono: string | null
    dni: string | null
    direccion: string | null
    especialidades: string[]
  }
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    // Si el email cambió, sincronizar con auth.users y usuarios
    const { data: tecActual } = await supabase
      .from('tecnicos')
      .select('correo_electronico')
      .eq('id_tecnico', idTecnico)
      .maybeSingle()

    if (tecActual?.correo_electronico && tecActual.correo_electronico !== data.correo_electronico) {
      const { data: usr } = await supabase
        .from('usuarios')
        .select('id')
        .eq('correo_electronico', tecActual.correo_electronico)
        .maybeSingle()
      if (usr?.id) {
        await supabase.auth.admin.updateUserById(usr.id, { email: data.correo_electronico, email_confirm: true })
        await supabase.from('usuarios').update({ correo_electronico: data.correo_electronico }).eq('id', usr.id)
      }
    }

    const { error } = await supabase
      .from('tecnicos')
      .update({
        ...data,
        especialidad: data.especialidades[0] ?? null,
      })
      .eq('id_tecnico', idTecnico)

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al actualizar técnico' }
  }
}

// --- Escrituras: Solicitudes ---

export async function rechazarSolicitud(idSolicitud: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('solicitudes_registro')
      .update({
        estado_solicitud: 'rechazada',
        fecha_aprobacion: new Date().toISOString(),
      })
      .eq('id_solicitud', idSolicitud)

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al rechazar solicitud' }
  }
}

export async function aprobarSolicitudTecnico(
  solicitudId: number,
): Promise<ActionResult> {
  const supabase = createAdminClient()

  // 1. Obtener la solicitud
  const { data: solicitud, error: solicitudError } = await supabase
    .from('solicitudes_registro')
    .select('*')
    .eq('id_solicitud', solicitudId)
    .single()

  if (solicitudError || !solicitud) {
    return { success: false, error: 'Solicitud no encontrada' }
  }

  // Contraseña temporal legible (obligatoriamente cambiada en el primer login)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const passwordTemporal = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  // 2. Crear usuario en Supabase Auth. Rol 'gestor' para que el trigger
  //    solo inserte en `usuarios` (sin tocar `tecnicos`).
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: solicitud.email,
    password: passwordTemporal,
    email_confirm: true,
    user_metadata: {
      nombre: solicitud.nombre,
      apellido: solicitud.apellido,
      rol: 'gestor',
      debe_cambiar_password: true,
    },
  })

  if (authError) {
    return { success: false, error: authError.message }
  }

  if (!authData.user) {
    return { success: false, error: 'No se pudo crear el usuario' }
  }

  const authUserId = authData.user.id

  // 3. Insertar manualmente en `tecnicos`
  const { data: tecnicoInsert, error: tecnicoError } = await supabase
    .from('tecnicos')
    .insert({
      nombre: solicitud.nombre,
      apellido: solicitud.apellido,
      correo_electronico: solicitud.email,
      telefono: solicitud.telefono ?? null,
      dni: solicitud.dni ?? null,
      direccion: solicitud.direccion ?? null,
      especialidad: solicitud.especialidad ?? null,
      especialidades: solicitud.especialidades ?? (solicitud.especialidad ? [solicitud.especialidad] : []),
      calificacion_promedio: null,
      cantidad_trabajos_realizados: 0,
      esta_activo: true,
    })
    .select('id_tecnico')
    .single()

  if (tecnicoError) {
    try { await supabase.auth.admin.deleteUser(authUserId) } catch {}
    return { success: false, error: 'Error al crear perfil de técnico' }
  }

  // 4. Actualizar `usuarios`: rol a 'tecnico', vincular id_tecnico, marcar cambio de contraseña
  const { error: updError } = await supabase
    .from('usuarios')
    .update({ rol: 'tecnico', id_tecnico: tecnicoInsert.id_tecnico, debe_cambiar_password: true })
    .eq('id', authUserId)

  if (updError) {
    try { await supabase.from('tecnicos').delete().eq('id_tecnico', tecnicoInsert.id_tecnico) } catch {}
    try { await supabase.auth.admin.deleteUser(authUserId) } catch {}
    return { success: false, error: 'Error al vincular usuario técnico' }
  }

  // 5. Marcar solicitud como aprobada
  await supabase
    .from('solicitudes_registro')
    .update({
      estado_solicitud: 'aprobada',
      fecha_aprobacion: new Date().toISOString(),
    })
    .eq('id_solicitud', solicitudId)

  // 6. Enviar email con credenciales (fire-and-forget)
  try {
    const { enviarCredencialesTecnico } = await import('@/features/email/email.service')
    await enviarCredencialesTecnico({
      destinatario: solicitud.email,
      nombre: solicitud.nombre,
      apellido: solicitud.apellido,
      passwordTemporal,
    })
  } catch (emailError) {
    console.error('[email] Error al enviar credenciales:', emailError)
  }

  return { success: true, data: undefined }
}

export async function crearSolicitudRegistro(data: {
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  dni: string | null
  especialidades: string[]
  direccion: string | null
}): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('solicitudes_registro')
      .insert({
        ...data,
        especialidad: data.especialidades[0] ?? null,
        estado_solicitud: 'pendiente',
      })

    if (error) {
      if (error.code === '23505' && error.message.includes('solicitudes_registro_email_key')) {
        return { success: false, error: 'Ya existe una solicitud registrada con ese correo electrónico. Si ya enviaste una solicitud, aguardá a que sea procesada por el administrador.' }
      }
      return { success: false, error: translateDbError(error) }
    }

    // Notificar al admin sobre la nueva solicitud de registro
    try {
      const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
      const espsLabel = data.especialidades.length > 0 ? ` (${data.especialidades.join(', ')})` : ''
      await crearNotificacionAdmin({
        tipo: 'solicitud_registro',
        titulo: 'Nueva solicitud de técnico',
        mensaje: `${data.nombre} ${data.apellido} solicitó registrarse como técnico${espsLabel}.`,
      })
    } catch { /* no bloquear el registro si la notificación falla */ }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al enviar solicitud' }
  }
}

/**
 * Actualizar perfil propio del técnico (telefono, direccion)
 */
export async function actualizarPerfilTecnico(
  idTecnico: number,
  data: {
    telefono: string | null
    direccion: string | null
    especialidades: string[]
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('tecnicos')
      .update({
        ...data,
        especialidad: data.especialidades[0] ?? null,
      })
      .eq('id_tecnico', idTecnico)

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar perfil' }
  }
}

// --- Escrituras: Especialidades ---

export async function crearEspecialidad(data: {
  nombre: string
  descripcion: string | null
}): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('especialidades')
      .insert(data)

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Ya existe una especialidad con ese nombre' }
      }
      return { success: false, error: translateDbError(error) }
    }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear especialidad' }
  }
}

export async function actualizarEspecialidad(
  idEspecialidad: number,
  data: { nombre: string; descripcion: string | null }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('especialidades')
      .update(data)
      .eq('id_especialidad', idEspecialidad)

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar especialidad' }
  }
}

export async function toggleActivaEspecialidad(
  idEspecialidad: number,
  nuevoEstado: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('especialidades')
      .update({ esta_activa: nuevoEstado })
      .eq('id_especialidad', idEspecialidad)

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado' }
  }
}

// --- Escrituras: Empleados (admin) ---

export async function crearEmpleado(data: {
  email: string
  password: string
  nombre: string
  apellido: string
  rol: string
  telefono?: string
  dni?: string
  direccion?: string
  especialidad?: string
}): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    // Verificar si el email ya existe
    const { data: existingUsers } = await supabase
      .from('usuarios')
      .select('id')
      .eq('correo_electronico', data.email)
      .limit(1)

    if (existingUsers && existingUsers.length > 0) {
      return { success: false, error: 'Este correo electrónico ya está registrado en el sistema' }
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        nombre: data.nombre,
        apellido: data.apellido,
        rol: data.rol,
        telefono: data.telefono,
        dni: data.dni,
        direccion: data.direccion,
        especialidad: data.especialidad,
        ...(data.rol === 'cliente' ? { debe_cambiar_password: true } : {}),
      },
    })

    if (authError) {
      if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
        return { success: false, error: 'Este correo electrónico ya está registrado en el sistema' }
      }
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'No se pudo crear el usuario' }
    }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear usuario' }
  }
}

export async function eliminarUsuario(id: string): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    // 1. Eliminar de tabla usuarios
    await supabase
      .from('usuarios')
      .delete()
      .eq('id', id)

    // 2. Eliminar de Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      return { success: false, error: authError.message }
    }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al eliminar usuario' }
  }
}

export async function actualizarEmpleado(
  id: string,
  data: { nombre: string; apellido: string; rol: string }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('usuarios')
      .update(data)
      .eq('id', id)

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar empleado' }
  }
}

export async function toggleActivoEmpleado(
  id: string,
  nuevoEstado: boolean
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('usuarios')
      .update({ esta_activo: nuevoEstado })
      .eq('id', id)

    if (error) return { success: false, error: translateDbError(error) }

    // id ya es el auth UUID — cerrar sesión al dar de baja
    if (!nuevoEstado) await cerrarSesionesUsuario(id)

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado' }
  }
}

// --- Escrituras: Clientes ---

export async function actualizarCliente(
  idCliente: number,
  data: {
    nombre: string
    apellido: string
    dni: string | null
    telefono: string | null
    correo_electronico: string | null
  }
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    // Si el email cambió, sincronizar con auth.users y usuarios
    const { data: cliActual } = await supabase
      .from('clientes')
      .select('correo_electronico')
      .eq('id_cliente', idCliente)
      .maybeSingle()

    if (data.correo_electronico && cliActual?.correo_electronico &&
        cliActual.correo_electronico !== data.correo_electronico) {
      const { data: usr } = await supabase
        .from('usuarios')
        .select('id')
        .eq('correo_electronico', cliActual.correo_electronico)
        .maybeSingle()
      if (usr?.id) {
        await supabase.auth.admin.updateUserById(usr.id, { email: data.correo_electronico, email_confirm: true })
        await supabase.from('usuarios').update({ correo_electronico: data.correo_electronico }).eq('id', usr.id)
      }
    }

    const { error } = await supabase
      .from('clientes')
      .update(data)
      .eq('id_cliente', idCliente)

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al actualizar cliente' }
  }
}

/**
 * Verifica si un cliente puede ser desactivado.
 * Bloquea si tiene algún incidente activo con presupuesto aprobado por el cliente
 * (en_proceso con estado_presupuesto='aprobado', conformidad subida, o fue_resuelto=true).
 */
export async function verificarIncidentesCliente(
  idCliente: number
): Promise<ActionResult<{ bloqueado: boolean; cantidadBloqueantes: number }>> {
  try {
    const supabase = createAdminClient()

    const { data: incidentes, error } = await supabase
      .from('incidentes')
      .select('id_incidente, fue_resuelto')
      .eq('id_cliente_reporta', idCliente)
      .eq('estado_actual', 'en_proceso')

    if (error) return { success: false, error: error.message }
    if (!incidentes || incidentes.length === 0) {
      return { success: true, data: { bloqueado: false, cantidadBloqueantes: 0 } }
    }

    const ids = incidentes.map(i => i.id_incidente)
    const idsConFueResuelto = new Set(incidentes.filter(i => i.fue_resuelto).map(i => i.id_incidente))

    const { data: presupuestosAprobados } = await supabase
      .from('presupuestos')
      .select('id_incidente')
      .in('id_incidente', ids)
      .eq('estado', 'aprobado')

    const { data: conformidades } = await supabase
      .from('conformidades')
      .select('id_incidente')
      .in('id_incidente', ids)
      .not('url_documento', 'is', null)

    const idsConPresupAprobado = new Set((presupuestosAprobados ?? []).map(p => p.id_incidente))
    const idsConConformidad = new Set((conformidades ?? []).map(c => c.id_incidente))

    const bloqueantes = ids.filter(
      id => idsConPresupAprobado.has(id) || idsConConformidad.has(id) || idsConFueResuelto.has(id)
    )

    return {
      success: true,
      data: { bloqueado: bloqueantes.length > 0, cantidadBloqueantes: bloqueantes.length },
    }
  } catch {
    return { success: false, error: 'Error inesperado al verificar incidentes del cliente' }
  }
}

export async function toggleActivoCliente(
  idCliente: number,
  nuevoEstado: boolean
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    const { data: cli } = await supabase
      .from('clientes')
      .select('correo_electronico')
      .eq('id_cliente', idCliente)
      .maybeSingle()

    const { error } = await supabase
      .from('clientes')
      .update({ esta_activo: nuevoEstado })
      .eq('id_cliente', idCliente)

    if (error) return { success: false, error: translateDbError(error) }

    if (!nuevoEstado && cli?.correo_electronico) {
      const { data: usr } = await supabase
        .from('usuarios')
        .select('id')
        .eq('correo_electronico', cli.correo_electronico)
        .maybeSingle()
      if (usr?.id) await cerrarSesionesUsuario(usr.id)
    }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado' }
  }
}

// ── Helper: cerrar todas las sesiones de un auth user ────────────────────────
async function cerrarSesionesUsuario(authUserId: string): Promise<void> {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${authUserId}/logout?scope=global`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
      }
    )
  } catch { /* best effort — no bloquear el flujo principal */ }
}
