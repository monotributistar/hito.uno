/* Worker de hito.uno.
   Cloudflare sirve primero los archivos estaticos de `dist/`. Solo cuando una
   ruta no coincide con ningun archivo (o esta en `run_worker_first`) llega
   aca. Este Worker resuelve dos cosas que un sitio estatico no puede:

   1. `/p/<slug>` — perfiles partner. Hay una sola entrada HTML (`p/index.html`)
      para todos los perfiles; el slug se lee de la URL en el cliente. Sin este
      paso, `/p/stephano` no existe como archivo y el fallback SPA devolveria
      la landing principal.

   2. `/o/<id>` — puertos. Cada objeto fisico (tarjeta, llavero, porta tarjetas)
      lleva impreso un `/o/<id>` en vez de la URL final. Asi un QR ya impreso se
      puede reapuntar sin reimprimir. La redireccion es 302 y sin cache,
      justamente para que el cambio se vea al instante.

   El destino de un puerto se resuelve en dos capas:
   - `worker/objects.json`: la tabla base, versionada en el repo. Cambiarla es
     un commit y un deploy.
   - KV `PUERTOS` (opcional): si el binding existe y tiene la clave `to:<id>`,
     gana sobre el JSON. Es lo que va a editar el dashboard minimo sin deploy.
     Mientras el binding no este configurado, el Worker funciona igual.

   Cada redireccion se cuenta en Analytics Engine (`TOQUES`), que no necesita
   crear nada por adelantado y no agrega latencia. De ahi salen las metricas
   de toques por objeto cuando se quiera mostrarlas. */

import objects from './objects.json'

type ObjectEntry = {
  /** Destino: ruta interna (`/p/danaarx`) o URL completa. */
  to: string
  /** Que objeto fisico es y de quien. Solo documentacion. */
  label?: string
  owner?: string
}

type AssetsBinding = { fetch(request: Request): Promise<Response> }
type KVBinding = { get(key: string): Promise<string | null> }
type AnalyticsBinding = {
  writeDataPoint(point: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void
}

export interface Env {
  ASSETS: AssetsBinding
  /** KV con destinos editables en caliente. Opcional hasta que se cree el namespace. */
  PUERTOS?: KVBinding
  /** Analytics Engine con un punto por redireccion. Opcional por si se quita el binding. */
  TOQUES?: AnalyticsBinding
}

const OBJECTS = objects.objects as Record<string, ObjectEntry>

/** Entrada generica de perfiles. Se pide con barra final: es la forma canonica
    del asset y evita la redireccion automatica de `/p/index.html` a `/p/`. */
const PARTNER_ENTRY = '/p/'

const OBJECT_ROUTE = /^\/o\/([A-Za-z0-9_-]{1,64})\/?$/
const PARTNER_ROUTE = /^\/p\/[^/]+\/?$/

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

/** Destino de un puerto: KV si existe y tiene el id, si no la tabla del repo.
    Un fallo de KV no rompe el toque: se cae al JSON. */
async function resolveTarget(id: string, env: Env): Promise<{ to: string; source: 'kv' | 'json' } | null> {
  if (env.PUERTOS) {
    try {
      const override = await env.PUERTOS.get(`to:${id}`)
      if (override) return { to: override, source: 'kv' }
    } catch (err) {
      console.error(`KV PUERTOS fallo para "${id}":`, err)
    }
  }
  const entry = OBJECTS[id]
  return entry ? { to: entry.to, source: 'json' } : null
}

/** Un punto por toque. `indexes` permite filtrar por objeto al consultar;
    `blobs` guarda el destino resuelto y el pais para leerlos despues. */
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const objectMatch = url.pathname.match(OBJECT_ROUTE)
    if (objectMatch) {
      const id = objectMatch[1]
      const resolved = await resolveTarget(id, env)
      if (!resolved) {
        // Un objeto impreso con un id que no esta en la tabla no puede llevar a
        // un error: va a la landing, con el id en la query para poder rastrearlo.
        countHit(env, request, id, '(desconocido)', '(sin dueno)')
        return redirect(new URL(`/?o=${encodeURIComponent(id)}`, url).toString())
      }
      const target = resolved.to.startsWith('/') ? new URL(resolved.to, url).toString() : resolved.to
      countHit(env, request, id, resolved.to, OBJECTS[id]?.owner ?? '(kv)')
      return redirect(target)
    }

    if (PARTNER_ROUTE.test(url.pathname)) {
      const entryRequest = new Request(new URL(PARTNER_ENTRY, url).toString(), request)
      return env.ASSETS.fetch(entryRequest)
    }

    return env.ASSETS.fetch(request)
  },
}
