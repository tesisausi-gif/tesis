/**
 * Fecha calendario "de hoy" en la zona horaria del negocio (Argentina).
 *
 * NUNCA usar `new Date().toISOString().slice(0, 10)` para comparar contra
 * fechas calendario guardadas por el usuario: toISOString() devuelve la fecha
 * en UTC, y entre las 21:00 y las 00:00 hora argentina el servidor ya está en
 * "mañana" — eso vencía disponibilidades y visitas hasta 3 horas antes.
 */
export function hoyArgentina(): string {
  // 'en-CA' formatea como YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}
