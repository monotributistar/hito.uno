// Logica de una sala de truco: asientos, alias, inicio, turnos del bot y lo que ve cada celular.
// Es logica pura y serializable (sin red ni tiempo propio) para probarla sin Cloudflare;
// el Durable Object solo la guarda, la conecta a los WebSockets y programa las pausas del bot.

import { decidir } from './bot'
import { accionesLegales, aplicar, crearPartida, equipoDe, vista } from './motor'
import type { Accion, Config, Estado, Evento, Vista } from './motor'

export interface Asiento {
  alias: string
  token: string | null // secreto del celular; null en los bots. Nunca sale del servidor.
  bot: boolean
}

export type Fase = 'espera' | 'jugando' | 'fin'
export type MotivoFin = 'puntos' | 'abandono'

// Tiempo que tiene una persona para jugar o responder antes de que el bot juegue por ella.
export const LIMITE_JUGADA_MS = 45_000
// Cuantos vencimientos seguidos se toleran: al segundo se considera abandono.
export const AUSENCIAS_PARA_ABANDONO = 2

export interface SalaEstado {
  codigo: string
  config: Config
  asientos: (Asiento | null)[]
  fase: Fase
  partida: Estado | null
  pvp: boolean | null // true si todos los asientos eran personas al empezar; define si cuenta para el ranking
  creada: number
  actualizada: number
  limiteMs: number // tiempo por jugada de cada persona
  turnoDesde: number | null // desde cuando espera la jugada actual (null si no hay partida en juego)
  ausencias: number[] // vencimientos seguidos por asiento; se reinician cuando la persona juega
  motivoFin: MotivoFin | null
  abandono: number | null // asiento que abandono, si el fin fue por abandono
}

export type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string }

export const ALIAS_MAX = 16
const ALIAS_RESERVADO = /^bot(\s*\d*)?$/i

// Alfabeto sin caracteres que se confunden (0/O, 1/I/L).
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generarCodigo(rng: () => number = Math.random): string {
  let c = ''
  for (let i = 0; i < 5; i++) c += ALFABETO_CODIGO[Math.floor(rng() * ALFABETO_CODIGO.length)]
  return c
}

export function codigoValido(codigo: unknown): codigo is string {
  return (
    typeof codigo === 'string' &&
    /^[A-Z2-9]{5}$/.test(codigo) &&
    [...codigo].every((ch) => ALFABETO_CODIGO.includes(ch))
  )
}

export function tokenValido(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(token)
}

// Limpia el alias: sin caracteres de control ni marcado, espacios colapsados, largo acotado.
export function limpiarAlias(crudo: unknown): string | null {
  if (typeof crudo !== 'string') return null
  const alias = crudo
    .replace(/[\u0000-\u001f\u007f<>&"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ALIAS_MAX)
    .trim()
  return alias.length > 0 ? alias : null
}

export function validarConfigSala(config: unknown): Res<{ config: Config }> {
  const c = config as Partial<Config> | null
  if (!c || typeof c !== 'object') return { ok: false, error: 'configuracion invalida' }
  if (c.jugadores !== 2 && c.jugadores !== 4) return { ok: false, error: 'jugadores debe ser 2 o 4' }
  if (c.puntos !== 15 && c.puntos !== 30) return { ok: false, error: 'puntos debe ser 15 o 30' }
  return { ok: true, config: { jugadores: c.jugadores, puntos: c.puntos } }
}

export function crearSala(
  codigo: string,
  config: Config,
  ahora: number,
  limiteMs: number = LIMITE_JUGADA_MS,
): SalaEstado {
  return {
    codigo,
    config,
    asientos: Array.from({ length: config.jugadores }, () => null),
    fase: 'espera',
    partida: null,
    pvp: null,
    creada: ahora,
    actualizada: ahora,
    limiteMs,
    turnoDesde: null,
    ausencias: Array.from({ length: config.jugadores }, () => 0),
    motivoFin: null,
    abandono: null,
  }
}

export function asientoDeToken(s: SalaEstado, token: string): number {
  return s.asientos.findIndex((a) => a !== null && a.token === token)
}

// Un celular entra a la sala. Si el token ya tiene asiento, retoma ese asiento (reconexion).
export function unirse(
  s: SalaEstado,
  token: string,
  aliasCrudo: unknown,
  ahora: number,
): Res<{ seat: number; nuevo: boolean }> {
  if (!tokenValido(token)) return { ok: false, error: 'token invalido' }
  const existente = asientoDeToken(s, token)
  if (existente >= 0) return { ok: true, seat: existente, nuevo: false }

  if (s.fase !== 'espera') return { ok: false, error: 'la partida ya empezo' }
  const alias = limpiarAlias(aliasCrudo)
  if (alias === null) return { ok: false, error: 'pone un alias' }
  if (ALIAS_RESERVADO.test(alias)) return { ok: false, error: 'ese alias esta reservado' }
  if (s.asientos.some((a) => a !== null && a.alias.toLowerCase() === alias.toLowerCase())) {
    return { ok: false, error: 'ese alias ya esta en la sala' }
  }
  const libre = s.asientos.findIndex((a) => a === null)
  if (libre < 0) return { ok: false, error: 'la sala esta llena' }

  s.asientos[libre] = { alias, token, bot: false }
  s.actualizada = ahora
  // Con todos los asientos ocupados por personas, arranca sola.
  if (s.asientos.every((a) => a !== null)) empezar(s, ahora)
  return { ok: true, seat: libre, nuevo: true }
}

function empezar(s: SalaEstado, ahora: number, rng: () => number = Math.random): void {
  s.pvp = s.asientos.every((a) => a !== null && !a.bot)
  s.partida = crearPartida(s.config, { rng })
  s.fase = 'jugando'
  s.actualizada = ahora
  s.turnoDesde = ahora
}

// El anfitrion (primer asiento) arranca la partida; los asientos libres se llenan con bots.
export function iniciar(s: SalaEstado, token: string, ahora: number, rng: () => number = Math.random): Res {
  if (s.fase !== 'espera') return { ok: false, error: 'la partida ya empezo' }
  const seat = asientoDeToken(s, token)
  if (seat < 0) return { ok: false, error: 'no estas en la sala' }
  if (seat !== 0) return { ok: false, error: 'solo el anfitrion puede empezar' }
  let n = 1
  for (let i = 0; i < s.asientos.length; i++) {
    if (s.asientos[i] === null) s.asientos[i] = { alias: `Bot ${n++}`, token: null, bot: true }
  }
  empezar(s, ahora, rng)
  return { ok: true }
}

// Un humano juega una accion. El asiento sale del token, nunca de lo que mande el cliente.
export function jugar(
  s: SalaEstado,
  token: string,
  accion: Accion,
  ahora: number,
  rng: () => number = Math.random,
): Res<{ eventos: Evento[] }> {
  if (s.fase !== 'jugando' || !s.partida) return { ok: false, error: 'no hay partida en juego' }
  const seat = asientoDeToken(s, token)
  if (seat < 0) return { ok: false, error: 'no estas en la sala' }
  const r = aplicarEn(s, seat, accion, ahora, rng)
  if (r.ok) s.ausencias[seat] = 0 // jugar a tiempo borra los vencimientos anteriores
  return r
}

function aplicarEn(
  s: SalaEstado,
  seat: number,
  accion: Accion,
  ahora: number,
  rng: () => number,
): Res<{ eventos: Evento[] }> {
  const r = aplicar(s.partida!, seat, accion, { rng })
  if (!r.ok) return { ok: false, error: r.error }
  s.partida = r.estado
  s.actualizada = ahora
  s.turnoDesde = ahora // empieza a correr el tiempo de quien mueve ahora
  if (r.estado.ganadorPartida !== null) {
    s.fase = 'fin'
    s.motivoFin = 'puntos'
    s.turnoDesde = null
  }
  return { ok: true, eventos: r.eventos }
}

// Asiento al que le toca mover ahora (jugar o responder un canto), o null si no hay partida en juego.
export function asientoQueMueve(s: SalaEstado): number | null {
  if (s.fase !== 'jugando' || !s.partida) return null
  for (let seat = 0; seat < s.config.jugadores; seat++) {
    if (accionesLegales(s.partida, seat).length > 0) return seat
  }
  return null
}

// Asiento de bot al que le toca mover ahora, o null (le toca a una persona o no hay partida).
export function botPendiente(s: SalaEstado): number | null {
  const seat = asientoQueMueve(s)
  return seat !== null && s.asientos[seat]?.bot ? seat : null
}

// Momento (ms desde epoch) en que se vence la jugada de la persona a la que le toca, o null.
export function vencimiento(s: SalaEstado): number | null {
  const seat = asientoQueMueve(s)
  if (seat === null || s.asientos[seat]?.bot || s.turnoDesde === null) return null
  return s.turnoDesde + s.limiteMs
}

export type ResultadoVencimiento =
  | { ok: true; resultado: 'autojugada'; seat: number; eventos: Evento[] }
  | { ok: true; resultado: 'abandono'; seat: number; eventos: Evento[] }
  | { ok: false; error: string }

// Si se vencio el tiempo de una persona: la primera vez juega el bot por ella; al llegar al limite
// de vencimientos seguidos, abandona y gana el equipo rival. Si todavia no se vencio, no hace nada.
export function resolverVencimiento(
  s: SalaEstado,
  ahora: number,
  rng: () => number = Math.random,
): ResultadoVencimiento {
  const limite = vencimiento(s)
  if (limite === null || ahora < limite) return { ok: false, error: 'no hay jugada vencida' }
  const seat = asientoQueMueve(s)!
  s.ausencias[seat] = (s.ausencias[seat] ?? 0) + 1

  if (s.ausencias[seat]! >= AUSENCIAS_PARA_ABANDONO) {
    const ganador = equipoDe(seat) === 0 ? 1 : 0
    s.partida!.ganadorPartida = ganador
    s.fase = 'fin'
    s.motivoFin = 'abandono'
    s.abandono = seat
    s.turnoDesde = null
    s.actualizada = ahora
    return { ok: true, resultado: 'abandono', seat, eventos: [{ tipo: 'fin_partida', ganador }] }
  }

  const accion = decidir(vista(s.partida!, seat))
  const r = aplicarEn(s, seat, accion, ahora, rng)
  return r.ok ? { ok: true, resultado: 'autojugada', seat, eventos: r.eventos } : r
}

export function moverBot(
  s: SalaEstado,
  ahora: number,
  rng: () => number = Math.random,
): Res<{ seat: number; eventos: Evento[] }> {
  const seat = botPendiente(s)
  if (seat === null) return { ok: false, error: 'no le toca a ningun bot' }
  const accion = decidir(vista(s.partida!, seat))
  const r = aplicarEn(s, seat, accion, ahora, rng)
  return r.ok ? { ok: true, seat, eventos: r.eventos } : r
}

// ---------- lo que sale del servidor ----------

export interface AsientoPublico {
  alias: string
  bot: boolean
  equipo: 0 | 1
}

export interface MensajeEstado {
  t: 'estado'
  codigo: string
  config: Config
  fase: Fase
  yo: number // asiento de quien recibe el mensaje
  esAnfitrion: boolean
  asientos: (AsientoPublico | null)[]
  vista: Vista | null
  pvp: boolean | null
  mueve: number | null // asiento que tiene el reloj
  restanteMs: number | null // tiempo que le queda a quien mueve (null si es un bot o no hay partida)
  ausencias: number // vencimientos seguidos de quien recibe el mensaje
  motivoFin: MotivoFin | null
  abandono: number | null
}

// Lo que recibe UN celular. No incluye tokens ni la partida completa: solo su vista.
export function mensajePara(s: SalaEstado, token: string, ahora: number = Date.now()): MensajeEstado | null {
  const yo = asientoDeToken(s, token)
  if (yo < 0) return null
  return {
    t: 'estado',
    codigo: s.codigo,
    config: s.config,
    fase: s.fase,
    yo,
    esAnfitrion: yo === 0,
    asientos: s.asientos.map((a, i) => (a ? { alias: a.alias, bot: a.bot, equipo: equipoDe(i) } : null)),
    vista: s.partida ? vista(s.partida, yo) : null,
    pvp: s.pvp,
    mueve: asientoQueMueve(s),
    restanteMs: vencimiento(s) === null ? null : Math.max(0, vencimiento(s)! - ahora),
    ausencias: s.ausencias[yo] ?? 0,
    motivoFin: s.motivoFin,
    abandono: s.abandono,
  }
}

export interface ResumenSala {
  codigo: string
  fase: Fase
  config: Config
  jugadores: string[]
  libres: number
  puntos: [number, number] | null
  pvp: boolean | null
  actualizada: number
}

// Lo que se muestra en la pantalla del local: sin tokens ni cartas.
export function resumenPublico(s: SalaEstado): ResumenSala {
  return {
    codigo: s.codigo,
    fase: s.fase,
    config: s.config,
    jugadores: s.asientos.filter((a): a is Asiento => a !== null).map((a) => a.alias),
    libres: s.asientos.filter((a) => a === null).length,
    puntos: s.partida ? [s.partida.puntos[0], s.partida.puntos[1]] : null,
    pvp: s.pvp,
    actualizada: s.actualizada,
  }
}

// Completa los campos nuevos en salas guardadas antes de que existieran (por ejemplo, tras actualizar el codigo).
export function normalizar(s: SalaEstado): SalaEstado {
  s.limiteMs ??= LIMITE_JUGADA_MS
  s.turnoDesde ??= s.fase === 'jugando' ? s.actualizada : null
  s.ausencias ??= Array.from({ length: s.config.jugadores }, () => 0)
  s.motivoFin ??= s.fase === 'fin' ? 'puntos' : null
  s.abandono ??= null
  return s
}
