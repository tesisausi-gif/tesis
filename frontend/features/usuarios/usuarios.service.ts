'use server'

/**
 * Servicio de Usuarios
 * Lecturas y escrituras para Server Components y Server Actions
 *
 * NOTA: Para getCurrentUser() usar @/features/auth/auth.service
 */

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
    .select('id_tecnico, nombre, apellido, especialidad')
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
    const supabase = await createClient()

    const { error } = await supabase
      .from('tecnicos')
      .update({ esta_activo: nuevoEstado })
      .eq('id_tecnico', idTecnico)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado' }
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
    especialidad: string | null
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('tecnicos')
      .update(data)
      .eq('id_tecnico', idTecnico)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
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

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al rechazar solicitud' }
  }
}

export async function aprobarSolicitudTecnico(
  solicitudId: number,
  password: string
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

  // 2. Crear usuario en Supabase Auth con rol 'gestor' para que el trigger
  //    solo inserte en `usuarios` (sin tocar `tecnicos`) — evita fallos del trigger.
  //    Luego insertamos manualmente en `tecnicos` y actualizamos `usuarios`.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: solicitud.email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre: solicitud.nombre,
      apellido: solicitud.apellido,
      rol: 'gestor', // Neutral: trigger solo crea registro en `usuarios`
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

  // 4. Actualizar el registro en `usuarios`: cambiar rol a 'tecnico' y vincular id_tecnico
  const { error: updError } = await supabase
    .from('usuarios')
    .update({ rol: 'tecnico', id_tecnico: tecnicoInsert.id_tecnico })
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

  return { success: true, data: undefined }
}

export async function crearSolicitudRegistro(data: {
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  dni: string | null
  especialidad: string | null
  direccion: string | null
}): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('solicitudes_registro')
      .insert({
        ...data,
        estado_solicitud: 'pendiente',
      })

    if (error) return { success: false, error: error.message }
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
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('tecnicos')
      .update(data)
      .eq('id_tecnico', idTecnico)

    if (error) return { success: false, error: error.message }
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
      return { success: false, error: error.message }
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

    if (error) return { success: false, error: error.message }
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

    if (error) return { success: false, error: error.message }
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

    if (error) return { success: false, error: error.message }
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
    const supabase = await createClient()

    const { error } = await supabase
      .from('usuarios')
      .update({ esta_activo: nuevoEstado })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
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
    const supabase = await createClient()

    const { error } = await supabase
      .from('clientes')
      .update(data)
      .eq('id_cliente', idCliente)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar cliente' }
  }
}

export async function toggleActivoCliente(
  idCliente: number,
  nuevoEstado: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('clientes')
      .update({ esta_activo: nuevoEstado })
      .eq('id_cliente', idCliente)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado' }
  }
}
