/* Consultas del formulario de la landing.

   Antes, el navegador le mandaba los datos directo al Apps Script de Google
   con `mode: 'no-cors'`. Eso tenia tres problemas: la pagina no podia leer la
   respuesta y decia "enviado" aunque hubiera fallado (paso: durante semanas
   no llego ni una consulta y nadie se entero), el visitante le entregaba su
   IP a Google, y no habia forma de recuperar lo perdido.

   Ahora el formulario le habla a nuestro Worker. El Worker guarda la consulta
   primero y despues se la reenvia a la planilla desde el servidor, donde si
   puede leer la respuesta. Si Google falla, la consulta ya esta guardada. */

import { readJson } from './body'

/** Web App de Apps Script ("Hito Leads") que escribe en la planilla.
    Vive aca y no en el cliente: antes viajaba en el bundle y la veia
    cualquiera que mirara el codigo de la pagina. */
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzPbTpdaGcOrutc0u86gnerx_d0Bm5GOVZ8uQQrmQN33kqPaXSA_HLmIYb8y1N72Qzxiw/exec'

/** Campos que acepta el formulario. `hp` es la trampa anti-spam. */
/* Los campos que el formulario manda hoy. "shape" lleva el Hito propuesto:
   la columna quedo libre al sacar forma, tamano y terminacion del
   configurador, y se reusa en vez de tocar la planilla. */
const FIELDS = [
  'useCase',
  'tapAction',
  'shape',
  'name',
  'company',
  'contact',
  'notes',
  'pageUrl',
] as const

const MAX_LENGTH: Record<string, number> = { notes: 2000, pageUrl: 200 }
const DEFAULT_MAX = 200

/* Tope del cuerpo entero, antes de leerlo. Con los recortes de arriba una
   consulta completa ocupa unos 3.400 caracteres; con acentos y emojis, que
   pesan hasta 4 bytes, no llega a 14 KB. 16 KB deja margen para una consulta
   real y corta cualquier cosa que no lo sea. */
const LEAD_BODY_MAX = 16 * 1024

export type LeadResult =
  | { ok: true; stored: number; forwarded: boolean }
  | { ok: false; status: number; error: string }

/** Se queda solo con los campos esperados, recorta y limpia. Lo que manda el
    navegador no se reenvia tal cual: entra por esta puerta o no entra. */
function clean(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of FIELDS) {
    const value = raw[field]
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed) continue
    out[field] = trimmed.slice(0, MAX_LENGTH[field] ?? DEFAULT_MAX)
  }
  return out
}

/* Bucket del freno de spam: un hash corto de la IP, nunca la IP. Alcanza para
   contar intentos en un minuto y no identifica a nadie. */
async function bucketFor(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`hito:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

type Ask = <T>(path: string, init?: RequestInit) => Promise<T | null>
/** `ctx.waitUntil`: deja seguir una promesa despues de contestar. */
type WaitUntil = (promise: Promise<unknown>) => void

export async function handleLead(
  request: Request,
  ask: Ask,
  waitUntil: WaitUntil,
  /** Si este entorno reenvia a la planilla. Sin valor por omision a
      proposito: quien llame tiene que decidirlo mirando el entorno, no
      heredar el que reenvia por descuido (ver `REENVIO_CONSULTAS` en
      wrangler.jsonc). */
  reenviar: boolean,
): Promise<LeadResult> {
  const body = await readJson<unknown>(request, LEAD_BODY_MAX)
  if (!body.ok) {
    return body.status === 413
      ? { ok: false, status: 413, error: 'El formulario es demasiado largo.' }
      : { ok: false, status: 400, error: 'No pudimos leer el formulario.' }
  }
  /* `null`, un numero o una lista tambien son JSON valido, y sin este control
     `raw.hp` revienta y el Worker contesta 500 en vez de un 400 claro. */
  if (typeof body.data !== 'object' || body.data === null || Array.isArray(body.data)) {
    return { ok: false, status: 400, error: 'No pudimos leer el formulario.' }
  }
  const raw = body.data as Record<string, unknown>

  /* Trampa: el campo esta escondido, una persona no lo completa nunca. Al bot
     se le contesta que si para que no reintente, pero no se guarda ni se
     reenvia nada. */
  if (typeof raw.hp === 'string' && raw.hp.trim()) {
    return { ok: true, stored: 0, forwarded: false }
  }

  const data = clean(raw)
  if (!data.name || !data.contact) {
    return { ok: false, status: 400, error: 'Falta tu nombre o tu forma de contacto.' }
  }

  const ip = request.headers.get('cf-connecting-ip') ?? 'sin-ip'
  const gate = await ask<{ allowed: boolean }>('/allow', {
    method: 'POST',
    body: JSON.stringify({ bucket: await bucketFor(ip), limit: 5, windowMs: 60_000 }),
  })
  if (gate && !gate.allowed) {
    return { ok: false, status: 429, error: 'Demasiados envíos seguidos. Probá en un minuto.' }
  }

  const payload = { ...data, submittedAt: new Date().toISOString() }

  // Guardar primero: aunque Google falle, la consulta queda.
  const saved = await ask<{ id: number }>('/lead', {
    method: 'POST',
    body: JSON.stringify({ payload: JSON.stringify(payload) }),
  })
  const id = saved?.id ?? 0

  /* El viaje a Apps Script tarda varios segundos. No se hace esperar a la
     persona por eso: la consulta ya esta guardada, asi que se contesta ya y
     el reenvio sigue en segundo plano. */
  waitUntil(reenviar ? forward(payload, id, ask) : anotarSinReenvio(id, ask))

  /* Para quien completo el formulario esto es un exito: su consulta esta
     guardada y la vamos a ver. Si no llega a la planilla queda anotada con su
     error y se recupera desde el almacen (`pendingLeads` en store.ts). */
  return { ok: true, stored: id, forwarded: false }
}

/** JSON con los caracteres no ASCII escapados como \uXXXX. */
function toAsciiJson(value: unknown): string {
  return JSON.stringify(value).replace(/[-￿]/g, (char) => {
    return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
  })
}

/* Entorno sin reenvio: la consulta queda anotada con el motivo. Sin esto
   aparece en `pendingLeads` como una consulta que Google rechazo y no se
   distingue de una que hay que recuperar a mano. */
async function anotarSinReenvio(id: number, ask: Ask): Promise<void> {
  if (!id) return
  console.log(`Consulta ${id} guardada sin reenviar: este entorno no le habla a la planilla.`)
  await ask('/lead-mark', {
    method: 'POST',
    body: JSON.stringify({
      id,
      forwarded: false,
      error: 'Este entorno no reenvia a la planilla (REENVIO_CONSULTAS no esta en "on").',
    }),
  })
}

/** Manda la consulta a la planilla y anota como salio. */
async function forward(payload: unknown, id: number, ask: Ask): Promise<void> {
  let forwarded = false
  let error: string | undefined
  try {
    /* Servidor a servidor: aca no hay CORS, asi que la respuesta se puede
       leer de verdad. El Apps Script contesta {result:"success"} o error. */
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      /* Todo en ASCII: Apps Script responde con una redireccion y en el salto
         se pierde el charset, asi que un "×" o una "ñ" llegan rotos a la
         planilla (paso con "85 × 54 mm"). Escapando los caracteres como
         \uXXXX el cuerpo es ASCII puro y JSON.parse los reconstruye bien del
         otro lado, sin importar como interprete los bytes. */
      body: toAsciiJson(payload),
    })
    const text = await response.text()
    forwarded = response.ok && text.includes('"success"')
    if (!forwarded) error = `Apps Script respondio ${response.status}: ${text.slice(0, 200)}`
  } catch (err) {
    error = String(err)
  }

  if (id) {
    await ask('/lead-mark', { method: 'POST', body: JSON.stringify({ id, forwarded, error }) })
  }
  if (!forwarded) console.error('Consulta guardada pero no llego a la planilla:', error)
}
