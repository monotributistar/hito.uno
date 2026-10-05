/* Rutas del truco: crear una sala, listar las mesas del local y conectar cada
   celular por WebSocket a su sala. Todo vive bajo `/api/truco/`, asi que no
   choca con el resto de `/api/*`. Devuelve null si la ruta no es del truco. */

import { codigoValido, generarCodigo, validarConfigSala } from './sala'
import type { EntornoTruco } from './plataforma'

const MAX_CUERPO = 1024
/** Tope de salas abiertas a la vez: evita que alguien llene el almacen creando salas. */
const MAX_SALAS = 100

const RUTA_SALAS = '/api/truco/salas'
const RUTA_WS = /^\/api\/truco\/sala\/([^/]+)\/ws$/

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

/** Un navegador siempre manda Origin: si no coincide con el host, es otra
    pagina intentando usar la sala. */
function origenPermitido(request: Request, url: URL): boolean {
  const origen = request.headers.get('Origin')
  if (origen === null) return true
  try {
    return new URL(origen).host === url.host
  } catch {
    return false
  }
}

export function esRutaTruco(pathname: string): boolean {
  return pathname === RUTA_SALAS || pathname.startsWith('/api/truco/')
}

export async function manejarTruco(request: Request, env: EntornoTruco, url: URL): Promise<Response | null> {
  if (!esRutaTruco(url.pathname)) return null

  const salas = env.TRUCO_SALA
  const registro = env.TRUCO_REGISTRO
  if (!salas || !registro) return json({ error: 'el truco no esta disponible en este entorno' }, 503)
  const instanciaRegistro = registro.get(registro.idFromName('global'))

  if (url.pathname === RUTA_SALAS && request.method === 'GET') {
    return instanciaRegistro.fetch('https://truco.interno/listar')
  }

  if (url.pathname === RUTA_SALAS && request.method === 'POST') {
    if (!origenPermitido(request, url)) return json({ error: 'origen no permitido' }, 403)
    const texto = await request.text()
    if (texto.length > MAX_CUERPO) return json({ error: 'cuerpo demasiado grande' }, 413)
    let cuerpo: unknown
    try {
      cuerpo = JSON.parse(texto)
    } catch {
      return json({ error: 'JSON invalido' }, 400)
    }
    const cfg = validarConfigSala(cuerpo)
    if (!cfg.ok) return json({ error: cfg.error }, 400)

    const { cuenta } = (await (await instanciaRegistro.fetch('https://truco.interno/cuenta')).json()) as {
      cuenta: number
    }
    if (cuenta >= MAX_SALAS) return json({ error: 'hay demasiadas salas abiertas, proba en un rato' }, 429)

    for (let intento = 0; intento < 5; intento++) {
      const codigo = generarCodigo()
      const sala = salas.get(salas.idFromName(codigo))
      const r = await sala.fetch('https://truco.interno/crear', {
        method: 'POST',
        body: JSON.stringify({ config: cfg.config, codigo }),
      })
      const { creada } = (await r.json()) as { creada: boolean }
      if (creada) return json({ codigo }, 201)
    }
    return json({ error: 'no se pudo crear la sala' }, 503)
  }

  const ws = url.pathname.match(RUTA_WS)
  if (ws) {
    const codigo = ws[1]
    if (!codigoValido(codigo)) return json({ error: 'codigo invalido' }, 400)
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'se esperaba WebSocket' }, 426)
    if (!origenPermitido(request, url)) return json({ error: 'origen no permitido' }, 403)
    return salas.get(salas.idFromName(codigo)).fetch(request)
  }

  return json({ error: 'no encontrado' }, 404)
}
