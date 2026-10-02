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
import { REVOCADOS, tokensRevocados } from './revocados'

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
    // exista, la semilla este cargada y los tokens revocados esten borrados.
    // Sin esto, un pedido con un token revocado podria colarse en el instante
    // entre el arranque y el borrado.
    state.blockConcurrencyWhile(async () => {
      this.migrate()
      await this.revocar()
    })
  }

  /** Borra los tokens de la lista de revocados (ver revocados.ts). Corre
      despues de la semilla a proposito: si alguien volviera a poner un token
      revocado en tokens.json, la semilla lo insertaria y esto lo borra igual. */
  private async revocar(): Promise<void> {
    const todos = this.sql.exec<{ token: string }>('SELECT token FROM tokens').toArray().map((r) => r.token)
    const aBorrar = await tokensRevocados(
      todos,
      REVOCADOS.map((r) => r.hash),
    )
    for (const token of aBorrar) {
      this.sql.exec('DELETE FROM tokens WHERE token = ?', token)
    }
    if (aBorrar.length) console.log(`HitoStore: ${aBorrar.length} token(s) revocado(s) borrado(s).`)
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
    /* Consultas del formulario de la landing. Se guardan ANTES de intentar
       mandarlas a la planilla: si Google falla, la consulta no se pierde y se
       puede recuperar de aca. `forwarded` dice si la planilla la confirmo. */
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        payload TEXT NOT NULL,
        forwarded INTEGER NOT NULL DEFAULT 0,
        error TEXT
      )
    `)
    /* Freno de spam por ventana de tiempo. Guarda un hash corto, nunca la IP:
       alcanza para contar y no identifica a nadie. Las filas viejas se borran. */
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS rate (
        bucket TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        started_at INTEGER NOT NULL
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

  /** Guarda la consulta y devuelve su id, para marcarla despues. */
  saveLead(payload: string): number {
    this.sql.exec('INSERT INTO leads (payload) VALUES (?)', payload)
    const rows = this.sql.exec<{ id: number }>('SELECT last_insert_rowid() AS id').toArray()
    return rows.length ? rows[0].id : 0
  }

  /** Anota si la planilla acepto la consulta, y si no, por que. */
  markLead(id: number, forwarded: boolean, error?: string): void {
    this.sql.exec('UPDATE leads SET forwarded = ?, error = ? WHERE id = ?', forwarded ? 1 : 0, error ?? null, id)
  }

  /** Consultas que la planilla nunca confirmo: son las que hay que recuperar. */
  pendingLeads(limit = 50): { id: number; created_at: string; payload: string; error: string | null }[] {
    return this.sql
      .exec<{ id: number; created_at: string; payload: string; error: string | null }>(
        'SELECT id, created_at, payload, error FROM leads WHERE forwarded = 0 ORDER BY id DESC LIMIT ?',
        limit,
      )
      .toArray()
  }

  /** Cuenta un intento. Devuelve false cuando se pasa del limite en la ventana. */
  allow(bucket: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    this.sql.exec('DELETE FROM rate WHERE started_at < ?', now - windowMs * 10)
    const rows = this.sql
      .exec<{ count: number; started_at: number }>('SELECT count, started_at FROM rate WHERE bucket = ?', bucket)
      .toArray()
    if (!rows.length || now - rows[0].started_at > windowMs) {
      this.sql.exec(
        'INSERT INTO rate (bucket, count, started_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = 1, started_at = excluded.started_at',
        bucket,
        now,
      )
      return true
    }
    if (rows[0].count >= limit) return false
    this.sql.exec('UPDATE rate SET count = count + 1 WHERE bucket = ?', bucket)
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
      if (url.pathname === '/lead' && request.method === 'POST') {
        const body = (await request.json()) as { payload: string }
        return json({ id: this.saveLead(body.payload) })
      }
      if (url.pathname === '/lead-mark' && request.method === 'POST') {
        const body = (await request.json()) as { id: number; forwarded: boolean; error?: string }
        this.markLead(body.id, body.forwarded, body.error)
        return json({ ok: true })
      }
      if (url.pathname === '/leads-pending') {
        return json({ leads: this.pendingLeads() })
      }
      if (url.pathname === '/allow' && request.method === 'POST') {
        const body = (await request.json()) as { bucket: string; limit: number; windowMs: number }
        return json({ allowed: this.allow(body.bucket, body.limit, body.windowMs) })
      }
    } catch (err) {
      return json({ error: String(err) }, 500)
    }
    return json({ error: 'not found' }, 404)
  }
}

/** Convencion de ids: `t-` tarjeta, `pt-` porta tarjetas, `ll-` llavero,
    `ap-` apoyavasos, `pl-` placa, `re-` recibidor, `pg-` pagina comercial
    (no es un objeto fisico: es un QR que lleva a /software, /comercios...). */
export function kindFromId(id: string): string {
  const prefix = id.split('-')[0]
  const map: Record<string, string> = {
    t: 'tarjeta',
    pt: 'porta',
    ll: 'llavero',
    ap: 'apoyavasos',
    pl: 'placa',
    re: 'recibidor',
    pg: 'pagina',
  }
  return map[prefix] ?? 'tarjeta'
}
