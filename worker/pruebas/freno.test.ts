/* Pruebas del freno de respaldo.

   Lo que cuidan es el equilibrio que costo decidir: cuando el almacen no
   contesta, una persona sola NUNCA tiene que verse frenada —si no, se pierde
   un pedido real de un cliente— y una avalancha desde el mismo lugar tiene que
   dejar de ser gratis. Si alguien ajusta esto, que sea sabiendo las dos cosas. */

import { test, expect, beforeEach, vi } from 'vitest'
import { permiteSinAlmacen, vaciarFreno } from '../freno'

const VENTANA = 60_000
const LIMITE = 5

beforeEach(() => vaciarFreno())

test('una persona sola pasa', () => {
  expect(permiteSinAlmacen('ana', LIMITE, VENTANA)).toBe(true)
})

test('pasa hasta el limite y la siguiente no', () => {
  for (let i = 0; i < LIMITE; i++) {
    expect(permiteSinAlmacen('ana', LIMITE, VENTANA), `intento ${i + 1}`).toBe(true)
  }
  expect(permiteSinAlmacen('ana', LIMITE, VENTANA)).toBe(false)
})

test('frenar a uno no frena a los demas', () => {
  for (let i = 0; i < LIMITE + 3; i++) permiteSinAlmacen('ana', LIMITE, VENTANA)
  expect(permiteSinAlmacen('juan', LIMITE, VENTANA)).toBe(true)
})

test('pasada la ventana se vuelve a empezar', () => {
  /* Con el reloj movido a mano: quien se paso del limite tiene que poder
     volver a escribir al minuto siguiente, no quedar frenado para siempre. */
  vi.useFakeTimers()
  try {
    vi.setSystemTime(new Date('2026-10-03T12:00:00Z'))
    for (let i = 0; i < LIMITE + 1; i++) permiteSinAlmacen('ana', LIMITE, VENTANA)
    expect(permiteSinAlmacen('ana', LIMITE, VENTANA)).toBe(false)

    vi.setSystemTime(new Date('2026-10-03T12:01:01Z'))
    expect(permiteSinAlmacen('ana', LIMITE, VENTANA)).toBe(true)
  } finally {
    vi.useRealTimers()
  }
})

test('muchas direcciones distintas no llenan la memoria', () => {
  // Mas del tope de entradas, todas de una vez y todas vigentes.
  for (let i = 0; i < 1500; i++) permiteSinAlmacen(`bucket-${i}`, LIMITE, VENTANA)
  // Lo importante no es el numero exacto, sino que no crezca sin fin.
  expect(permiteSinAlmacen('ana', LIMITE, VENTANA)).toBe(true)
})
