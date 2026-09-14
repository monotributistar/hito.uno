/* Worker de hito.uno.
   Cloudflare sirve primero los archivos estaticos de `dist/`. Solo cuando una
   ruta no coincide con ningun archivo llega aca. Este Worker resuelve dos
   cosas que un sitio estatico no puede:

   1. `/p/<slug>` — perfiles partner. Hay una sola entrada HTML (`p/index.html`)
      para todos los perfiles; el slug se lee de la URL en el cliente. Sin este
      paso, `/p/stephano` no existe como archivo y el fallback SPA devolveria
      la landing principal.

   2. `/o/<id>` — puertos. Cada objeto fisico (tarjeta, llavero, porta tarjetas)
      lleva impreso un `/o/<id>` en vez de la URL final. Asi un QR ya impreso se
      puede reapuntar cambiando la tabla `objects.json`. La redireccion es 302
      y sin cache, justamente para que el cambio se vea al instante.
      El conteo de toques y la edicion en caliente (dashboard minimo) llegan
      cuando la tabla pase a un almacenamiento de Cloudflare; la URL impresa no
      cambia. */

import objects from './objects.json'

type ObjectEntry = {
  /** Destino: ruta interna (`/p/danaarx`) o URL completa. */
  to: string
  /** Que objeto fisico es y de quien. Solo documentacion. */
  label?: string
  owner?: string
}

type AssetsBinding = { fetch(request: Request): Promise<Response> }

export interface Env {
  ASSETS: AssetsBinding
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const objectMatch = url.pathname.match(OBJECT_ROUTE)
    if (objectMatch) {
      const id = objectMatch[1]
      const entry = OBJECTS[id]
      if (!entry) {
        // Un objeto impreso con un id que no esta en la tabla no puede llevar a
        // un error: va a la landing, con el id en la query para poder rastrearlo.
        return redirect(new URL(`/?o=${encodeURIComponent(id)}`, url).toString())
      }
      const target = entry.to.startsWith('/') ? new URL(entry.to, url).toString() : entry.to
      return redirect(target)
    }

    if (PARTNER_ROUTE.test(url.pathname)) {
      const entryRequest = new Request(new URL(PARTNER_ENTRY, url).toString(), request)
      return env.ASSETS.fetch(entryRequest)
    }

    return env.ASSETS.fetch(request)
  },
}
