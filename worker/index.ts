/* Worker de hito.uno.
   Cloudflare sirve primero los archivos estaticos de `dist/`. Solo cuando una
   ruta no coincide con ningun archivo (o esta en `run_worker_first`) llega
   aca. Este Worker resuelve lo que un sitio estatico no puede:

   1. `/p/<slug>` — perfiles partner. Hay una sola entrada HTML (`p/index.html`)
      para todos los perfiles; el slug se lee de la URL en el cliente.

   2. `/o/<id>` — puertos. Cada objeto fisico (tarjeta, llavero, porta
      tarjetas) lleva impreso un `/o/<id>` en vez de la URL final. Asi un QR
      ya impreso se puede reapuntar sin reimprimir. La redireccion es 302 y
      sin cache, para que el cambio se vea en el toque siguiente.

   3. `/panel/<token>` y `/api/panel/*` — el Panel Lite: el cliente ve su
      objeto y elige a donde apunta. El destino vive en el Durable Object
      `HitoStore` (ver store.ts); `objects.json` queda como semilla y como
      respaldo si el almacen no responde.

   El conteo de toques (Analytics Engine, binding TOQUES) es opcional: el
   Worker funciona igual sin el. */

import objects from './objects.json'
import partnersRegistry from '../src/partner/partners.json'
import { instagramHref, whatsappHref } from '../src/partner/links'
import { HitoStore, kindFromId, type ObjectRow } from './store'
import { buildVCard, vcardFilename, type VCardPartner } from './vcard'
import { withProfileMeta, type MetaPartner } from './meta'
import { handleLead } from './leads'

export { HitoStore }

type SeedEntry = { to: string; label?: string; owner?: string }

type AssetsBinding = { fetch(request: Request): Promise<Response> }
type KVBinding = { get(key: string): Promise<string | null> }
type AnalyticsBinding = {
  writeDataPoint(point: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void
}
type DurableObjectStub = { fetch(request: Request | string, init?: RequestInit): Promise<Response> }
type DurableObjectNamespace = {
  idFromName(name: string): unknown
  get(id: unknown): DurableObjectStub
}

export interface Env {
  ASSETS: AssetsBinding
  /** Almacen del panel (destinos y tokens). Opcional: sin el, todo cae al JSON. */
  STORE?: DurableObjectNamespace
  /** Alternativa historica a STORE. Si existe, gana sobre el JSON. */
  PUERTOS?: KVBinding
  /** Conteo de toques. Opcional por si se quita el binding. */
  TOQUES?: AnalyticsBinding
  /** `"off"` apaga el reenvio de consultas a la planilla. Lo declara solo
      `env.dev` en wrangler.jsonc: dev comparte la planilla con produccion y
      las pruebas de carga no pueden ensuciarla. */
  REENVIO_CONSULTAS?: string
}

const SEED = objects.objects as Record<string, SeedEntry>

/** Entrada generica de perfiles, servida para cualquier `/p/<slug>`. */
const PARTNER_ENTRY = '/p/'
/** Entrada del panel, servida para cualquier `/panel/<token>`. */
const PANEL_ENTRY = '/panel/'

const OBJECT_ROUTE = /^\/o\/([A-Za-z0-9_-]{1,64})\/?$/
const PARTNER_ROUTE = /^\/p\/[^/]+\/?$/
const VCARD_ROUTE = /^\/p\/([^/]+)\/contacto\.vcf$/
const PANEL_ROUTE = /^\/panel(\/[^/]*)?\/?$/
const PANEL_OBJECT_API = /^\/api\/panel\/objects\/([A-Za-z0-9_-]{1,64})$/

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      // Sin cache: un objeto reapuntado tiene que cambiar en el proximo toque.
      'Cache-Control': 'no-store',
    },
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function store(env: Env): DurableObjectStub | null {
  if (!env.STORE) return null
  return env.STORE.get(env.STORE.idFromName('global'))
}

/* Llama al Durable Object. Si falla (binding recien creado, error puntual),
   devuelve null y quien llama decide el respaldo: nunca se rompe el toque. */
async function ask<T>(env: Env, path: string, init?: RequestInit): Promise<T | null> {
  const stub = store(env)
  if (!stub) return null
  try {
    const res = await stub.fetch(`https://store.hito${path}`, init)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch (err) {
    console.error(`HitoStore fallo en ${path}:`, err)
    return null
  }
}

/** Destino de un puerto: almacen, KV historico, y por ultimo la semilla. */
async function resolveTarget(id: string, env: Env): Promise<string | null> {
  const fromStore = await ask<{ to: string | null }>(env, `/destination?id=${encodeURIComponent(id)}`)
  if (fromStore?.to) return fromStore.to

  if (env.PUERTOS) {
    try {
      const override = await env.PUERTOS.get(`to:${id}`)
      if (override) return override
    } catch (err) {
      console.error(`KV PUERTOS fallo para "${id}":`, err)
    }
  }
  return SEED[id]?.to ?? null
}

/** Un punto por toque. `indexes` permite filtrar por objeto al consultar. */
function countHit(env: Env, request: Request, id: string, target: string, owner: string): void {
  if (!env.TOQUES) return
  try {
    const country = (request.headers.get('cf-ipcountry') ?? '').slice(0, 2)
    const ua = request.headers.get('user-agent') ?? ''
    const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop'
    env.TOQUES.writeDataPoint({
      indexes: [id],
      blobs: [owner, target, country, device],
      doubles: [1],
    })
  } catch (err) {
    console.error(`No se pudo contar el toque de "${id}":`, err)
  }
}

/* --- Panel --------------------------------------------------------------- */

type RawLink = { kind: string; label: string; phone?: string; handle?: string; href?: string }
type RawPartner = {
  slug: string
  name: string
  tagline?: string
  location?: string
  bio?: string
  photo?: string
  links?: RawLink[]
  modules?: { type: string }[]
}

const PARTNERS = partnersRegistry.partners as RawPartner[]

/** Destinos sugeridos de un cliente: los espacios esperados (su pagina, su
    WhatsApp, su Instagram, su catalogo) ya resueltos como URL, para que no
    tenga que tipear nada. */
function suggestionsFor(slug: string): { label: string; url: string }[] {
  const partner = PARTNERS.find((p) => p.slug === slug)
  const out = [{ label: 'Mi página', url: `/p/${slug}` }]
  if (!partner) return out

  for (const link of partner.links ?? []) {
    try {
      if (link.kind === 'whatsapp' && link.phone) {
        out.push({ label: 'Mi WhatsApp', url: whatsappHref(link.phone) })
      } else if (link.kind === 'instagram' && link.handle) {
        out.push({ label: 'Mi Instagram', url: instagramHref(link.handle) })
      } else if (link.kind === 'facebook' && link.href) {
        out.push({ label: 'Mi Facebook', url: link.href })
      } else if (link.kind === 'email' && link.href) {
        out.push({ label: 'Mi email', url: link.href })
      }
    } catch {
      // Un link mal cargado no puede romper el panel entero.
    }
  }
  if ((partner.modules ?? []).some((m) => m.type === 'catalogo')) {
    out.push({ label: 'Mi catálogo', url: `/p/${slug}#catalog-${slug}` })
  }
  return out
}

/** Objetos de un cliente. Sin almacen, se derivan de la semilla. */
async function objectsOf(owner: string, env: Env): Promise<ObjectRow[]> {
  const fromStore = await ask<{ objects: ObjectRow[] }>(
    env,
    `/objects?owner=${encodeURIComponent(owner)}`,
  )
  if (fromStore?.objects?.length) return fromStore.objects

  return Object.entries(SEED)
    .filter(([, entry]) => entry.owner === owner)
    .map(([id, entry]) => ({
      id,
      owner,
      kind: kindFromId(id),
      label: entry.label ?? '',
      to: entry.to,
    }))
}

/** Token del header. Nunca viaja en la URL de la API: la URL `/panel/<token>`
    solo carga la app, y la app lo manda aca. */
function tokenOf(request: Request): string {
  return (request.headers.get('x-hito-token') ?? '').trim()
}

async function ownerOf(request: Request, env: Env): Promise<string | null> {
  const token = tokenOf(request)
  if (!token) return null
  const res = await ask<{ owner: string | null }>(
    env,
    `/owner?token=${encodeURIComponent(token)}`,
  )
  return res?.owner ?? null
}

/** Acepta una ruta interna del sitio o una URL http/https. Todo lo demas
    (javascript:, data:, mailto sin validar) se rechaza. */
function validDestination(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (value.startsWith('/')) return value.startsWith('//') ? null : value
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return null
  }
  return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null
}

async function handlePanelApi(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/panel/')) return null

  const owner = await ownerOf(request, env)
  if (!owner) return json({ error: 'token invalido' }, 401)

  if (url.pathname === '/api/panel/me' && request.method === 'GET') {
    const partner = PARTNERS.find((p) => p.slug === owner)
    return json({
      owner,
      name: partner?.name ?? owner,
      page: `/p/${owner}`,
      objects: await objectsOf(owner, env),
      suggestions: suggestionsFor(owner),
    })
  }

  const match = url.pathname.match(PANEL_OBJECT_API)
  if (match && request.method === 'PATCH') {
    if (!store(env)) {
      return json({ error: 'El panel todavía no puede guardar cambios.' }, 503)
    }
    let body: { to?: string }
    try {
      body = (await request.json()) as { to?: string }
    } catch {
      return json({ error: 'cuerpo invalido' }, 400)
    }
    const to = validDestination(body.to ?? '')
    if (!to) return json({ error: 'Poné un link que empiece con https:// o una ruta del sitio.' }, 400)

    const res = await ask<{ ok: boolean }>(env, '/set-destination', {
      method: 'POST',
      body: JSON.stringify({ owner, id: match[1], to }),
    })
    if (!res?.ok) return json({ error: 'No se pudo guardar.' }, 400)
    return json({ ok: true, to })
  }

  return json({ error: 'not found' }, 404)
}

/** Lo minimo del contexto de ejecucion que usamos: dejar seguir una promesa
    despues de contestar. */
type Ctx = { waitUntil(promise: Promise<unknown>): void }

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url)

    /* Formulario de la landing. El navegador ya no le habla a Google: manda
       la consulta aca y recibe un si o un no de verdad. Ver worker/leads.ts. */
    if (url.pathname === '/api/lead') {
      if (request.method !== 'POST') return json({ error: 'metodo no permitido' }, 405)
      const result = await handleLead(
        request,
        (path, init) => ask(env, path, init),
        (promise) => ctx.waitUntil(promise),
        env.REENVIO_CONSULTAS !== 'off',
      )
      return result.ok
        ? json({ ok: true })
        : json({ ok: false, error: result.error }, result.status)
    }

    const apiResponse = await handlePanelApi(request, env, url)
    if (apiResponse) return apiResponse

    const objectMatch = url.pathname.match(OBJECT_ROUTE)
    if (objectMatch) {
      const id = objectMatch[1]
      const target = await resolveTarget(id, env)
      if (!target) {
        // Un objeto impreso con un id desconocido no puede llevar a un error:
        // va a la landing, con el id en la query para poder rastrearlo.
        countHit(env, request, id, '(desconocido)', '(sin dueno)')
        return redirect(new URL(`/?o=${encodeURIComponent(id)}`, url).toString())
      }
      countHit(env, request, id, target, SEED[id]?.owner ?? '(sin dueno)')
      return redirect(target.startsWith('/') ? new URL(target, url).toString() : target)
    }

    if (PANEL_ROUTE.test(url.pathname)) {
      return env.ASSETS.fetch(new Request(new URL(PANEL_ENTRY, url).toString(), request))
    }

    /* Archivo de contacto del perfil. Se sirve `inline`: con ese encabezado
       Safari abre la ficha y ofrece agregarlo a la agenda, en vez de bajar un
       archivo a Archivos; Android lo manda igual a Contactos. */
    const vcardMatch = url.pathname.match(VCARD_ROUTE)
    if (vcardMatch) {
      const partner = PARTNERS.find((p) => p.slug === vcardMatch[1].toLowerCase()) as
        | VCardPartner
        | undefined
      if (!partner) return new Response('Perfil no encontrado', { status: 404 })
      return new Response(buildVCard(partner, url.origin), {
        headers: {
          'Content-Type': 'text/vcard; charset=utf-8',
          'Content-Disposition': `inline; filename="${vcardFilename(partner.name)}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    if (PARTNER_ROUTE.test(url.pathname)) {
      const response = await env.ASSETS.fetch(
        new Request(new URL(PARTNER_ENTRY, url).toString(), request),
      )
      /* El <head> del HTML es generico: se personaliza aca para que al
         compartir el link aparezcan el nombre y la foto del partner, y no
         "Perfil · hito.uno". WhatsApp y los buscadores no ejecutan React. */
      const slug = url.pathname.split('/').filter(Boolean)[1]?.toLowerCase()
      const partner = PARTNERS.find((p) => p.slug === slug) as MetaPartner | undefined
      if (!partner || !response.ok) return response
      return withProfileMeta(response, partner, url.origin)
    }

    return env.ASSETS.fetch(request)
  },
}
