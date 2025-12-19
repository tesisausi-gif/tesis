# Sistema de Manejo de Errores

## Archivo: `error-messages.ts`

Este módulo centraliza todos los mensajes de error de autenticación para proporcionar feedback claro y útil al usuario.

## Función Principal: `getAuthErrorMessage(error)`

Convierte errores técnicos de Supabase en mensajes amigables en español.

### Errores Manejados:

| Error de Supabase | Mensaje al Usuario |
|-------------------|-------------------|
| User already registered | **Email ya registrado** - Este email ya está en uso. Intenta iniciar sesión o usa otro email. |
| Invalid email / Unable to validate | **Email inválido** - Por favor ingresa un email válido (ej: usuario@ejemplo.com) |
| Password too short | **Contraseña muy corta** - La contraseña debe tener al menos 6 caracteres |
| Invalid login credentials | **Credenciales incorrectas** - El email o contraseña son incorrectos. |
| Email not confirmed | **Email no confirmado** - Debes confirmar tu email antes de iniciar sesión. |
| Rate limit / Too many requests | **Demasiados intentos** - Espera unos minutos e intenta nuevamente. |
| Domain not allowed | **Dominio de email no permitido** - Usa un email de un proveedor común. |
| User not found | **Usuario no encontrado** - No existe una cuenta con este email. |
| Network / Fetch error | **Error de conexión** - Verifica tu conexión a internet. |

## Uso en Componentes:

```typescript
import { getAuthErrorMessage } from '@/lib/error-messages'

// En el catch de error:
if (error) {
  const errorMsg = getAuthErrorMessage(error)
  toast.error(errorMsg.title, {
    description: errorMsg.description
  })
}
```

## Validaciones del Cliente:

El objeto `ValidationMessages` contiene mensajes para validaciones del lado del cliente:

```typescript
import { ValidationMessages } from '@/lib/error-messages'

if (!email) {
  toast.error(ValidationMessages.emailRequired)
}

if (password.length < 6) {
  toast.error(ValidationMessages.passwordTooShort)
}
```

## Componentes Actualizados:

- ✅ `/app/(auth)/login/page.tsx` - Login con errores mejorados
- ✅ `/app/(auth)/register/page.tsx` - Registro con errores mejorados (ambos tabs)

## Agregar Nuevos Errores:

Para agregar un nuevo tipo de error:

1. Abre `/lib/error-messages.ts`
2. Agrega un nuevo `if` en la función `getAuthErrorMessage`
3. Retorna un objeto con `{ title, description }`

Ejemplo:
```typescript
if (errorMessage.includes('nuevo_tipo_error')) {
  return {
    title: 'Título del Error',
    description: 'Descripción clara de qué hacer'
  }
}
```

## Beneficios:

- ✅ Mensajes claros en español
- ✅ Guías de acción para el usuario
- ✅ Centralizado (fácil de mantener)
- ✅ Consistente en toda la app
- ✅ Mejor experiencia de usuario
