/* Pruebas de las consultas del formulario.

   La primera es la que pidio SEC 1 como red antes de atacar el formulario en
   dev (pendiente de docs/SEGURIDAD.md): que con el reenvio apagado no salga
   NADA hacia Google. Hasta ahora eso se comprobaba a mano, mirando los rastros
   del Worker local; aca queda verificado en cada PR.

   `handleLead` recibe el almacen y el `waitUntil` como parametros, asi que se
   prueba entero sin Cloudflare: alcanza con un almacen de mentira y con vigilar
   `fetch`. */

import { test, expect, beforeEach, afterEach } from 'vitest'
import { handleLead } from '../leads'

/** Almacen de mentira: anota cada llamada y contesta lo que haria el de verdad. */
function almacenFalso() {
  const llamadas: { ruta: string; cuerpo: Record<string, unknown> | undefined }[] = []
  const ask = async <T>(ruta: string, init?: RequestInit): Promise<T | null> => {
    llamadas.push({ ruta, cuerpo: init?.body ? JSON.parse(init.body as string) : undefined })
    if (ruta === '/allow') return { allowed: true } as T
    if (ruta === '/lead') return { id: 7 } as T
    return { ok: true } as T
  }
  return { ask, llamadas, rutas: () => llamadas.map((l) => l.ruta) }
}

/** Junta las promesas de segundo plano para poder esperarlas en la prueba. */
function fondo() {
  const promesas: Promise<unknown>[] = []
  return {
    waitUntil: (p: Promise<unknown>) => void promesas.push(p),
    terminar: () => Promise.all(promesas),
  }
}

function consulta(campos: Record<string, unknown> = {}): Request {
  return new Request('https://hito.uno/api/lead', {
    method: 'POST',
    headers: { 'cf-connecting-ip': '203.0.113.7', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ana', contact: '+54 9 2254 59 0762', ...campos }),
  })
}

/* `fetch` global: se reemplaza para ver si alguien sale a la red. */
const fetchReal = globalThis.fetch
let salidas: { url: string; cuerpo: string }[] = []

beforeEach(() => {
  salidas = []
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    salidas.push({ url: String(entrada), cuerpo: String(init?.body ?? '') })
    return new Response('{"result":"success"}', { status: 200 })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = fetchReal
})

test('con el reenvio apagado no sale nada hacia Google', async () => {
  const almacen = almacenFalso()
  const bg = fondo()

  const res = await handleLead(consulta(), almacen.ask, bg.waitUntil, false)
  await bg.terminar()

  expect(res).toEqual({ ok: true, stored: 7, forwarded: false })
  expect(salidas, 'salio una peticion a la red con el reenvio apagado').toEqual([])
  // La consulta igual se guarda: es de donde se leen las pruebas en dev.
  expect(almacen.rutas()).toContain('/lead')
  // Y queda marcada con el motivo, para no confundirla con una que Google rechazo.
  const marca = almacen.llamadas.find((l) => l.ruta === '/lead-mark')
  expect(String(marca?.cuerpo?.error)).toMatch(/REENVIO_CONSULTAS/)
})

test('con el reenvio prendido la consulta viaja en ASCII puro', async () => {
  /* En la redireccion del Apps Script se pierde el charset: un "×" o una "ñ"
     llegan rotos a la planilla ("85 ? 54 mm", pasado de verdad contra la
     planilla real). Por eso el cuerpo se escapa como \uXXXX antes de salir. */
  const bg = fondo()
  await handleLead(consulta({ notes: '85 × 54 mm, diseño' }), almacenFalso().ask, bg.waitUntil, true)
  await bg.terminar()

  expect(salidas.length).toBe(1)
  const cuerpo = salidas[0].cuerpo
  expect(/^[\x00-\x7F]*$/.test(cuerpo), 'el cuerpo lleva caracteres no ASCII').toBe(true)
  expect(cuerpo, 'el "×" tendria que viajar escapado').toContain('\\u00d7')
  // Y del otro lado se reconstruye igual que se escribio.
  expect(JSON.parse(cuerpo).notes).toBe('85 × 54 mm, diseño')
})

test('la trampa anti-spam no guarda ni reenvia', async () => {
  const almacen = almacenFalso()
  const bg = fondo()

  const res = await handleLead(consulta({ hp: 'soy un bot' }), almacen.ask, bg.waitUntil, true)
  await bg.terminar()

  // Al bot se le contesta que si para que no reintente, pero no se guarda nada.
  expect(res).toEqual({ ok: true, stored: 0, forwarded: false })
  expect(almacen.rutas()).toEqual([])
  expect(salidas).toEqual([])
})

test('sin nombre o sin forma de contacto no entra', async () => {
  const almacen = almacenFalso()
  const bg = fondo()

  const res = await handleLead(consulta({ contact: '   ' }), almacen.ask, bg.waitUntil, true)
  await bg.terminar()

  expect(res.ok).toBe(false)
  expect(almacen.rutas()).toEqual([])
  expect(salidas).toEqual([])
})

test('el freno del almacen corta el envio', async () => {
  const almacen = almacenFalso()
  const bg = fondo()
  const askFrenado = async <T>(ruta: string, init?: RequestInit): Promise<T | null> => {
    if (ruta === '/allow') return { allowed: false } as T
    return almacen.ask<T>(ruta, init)
  }

  const res = await handleLead(consulta(), askFrenado, bg.waitUntil, true)
  await bg.terminar()

  expect(res.ok).toBe(false)
  expect(res.ok === false && res.status).toBe(429)
  expect(salidas, 'una consulta frenada no tiene que salir a la red').toEqual([])
})

test('solo entran los campos esperados, y recortados', async () => {
  const almacen = almacenFalso()
  const bg = fondo()

  await handleLead(
    consulta({ notes: 'n'.repeat(3000), sorpresa: 'campo que nadie declaro' }),
    almacen.ask,
    bg.waitUntil,
    true,
  )
  await bg.terminar()

  const enviado = almacen.llamadas.find((l) => l.ruta === '/lead')
  const guardado = JSON.parse(String(enviado?.cuerpo?.payload))
  expect('sorpresa' in guardado, 'se guardo un campo que el formulario no declara').toBe(false)
  expect(guardado.notes.length, 'las notas tienen que recortarse a 2000').toBe(2000)
})
