/* Pruebas de la revocacion de tokens del panel.

   Lo que se cuida: que se borre exactamente lo revocado y nada mas. El dia que
   haya tokens de clientes en el almacen que no estan en tokens.json, un error
   aca los borraria sin aviso. Los tokens de estas pruebas son inventados: los
   revocados de verdad no se escriben en ningun lado. */

import { test, expect } from 'vitest'
import { REVOCADOS, hashToken, tokensRevocados } from '../revocados'
import tokensSeed from '../tokens.json'

test('el hash es SHA-256 en hexadecimal, como lo calcula node', async () => {
  // Valor conocido de SHA-256("abc").
  expect(await hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('borra solo los tokens de la lista, y deja los demas', async () => {
  const revocado = 'token-viejo-publicado-0000000000000'
  const cliente = 'token-de-un-cliente-real-111111111'
  const hash = await hashToken(revocado)
  expect(await tokensRevocados([revocado, cliente], [hash])).toEqual([revocado])
})

test('un token que no esta en tokens.json NO se borra por eso', async () => {
  // La trampa de "reconciliar": borrar todo lo que falte en el archivo se
  // llevaria puestos los tokens de clientes generados desde la administracion.
  const cliente = 'token-de-un-cliente-real-111111111'
  expect(await tokensRevocados([cliente], REVOCADOS.map((r) => r.hash))).toEqual([])
})

test('sin revocados, no borra nada', async () => {
  expect(await tokensRevocados(['a', 'b'], [])).toEqual([])
})

test('la lista guarda hashes y no tokens en claro', () => {
  for (const r of REVOCADOS) {
    expect(r.hash, `el revocado de ${r.dueno} no parece un SHA-256`).toMatch(/^[0-9a-f]{64}$/)
  }
})

test('ningun token revocado volvio a tokens.json', async () => {
  // Si alguien lo repone, el almacen lo borra igual al arrancar; pero que
  // aparezca en el archivo es un secreto publicado otra vez.
  const hashes = new Set(REVOCADOS.map((r) => r.hash))
  for (const token of Object.keys(tokensSeed.tokens)) {
    expect(hashes.has(await hashToken(token)), 'hay un token revocado en tokens.json').toBe(false)
  }
})
