# Configuración pendiente para producción

## Verificación de email (Supabase Cloud)

El código ya está implementado. Solo falta activarlo en el dashboard de Supabase:

1. Ir a [supabase.com](https://supabase.com) → proyecto → **Authentication → Providers → Email**
   - Activar **"Confirm email"**

2. Ir a **Authentication → URL Configuration**
   - En **Redirect URLs**, agregar: `https://<tu-dominio>/auth/confirm`

Con eso, los nuevos clientes que se registren deberán confirmar su email antes de poder iniciar sesión.

> Los usuarios ya existentes (admin, técnicos creados por admin) no se ven afectados porque fueron creados por el admin directamente y ya tienen email confirmado.
