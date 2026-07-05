import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hoyArgentina } from '../../shared/utils/fechas'

// B9: los vencimientos usaban la fecha UTC del server; entre las 21:00 y las
// 00:00 ART el server ya estaba en "mañana" y vencía franjas/visitas antes de
// tiempo. hoyArgentina() debe devolver la fecha calendario de Argentina.

const FORMATO = /^\d{4}-\d{2}-\d{2}$/

test('devuelve formato YYYY-MM-DD', () => {
  assert.match(hoyArgentina(), FORMATO)
})

test('coincide con Intl para America/Argentina/Buenos_Aires', () => {
  const esperado = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  assert.equal(hoyArgentina(), esperado)
})

test('el mecanismo resuelve el caso 22:00 ART (01:00 UTC del día siguiente)', () => {
  // 2026-07-04 01:00 UTC = 2026-07-03 22:00 en Argentina (UTC-3).
  // Con toISOString().slice(0,10) daría '2026-07-04' (el bug);
  // con el formateo por zona horaria debe dar '2026-07-03'.
  const instante = new Date('2026-07-04T01:00:00Z')
  assert.equal(instante.toISOString().slice(0, 10), '2026-07-04')
  const enArgentina = instante.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  assert.equal(enArgentina, '2026-07-03')
})

test('mediodía UTC y mediodía ART caen el mismo día (sin off-by-one al revés)', () => {
  const instante = new Date('2026-07-04T12:00:00Z')
  const enArgentina = instante.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  assert.equal(enArgentina, '2026-07-04')
})
