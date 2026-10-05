/* Tipos minimos de la plataforma para el truco.

   El proyecto no instala @cloudflare/workers-types (el tsconfig del worker va
   con `types: []`), asi que declaramos solo lo que usamos, igual que store.ts.
   Las clases de Durable Object NO extienden `DurableObject` de
   `cloudflare:workers` por la misma razon: se hablan por `fetch`, no por RPC. */

export type DurableObjectStub = { fetch(request: Request | string, init?: RequestInit): Promise<Response> }

export type DurableObjectNamespace = {
  idFromName(name: string): unknown
  get(id: unknown): DurableObjectStub
}

/** WebSocket de un Durable Object con hibernacion: guarda un adjunto chico que
    sobrevive aunque el objeto se duerma. */
export type SocketDO = WebSocket & {
  serializeAttachment(value: unknown): void
  deserializeAttachment(): unknown
}

export type EstadoDO = {
  storage: {
    get<T>(key: string): Promise<T | undefined>
    put(key: string, value: unknown): Promise<void>
    deleteAll(): Promise<void>
    setAlarm(when: number): Promise<void>
  }
  blockConcurrencyWhile(callback: () => void | Promise<void>): void
  acceptWebSocket(ws: WebSocket): void
  getWebSockets(): SocketDO[]
}

/** Lo que el truco necesita del entorno. Todo opcional: sin los bindings, las
    rutas del truco contestan 503 y el resto del sitio sigue como si nada. */
export type EntornoTruco = {
  TRUCO_SALA?: DurableObjectNamespace
  TRUCO_REGISTRO?: DurableObjectNamespace
  /** Solo para pruebas: acorta el tiempo por jugada (1 a 300 segundos). */
  TRUCO_LIMITE_MS?: string
}
