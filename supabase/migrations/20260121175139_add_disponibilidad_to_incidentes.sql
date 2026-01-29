-- Migration to add availability window to incidents
ALTER TABLE incidentes ADD COLUMN disponibilidad TEXT;
