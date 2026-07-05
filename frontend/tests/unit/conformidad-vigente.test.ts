import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conformidadVigente } from '../../shared/utils/conformidades'

// Regla canónica (B1/B2): la vigente es la más reciente NO rechazada;
// si todas están rechazadas, la rechazada más reciente; null si no hay nada.

test('sin conformidades → null', () => {
  assert.equal(conformidadVigente([]), null)
  assert.equal(conformidadVigente(null), null)
  assert.equal(conformidadVigente(undefined), null)
})

test('una sola pendiente → esa', () => {
  const a = { id_conformidad: 1, esta_rechazada: false }
  assert.equal(conformidadVigente([a]), a)
})

test('una sola rechazada → esa (el sub-estado conformidad_rechazada debe seguir detectándose)', () => {
  const a = { id_conformidad: 1, esta_rechazada: true }
  assert.equal(conformidadVigente([a]), a)
})

test('rechazada vieja + resubida nueva → la resubida (el caso que rompía el modal y clavaba el badge)', () => {
  const rechazada = { id_conformidad: 1, esta_rechazada: true }
  const resubida = { id_conformidad: 2, esta_rechazada: false }
  assert.equal(conformidadVigente([rechazada, resubida]), resubida)
  // El orden de entrada no importa (la DB no garantiza orden sin ORDER BY)
  assert.equal(conformidadVigente([resubida, rechazada]), resubida)
})

test('dos rechazadas → la más reciente', () => {
  const vieja = { id_conformidad: 1, esta_rechazada: true }
  const nueva = { id_conformidad: 2, esta_rechazada: true }
  assert.equal(conformidadVigente([vieja, nueva]), nueva)
  assert.equal(conformidadVigente([nueva, vieja]), nueva)
})

test('rechazada MÁS NUEVA que una pendiente vieja → gana la no-rechazada igual', () => {
  // Caso teórico (no debería darse en el flujo), pero la regla es explícita:
  // ante cualquier no-rechazada viva, esa es la vigente.
  const pendiente = { id_conformidad: 1, esta_rechazada: false }
  const rechazadaNueva = { id_conformidad: 2, esta_rechazada: true }
  assert.equal(conformidadVigente([pendiente, rechazadaNueva]), pendiente)
})

test('esta_rechazada null/undefined cuenta como NO rechazada', () => {
  const sinFlag = { id_conformidad: 3, esta_rechazada: null }
  const rechazada = { id_conformidad: 4, esta_rechazada: true }
  assert.equal(conformidadVigente([sinFlag, rechazada]), sinFlag)
})

test('no muta el array de entrada', () => {
  const lista = [
    { id_conformidad: 2, esta_rechazada: false },
    { id_conformidad: 1, esta_rechazada: true },
  ]
  const copia = [...lista]
  conformidadVigente(lista)
  assert.deepEqual(lista, copia)
})
