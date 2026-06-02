-- Verificación de email para clientes
-- email_verificado: false hasta que el cliente ingrese el código enviado a su correo
-- codigo_verificacion: código de 6 dígitos generado por el sistema
-- codigo_verificacion_expira: el código expira 1 hora después de generado
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS email_verificado         BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS codigo_verificacion      TEXT,
  ADD COLUMN IF NOT EXISTS codigo_verificacion_expira TIMESTAMPTZ;
