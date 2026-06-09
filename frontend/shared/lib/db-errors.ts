interface SupabaseError {
  code?: string
  message?: string
}

/**
 * Convierte errores de Supabase/PostgreSQL en mensajes comprensibles para el usuario.
 * Siempre devuelve una cadena en español sin tecnicismos de base de datos.
 */
export function translateDbError(error: SupabaseError): string {
  const code = error.code ?? ''
  const message = error.message ?? ''

  // 23505 — violación de unicidad (duplicate key)
  if (code === '23505') {
    if (message.includes('email')) return 'El correo electrónico ingresado ya está en uso.'
    if (message.includes('dni')) return 'El DNI ingresado ya está registrado.'
    if (message.includes('telefono') || message.includes('phone')) return 'El teléfono ingresado ya está en uso.'
    return 'Ya existe un registro con esos datos. Verificá la información ingresada.'
  }

  // 23503 — violación de clave foránea
  if (code === '23503') {
    return 'No se puede completar la operación porque algunos datos de referencia no existen o fueron eliminados.'
  }

  // 23502 — campo no nulo vacío
  if (code === '23502') {
    return 'Faltan datos obligatorios. Completá todos los campos requeridos.'
  }

  // 23514 — violación de check constraint
  if (code === '23514') {
    return 'Los datos ingresados no son válidos para este campo.'
  }

  // 42501 — sin permisos (RLS)
  if (code === '42501' || message.includes('permission denied')) {
    return 'No tenés permisos para realizar esta operación.'
  }

  // PGRST301 — sesión expirada
  if (code === 'PGRST301') {
    return 'Tu sesión expiró. Ingresá nuevamente.'
  }

  // PGRST116 — ninguna fila encontrada
  if (code === 'PGRST116') {
    return 'No se encontró el registro solicitado.'
  }

  // Error de conexión / red
  if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('networkerror')) {
    return 'Error de conexión. Verificá tu internet e intentá de nuevo.'
  }

  // Fallback genérico
  return 'Ocurrió un error inesperado. Intentá nuevamente o contactá al administrador.'
}
