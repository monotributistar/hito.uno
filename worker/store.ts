/* Almacen del Panel: un Durable Object con SQLite.

   Por que un Durable Object y no KV: se crea solo en el deploy (la migracion
   de `wrangler.jsonc`), no hay que autenticar wrangler en ninguna maquina ni
   crear nada a mano en el panel de Cloudflare. Y las escrituras son
   consistentes: cuando el cliente guarda una URL, el proximo toque ya la ve.

   Es una sola instancia global (`idFromName('global')`): el volumen de Hito
   es de decenas de objetos, no hace falta repartir.

   `objects.json` y `tokens.json` son la SEMILLA: se cargan la primera vez y
   despues manda la base. Si el objeto no esta en la base, `worker/index.ts`
   cae al JSON, asi que un toque nunca termina en error. */

import objectsSeed from './objects.json'
import tokensSeed from './tokens.json'

export type ObjectRow = {
  id: string
  owner: string
  /** Que pieza fisica es. Define el icono y la foto en el panel. */
  kind: string
  label: string
  /** Destino actual: ruta interna (`/p/slug`) o URL completa. */
  to: string
}

/* Tipos minimos de la plataforma. El proyecto no instala
   @cloudflare/workers-types (el tsconfig del worker va con `types: []`), asi
   que declaramos solo lo que usamos. */
type SqlStorage = {
  exec<T = Record<string, unknown>>(query: string, ...bindings: unknown[]): { toArray(): T[] }
}
type DurableObjectState = {
  storage: { sql: SqlStorage }
  blockConcurrencyWhile(callback: () => void | Promise<void>): void
}

export class HitoStore {
  private sql: SqlStorage

  constructor(state: DurableObjectState) {
    this.sql = state.storage.sql
    // blockConcurrencyWhile: ninguna peticion entra hasta que el esquema
    // exista y la semilla este cargada.
    state.blockConcurrencyWhile(() => this.migrate())
  }

  private migrate(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS objects (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'tarjeta',
        label TEXT NOT NULL DEFAULT '',
        to_url TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
      )
    `)
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS tokens (
        token TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    // INSERT OR IGNORE: la semilla no pisa lo que el cliente ya cambio.
    for (const [id, entry] of Object.entries(objectsSeed.objects)) {
      const row = entry as { to: string; label?: string; owner?: string; kind?: string }
      this.sql.exec(
        'INSERT OR IGNORE INTO objects (id, owner, kind, label, to_url) VALUES (?, ?, ?, ?, ?)',
        id,
        row.owner ?? '',
        row.kind ?? kindFromId(id),
        row.label ?? '',
        row.to,
      )
    }
    for (const [token, entry] of Object.entries(tokensSeed.tokens)) {
      const row = entry as { owner: string }
      this.sql.exec('INSERT OR IGNORE INTO tokens (token, owner) VALUES (?, ?)', token, row.owner)
    }
  }

  ownerOfToken(token: string): string | null {
    const rows = this.sql
      .exec<{ owner: string }>('SELECT owner FROM tokens WHERE token = ?', token)
      .toArray()
    return rows.length ? rows[0].owner : null
  }

  objectsOf(owner: string): ObjectRow[] {
    return this.sql
      .exec<{ id: string; owner: string; kind: string; label: string; to_url: string }>(
        'SELECT id, owner, kind, label, to_url FROM objects WHERE owner = ? ORDER BY created_at, id',
        owner,
      )
      .toArray()
      .map((r) => ({ id: r.id, owner: r.owner, kind: r.kind, label: r.label, to: r.to_url }))
  }

  destinationOf(id: string): string | null {
    const rows = this.sql
      .exec<{ to_url: string }>('SELECT to_url FROM objects WHERE id = ?', id)
      .toArray()
    return rows.length ? rows[0].to_url : null
  }

  /** Cambia el destino de un objeto. Devuelve false si el objeto no existe o
      no es de ese dueno: un cliente solo puede reapuntar lo suyo. */
  setDestination(owner: string, id: string, to: string): boolean {
    const rows = this.sql
      .exec<{ owner: string }>('SELECT owner FROM objects WHERE id = ?', id)
      .toArray()
    if (!rows.length || rows[0].owner !== owner) return false
    this.sql.exec(
      "UPDATE objects SET to_url = ?, updated_at = datetime('now') WHERE id = ?",
      to,
      id,
    )
    return true
  }

  /* El binding de Durable Object habla por fetch. Cada ruta es una operacion;
     el cuerpo y la respuesta son JSON. */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })

    try {
      if (url.pathname === '/owner') {
        return json({ owner: this.ownerOfToken(url.searchParams.get('token') ?? '') })
      }
      if (url.pathname === '/objects') {
        return json({ objects: this.objectsOf(url.searchParams.get('owner') ?? '') })
      }
      if (url.pathname === '/destination') {
        return json({ to: this.destinationOf(url.searchParams.get('id') ?? '') })
      }
      if (url.pathname === '/set-destination' && request.method === 'POST') {
        const body = (await request.json()) as { owner: string; id: string; to: string }
        return json({ ok: this.setDestination(body.owner, body.id, body.to) })
      }
    } catch (err) {
      return json({ error: String(err) }, 500)
    }
    return json({ error: 'not found' }, 404)
  }
}

/** Convencion de ids: `t-` tarjeta, `pt-` porta tarjetas, `ll-` llavero,
    `ap-` apoyavasos, `pl-` placa, `re-` recibidor. */
export function kindFromId(id: string): string {
  const prefix = id.split('-')[0]
  const map: Record<string, string> = {
    t: 'tarjeta',
    pt: 'porta',
    ll: 'llavero',
    ap: 'apoyavasos',
    pl: 'placa',
    re: 'recibidor',
  }
  return map[prefix] ?? 'tarjeta'
}
