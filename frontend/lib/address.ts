/**
 * Utilidades para construcción de direcciones
 * Centraliza la lógica que estaba duplicada en 5+ archivos
 */

interface Inmueble {
  calle?: string | null
  altura?: string | null
  piso?: string | null
  dpto?: string | null
  barrio?: string | null
  localidad?: string | null
  provincia?: string | null
}

/**
 * Construye una dirección formateada a partir de un objeto inmueble
 */
export function construirDireccion(inmueble: Inmueble | null | undefined): string {
  if (!inmueble) return 'Sin dirección'

  const direccionPartes = [
    inmueble.calle,
    inmueble.altura,
    inmueble.piso && `Piso ${inmueble.piso}`,
    inmueble.dpto && `Dpto ${inmueble.dpto}`
  ].filter(Boolean).join(' ')

  const ubicacion = [
    inmueble.barrio,
    inmueble.localidad,
    inmueble.provincia
  ].filter(Boolean).join(', ')

  if (!direccionPartes && !ubicacion) return 'Sin dirección'

  return ubicacion ? `${direccionPartes}, ${ubicacion}` : direccionPartes
}

/**
 * Construye solo la parte de la calle (sin barrio/localidad)
 */
export function construirDireccionCorta(inmueble: Inmueble | null | undefined): string {
  if (!inmueble) return 'Sin dirección'

  const partes = [
    inmueble.calle,
    inmueble.altura,
    inmueble.piso && `P${inmueble.piso}`,
    inmueble.dpto && `D${inmueble.dpto}`
  ].filter(Boolean).join(' ')

  return partes || 'Sin dirección'
}

/**
 * Construye la ubicación (barrio, localidad)
 */
export function construirUbicacion(inmueble: Inmueble | null | undefined): string {
  if (!inmueble) return ''

  return [inmueble.barrio, inmueble.localidad]
    .filter(Boolean)
    .join(', ')
}
