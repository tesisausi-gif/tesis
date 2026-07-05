/**
 * Regla canónica de "conformidad vigente" de un incidente.
 *
 * El rechazo de una conformidad conserva la fila histórica (para el timeline)
 * y la resubida del técnico inserta una fila NUEVA, por lo que un incidente
 * puede acumular varias filas en `conformidades`. Toda lógica que necesite
 * "LA conformidad" de un incidente debe elegirla con esta función:
 *
 * - La más reciente NO rechazada, si existe (pendiente de revisión o aprobada).
 * - Si todas están rechazadas, la rechazada más reciente (así el sub-estado
 *   `conformidad_rechazada` sigue detectándose mientras no haya resubida).
 * - `null` si no hay ninguna.
 */
export function conformidadVigente<
  T extends { id_conformidad: number; esta_rechazada?: boolean | null },
>(conformidades: T[] | null | undefined): T | null {
  if (!conformidades || conformidades.length === 0) return null
  const ordenadas = [...conformidades].sort((a, b) => b.id_conformidad - a.id_conformidad)
  return ordenadas.find((c) => !c.esta_rechazada) ?? ordenadas[0]
}
