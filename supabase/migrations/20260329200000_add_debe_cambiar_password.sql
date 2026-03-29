-- Migración: flag para forzar cambio de contraseña en el primer inicio de sesión
-- Se activa cuando el admin aprueba una solicitud de registro (técnico o cliente nuevo)

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS debe_cambiar_password boolean NOT NULL DEFAULT false;
