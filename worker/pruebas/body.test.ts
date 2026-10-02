/* Pruebas del tope de tamaño de los cuerpos (worker/body.ts, de SEC 1).

   La pieza existe porque `request.json()` lee el cuerpo entero antes de mirar
   nada: sin tope, un pedido de 50 MB se carga completo en memoria. Lo que hay
   que cuidar no es solo que rechace lo grande, sino COMO lo rechaza: si el
   encabezado miente o no viene, tiene que cortar la lectura igual y sin
   descargar el resto. Eso es lo que estas pruebas fijan. */

import { test, expect } from 'vitest'
import { readJson } from '../body'

const TOPE = 1024

/** Pedido con el cuerpo entero y su `Content-Length`, como lo manda un navegador. */
function pedido(cuerpo: string): Request {
  return new Request('https://hito.uno/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo,
  })
}

/** Pedido por partes: sin `Content-Length`, el cuerpo llega de a pedazos. */
function pedidoPorPartes(pedazos: string[]): { request: Request; leidos: () => number } {
  let leidos = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const pedazo = pedazos[leidos]
      if (!pedazo) return controller.close()
      leidos++
      controller.enqueue(new TextEncoder().encode(pedazo))
    },
  })
  return {
    request: new Request('https://hito.uno/api/lead', {
      method: 'POST',
      body: stream,
      // @ts-expect-error duplex es obligatorio para mandar un stream y no esta en los tipos del Worker
      duplex: 'half',
    }),
    leidos: () => leidos,
  }
}

test('un cuerpo normal entra y se parsea', async () => {
  const res = await readJson<{ name: string }>(pedido('{"name":"Ana"}'), TOPE)
  expect(res).toEqual({ ok: true, data: { name: 'Ana' } })
})

test('un cuerpo mas grande que el tope se rechaza con 413', async () => {
  const grande = JSON.stringify({ notes: 'x'.repeat(TOPE * 2) })
  expect(await readJson(pedido(grande), TOPE)).toEqual({ ok: false, status: 413 })
})

test('lo que no es JSON se rechaza con 400, no con 500', async () => {
  // Un cuerpo roto es un error de quien llama, no nuestro.
  expect(await readJson(pedido('esto no es json'), TOPE)).toEqual({ ok: false, status: 400 })
})

test('un cuerpo vacio se rechaza con 400', async () => {
  const vacio = new Request('https://hito.uno/api/lead', { method: 'POST' })
  expect(await readJson(vacio, TOPE)).toEqual({ ok: false, status: 400 })
})

test('sin Content-Length igual corta, y deja de leer apenas se pasa', async () => {
  /* Este es el caso que hace falta que exista la lectura por pedazos: el
     encabezado puede no venir (envio por partes) o mentir. Si solo se mirara
     el encabezado, un cuerpo enorme entraria entero en memoria.

     Los pedazos son de 600 bytes con un tope de 1024: tiene que cortar en el
     segundo y no pedir el tercero ni el cuarto. */
  const { request, leidos } = pedidoPorPartes(['a'.repeat(600), 'b'.repeat(600), 'c'.repeat(600), 'd'.repeat(600)])

  expect(await readJson(request, TOPE)).toEqual({ ok: false, status: 413 })
  expect(leidos(), 'siguio descargando el cuerpo despues de pasarse del tope').toBeLessThanOrEqual(2)
})

test('un cuerpo justo en el tope entra', async () => {
  // El limite es "mas que el tope", no "igual al tope": un envio legitimo del
  // tamaño exacto no puede quedar afuera.
  const relleno = 'x'.repeat(TOPE - '{"notes":""}'.length)
  const justo = JSON.stringify({ notes: relleno })
  expect(new TextEncoder().encode(justo).byteLength).toBe(TOPE)
  expect(await readJson(pedido(justo), TOPE)).toEqual({ ok: true, data: { notes: relleno } })
})
