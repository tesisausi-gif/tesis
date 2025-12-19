/**
 * Mapeo de errores de Supabase a mensajes amigables en español
 */

export function getAuthErrorMessage(error: any): { title: string; description: string } {
  const errorMessage = error?.message?.toLowerCase() || ''
  const errorCode = error?.code || ''

  // Email ya registrado
  if (errorMessage.includes('user already registered') ||
      errorMessage.includes('email already exists') ||
      errorCode === '23505') {
    return {
      title: 'Email ya registrado',
      description: 'Este email ya está en uso. Intenta iniciar sesión o usa otro email.'
    }
  }

  // Email inválido
  if (errorMessage.includes('invalid email') ||
      errorMessage.includes('unable to validate email')) {
    return {
      title: 'Email inválido',
      description: 'Por favor ingresa un email válido (ej: usuario@ejemplo.com)'
    }
  }

  // Contraseña muy corta
  if (errorMessage.includes('password') && errorMessage.includes('short')) {
    return {
      title: 'Contraseña muy corta',
      description: 'La contraseña debe tener al menos 6 caracteres'
    }
  }

  // Credenciales inválidas (login)
  if (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid credentials')) {
    return {
      title: 'Credenciales incorrectas',
      description: 'El email o contraseña son incorrectos. Verifica e intenta nuevamente.'
    }
  }

  // Usuario no confirmado
  if (errorMessage.includes('email not confirmed')) {
    return {
      title: 'Email no confirmado',
      description: 'Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.'
    }
  }

  // Rate limit (demasiados intentos)
  if (errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests')) {
    return {
      title: 'Demasiados intentos',
      description: 'Has intentado muchas veces. Espera unos minutos e intenta nuevamente.'
    }
  }

  // Dominio de email bloqueado
  if (errorMessage.includes('domain') && errorMessage.includes('not allowed')) {
    return {
      title: 'Dominio de email no permitido',
      description: 'Este dominio de email no está permitido. Usa un email de un proveedor común (Gmail, Outlook, etc.)'
    }
  }

  // Usuario no existe
  if (errorMessage.includes('user not found')) {
    return {
      title: 'Usuario no encontrado',
      description: 'No existe una cuenta con este email. ¿Quieres registrarte?'
    }
  }

  // Contraseña incorrecta
  if (errorMessage.includes('invalid password')) {
    return {
      title: 'Contraseña incorrecta',
      description: 'La contraseña ingresada es incorrecta. Inténtalo nuevamente.'
    }
  }

  // Token expirado
  if (errorMessage.includes('token') && errorMessage.includes('expired')) {
    return {
      title: 'Sesión expirada',
      description: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
    }
  }

  // Error de red
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      title: 'Error de conexión',
      description: 'No se pudo conectar al servidor. Verifica tu conexión a internet.'
    }
  }

  // Error genérico pero con mensaje de Supabase
  if (error?.message) {
    return {
      title: 'Error al procesar la solicitud',
      description: error.message
    }
  }

  // Error completamente desconocido
  return {
    title: 'Error inesperado',
    description: 'Ocurrió un error inesperado. Por favor intenta nuevamente o contacta al administrador.'
  }
}

/**
 * Mensajes de validación del lado del cliente
 */
export const ValidationMessages = {
  emailRequired: 'El email es requerido',
  emailInvalid: 'Ingresa un email válido',
  passwordRequired: 'La contraseña es requerida',
  passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',
  passwordsDontMatch: 'Las contraseñas no coinciden',
  nameRequired: 'El nombre es requerido',
  fieldRequired: (field: string) => `El campo ${field} es requerido`,
}
