/* Salas de truco: un Durable Object por sala (TrucoSala) y uno solo que lleva
   la lista de mesas para la pantalla del local (TrucoRegistro).

   La logica del juego vive en motor.ts, bot.ts y sala.ts (pura y probada);
   aca solo hay red, almacenamiento y las alarmas del bot, del reloj de
   jugada y de la limpieza. Ver docs/TRUCO.md. */

import {
  LIMITE_JUGADA_MS,
  botPendiente,
  crearSala,
  iniciar,
  jugar,
  mensajePara,
  moverBot,
  normalizar,
  resolverVencimiento,
  resumenPublico,
  tokenValido,
  unirse,
  vencimiento,
  type ResumenSala,
  type SalaEstado,
} from './sala'
import type { Config, Evento } from './motor'
import type { EntornoTruco, EstadoDO, SocketDO } from './plataforma'

/** Constructor global de pares de WebSocket de workerd (no esta en los tipos estandar). */
declare const WebSocketPair: { new (): { 0: WebSocket; 1: WebSocket } }

/** Una sala sin actividad desaparece a las 6 horas; una partida terminada, a los 10 minutos. */
export const TTL_ACTIVA_MS = 6 * 60 * 60 * 1000
export const TTL_FIN_MS = 10 * 60 * 1000

const MAX_MENSAJE = 2000
const VENTANA_MS = 10_000
const MAX_MENSAJES_POR_VENTANA = 40

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

/** Lee el limite de tiempo del entorno; un valor ausente o fuera de rango usa el normal. */
export function limiteDesdeEntorno(valor: string | undefined): number {
  const n = Number(valor)
  return Number.isInteger(n) && n >= 1000 && n <= 300_000 ? n : LIMITE_JUGADA_MS
}

type Adjunto = {
  /** Se llena cuando el celular se une. */
  token: string | null
}

/** Aviso que acompana al estado cuando el reloj cambio algo: el bot jugo por
    alguien, o alguien abandono. */
type AvisoTiempo = { tipo: 'autojugada' | 'abandono'; seat: number }

function registroDe(env: EntornoTruco) {
  const ns = env.TRUCO_REGISTRO
  return ns ? ns.get(ns.idFromName('global')) : null
}

export class TrucoSala {
  private s: SalaEstado | null = null
  private ritmo = new WeakMap<object, { desde: number; n: number }>()

  constructor(
    private state: EstadoDO,
    private env: EntornoTruco,
  ) {
    state.blockConcurrencyWhile(async () => {
      const guardada = await state.storage.get<SalaEstado>('sala')
      // normalizar completa campos nuevos en salas guardadas antes de un cambio de codigo.
      this.s = guardada ? normalizar(guardada) : null
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Llamada interna del Worker: crea la sala. Devuelve si el codigo estaba libre.
    if (url.hostname === 'truco.interno' && url.pathname === '/crear' && request.method === 'POST') {
      const { config, codigo } = (await request.json()) as { config: Config; codigo: string }
      if (this.s !== null) return json({ creada: false })
      this.s = crearSala(codigo, config, Date.now(), limiteDesdeEntorno(this.env.TRUCO_LIMITE_MS))
      await this.guardar()
      return json({ creada: true })
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      if (this.s === null) return json({ error: 'la sala no existe' }, 404)
      const par = new WebSocketPair()
      const servidor = par[1]
      this.state.acceptWebSocket(servidor)
      ;(servidor as SocketDO).serializeAttachment({ token: null } satisfies Adjunto)
      // `webSocket` no esta en los tipos estandar de ResponseInit.
      return new Response(null, { status: 101, webSocket: par[0] } as ResponseInit)
    }

    return json({ error: 'no encontrado' }, 404)
  }

  async webSocketMessage(ws: SocketDO, mensaje: string | ArrayBuffer): Promise<void> {
    if (typeof mensaje !== 'string' || mensaje.length > MAX_MENSAJE) {
      ws.close(1009, 'mensaje demasiado grande')
      return
    }
    if (this.demasiadoRapido(ws)) return this.error(ws, 'demasiados mensajes seguidos')

    let datos: unknown
    try {
      datos = JSON.parse(mensaje)
    } catch {
      return this.error(ws, 'mensaje invalido')
    }
    if (datos === null || typeof datos !== 'object') return this.error(ws, 'mensaje invalido')
    const msg = datos as Record<string, unknown>
    if (this.s === null) return this.error(ws, 'la sala ya no existe')

    const ahora = Date.now()
    const adjunto = (ws.deserializeAttachment() ?? { token: null }) as Adjunto

    if (msg.t === 'ping') {
      ws.send(JSON.stringify({ t: 'pong' }))
      return
    }

    if (msg.t === 'unirse') {
      if (!tokenValido(msg.token)) return this.error(ws, 'token invalido')
      const r = unirse(this.s, msg.token, msg.alias, ahora)
      if (!r.ok) return this.error(ws, r.error)
      ws.serializeAttachment({ token: msg.token } satisfies Adjunto)
      await this.cambio()
      return
    }

    // Todo lo demas exige haberse unido: el asiento sale del token guardado, no del mensaje.
    if (adjunto.token === null) return this.error(ws, 'primero hay que unirse a la sala')

    if (msg.t === 'iniciar') {
      const r = iniciar(this.s, adjunto.token, ahora)
      if (!r.ok) return this.error(ws, r.error)
      await this.cambio()
      return
    }

    if (msg.t === 'accion') {
      const accion = msg.accion as { tipo?: unknown } | null
      if (accion === null || typeof accion !== 'object' || typeof accion.tipo !== 'string') {
        return this.error(ws, 'accion invalida')
      }
      const r = jugar(this.s, adjunto.token, accion as Parameters<typeof jugar>[2], ahora)
      if (!r.ok) return this.error(ws, r.error)
      await this.cambio(r.eventos)
      return
    }

    this.error(ws, 'mensaje desconocido')
  }

  async webSocketClose(ws: SocketDO, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code, '')
    } catch (e) {
      console.warn('truco: no se pudo cerrar el socket', e)
    }
    if (this.s !== null) this.difundir()
  }

  async webSocketError(ws: SocketDO, error: unknown): Promise<void> {
    console.warn('truco: error de socket', error)
    await this.webSocketClose(ws, 1011)
  }

  /* Se despierta para mover al bot (con pausa, para que se sienta humano), para
     vencer la jugada de una persona que no responde, o para limpiar la sala vieja. */
  async alarm(): Promise<void> {
    if (this.s === null) return
    const ahora = Date.now()
    const ttl = this.s.fase === 'fin' ? TTL_FIN_MS : TTL_ACTIVA_MS
    if (ahora - this.s.actualizada >= ttl) {
      await this.limpiar()
      return
    }
    if (botPendiente(this.s) !== null) {
      const r = moverBot(this.s, ahora)
      if (r.ok) await this.cambio(r.eventos)
      else console.warn('truco: el bot no pudo mover', r.error)
      return
    }
    const vencida = resolverVencimiento(this.s, ahora)
    if (vencida.ok) {
      await this.cambio(vencida.eventos, { tipo: vencida.resultado, seat: vencida.seat })
      return
    }
    await this.programar()
  }

  // ----- internos -----

  private demasiadoRapido(ws: SocketDO): boolean {
    const ahora = Date.now()
    const r = this.ritmo.get(ws) ?? { desde: ahora, n: 0 }
    if (ahora - r.desde > VENTANA_MS) {
      r.desde = ahora
      r.n = 0
    }
    r.n += 1
    this.ritmo.set(ws, r)
    return r.n > MAX_MENSAJES_POR_VENTANA
  }

  private error(ws: SocketDO, mensaje: string): void {
    try {
      ws.send(JSON.stringify({ t: 'error', mensaje }))
    } catch (e) {
      console.warn('truco: no se pudo enviar el error', e)
    }
  }

  private async guardar(): Promise<void> {
    await this.state.storage.put('sala', this.s)
  }

  /** Despues de cualquier cambio: guardar, avisar a todos, actualizar la
      pantalla del local y programar la proxima alarma. */
  private async cambio(eventos?: Evento[], aviso?: AvisoTiempo): Promise<void> {
    await this.guardar()
    this.difundir(eventos, aviso)
    await this.avisarRegistro()
    await this.programar()
  }

  private difundir(eventos?: Evento[], aviso?: AvisoTiempo): void {
    const s = this.s!
    // Un socket que se esta cerrando todavia aparece en la lista: no cuenta como conectado ni recibe mensajes.
    const sockets = this.state.getWebSockets().filter((w) => w.readyState === WebSocket.OPEN)
    const tokens = new Set<string>()
    for (const w of sockets) {
      const t = (w.deserializeAttachment() as Adjunto | null)?.token
      if (t) tokens.add(t)
    }
    const conectados = s.asientos.map(
      (a) => a !== null && (a.bot || (a.token !== null && tokens.has(a.token))),
    )
    for (const w of sockets) {
      const t = (w.deserializeAttachment() as Adjunto | null)?.token
      if (!t) continue
      const m = mensajePara(s, t)
      if (m === null) continue
      try {
        w.send(JSON.stringify({ ...m, conectados, eventos, aviso }))
      } catch (e) {
        console.warn('truco: no se pudo enviar el estado', e)
      }
    }
  }

  private async avisarRegistro(): Promise<void> {
    const registro = registroDe(this.env)
    if (!registro) return
    try {
      await registro.fetch('https://truco.interno/actualizar', {
        method: 'POST',
        body: JSON.stringify(resumenPublico(this.s!)),
      })
    } catch (e) {
      console.warn('truco: no se pudo avisar al registro', e)
    }
  }

  /** Una sola alarma: la mas cercana entre la pausa del bot, el vencimiento de
      la jugada de una persona y la limpieza. */
  private async programar(): Promise<void> {
    if (this.s === null) return
    if (botPendiente(this.s) !== null) {
      await this.state.storage.setAlarm(Date.now() + 1200 + Math.random() * 1500)
      return
    }
    const ttl = this.s.fase === 'fin' ? TTL_FIN_MS : TTL_ACTIVA_MS
    const limpieza = this.s.actualizada + ttl
    await this.state.storage.setAlarm(Math.min(vencimiento(this.s) ?? limpieza, limpieza))
  }

  private async limpiar(): Promise<void> {
    const codigo = this.s!.codigo
    for (const w of this.state.getWebSockets()) {
      try {
        w.close(1000, 'sala cerrada por inactividad')
      } catch (e) {
        console.warn('truco: no se pudo cerrar el socket', e)
      }
    }
    await this.state.storage.deleteAll()
    this.s = null
    const registro = registroDe(this.env)
    if (!registro) return
    try {
      await registro.fetch('https://truco.interno/quitar', {
        method: 'POST',
        body: JSON.stringify({ codigo }),
      })
    } catch (e) {
      console.warn('truco: no se pudo quitar del registro', e)
    }
  }
}

/* Lista de mesas para la pantalla del local. Una sola instancia global
   (`idFromName('global')`); el volumen es de pocas decenas de salas. */
export class TrucoRegistro {
  constructor(private state: EstadoDO) {}

  private async leer(): Promise<Record<string, ResumenSala>> {
    return (await this.state.storage.get<Record<string, ResumenSala>>('salas')) ?? {}
  }

  /** Descarta las que no tuvieron actividad (el registro no se entera si una sala se cierra sola). */
  private vigentes(salas: Record<string, ResumenSala>): Record<string, ResumenSala> {
    const ahora = Date.now()
    const out: Record<string, ResumenSala> = {}
    for (const [codigo, r] of Object.entries(salas)) {
      const ttl = r.fase === 'fin' ? TTL_FIN_MS : TTL_ACTIVA_MS
      if (ahora - r.actualizada < ttl) out[codigo] = r
    }
    return out
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.hostname !== 'truco.interno') return json({ error: 'no encontrado' }, 404)

    if (url.pathname === '/actualizar' && request.method === 'POST') {
      const resumen = (await request.json()) as ResumenSala
      const salas = this.vigentes(await this.leer())
      salas[resumen.codigo] = resumen
      await this.state.storage.put('salas', salas)
      return json({ ok: true })
    }

    if (url.pathname === '/quitar' && request.method === 'POST') {
      const { codigo } = (await request.json()) as { codigo: string }
      const salas = await this.leer()
      delete salas[codigo]
      await this.state.storage.put('salas', salas)
      return json({ ok: true })
    }

    if (url.pathname === '/cuenta' && request.method === 'GET') {
      return json({ cuenta: Object.keys(this.vigentes(await this.leer())).length })
    }

    if (url.pathname === '/listar' && request.method === 'GET') {
      const lista = Object.values(this.vigentes(await this.leer()))
        .sort((a, b) => b.actualizada - a.actualizada)
        .slice(0, 50)
      return json({ salas: lista })
    }

    return json({ error: 'no encontrado' }, 404)
  }
}
