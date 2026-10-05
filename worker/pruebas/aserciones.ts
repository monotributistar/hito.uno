/* Aserciones estilo `node:assert` sobre `expect` de vitest.

   Las pruebas del truco nacieron en un laboratorio que usaba `node:assert`. El
   tsconfig del worker va con `types: []` (sin tipos de Node), asi que en vez de
   reescribir cientos de lineas se mantiene la misma forma de escribirlas. `ok`
   conserva el estrechamiento de tipos (`asserts valor`), que las pruebas usan
   para leer `r.estado` despues de `ok(r.ok)`. TypeScript exige que quien
   afirma tipos tenga una anotacion explicita: de ahi la interfaz. */

import { expect } from 'vitest'

interface Aserciones {
  ok(valor: unknown, mensaje?: string): asserts valor
  equal(actual: unknown, esperado: unknown, mensaje?: string): void
  notEqual(actual: unknown, esperado: unknown, mensaje?: string): void
  deepEqual(actual: unknown, esperado: unknown, mensaje?: string): void
  match(texto: string, patron: RegExp, mensaje?: string): void
  throws(fn: () => unknown, patron?: RegExp): void
}

export const assert: Aserciones = {
  ok(valor, mensaje) {
    expect(Boolean(valor), mensaje).toBe(true)
  },
  equal(actual, esperado, mensaje) {
    expect(actual, mensaje).toBe(esperado)
  },
  notEqual(actual, esperado, mensaje) {
    expect(actual, mensaje).not.toBe(esperado)
  },
  deepEqual(actual, esperado, mensaje) {
    expect(actual, mensaje).toEqual(esperado)
  },
  match(texto, patron, mensaje) {
    expect(texto, mensaje).toMatch(patron)
  },
  throws(fn, patron) {
    if (patron) expect(fn).toThrow(patron)
    else expect(fn).toThrow()
  },
}
