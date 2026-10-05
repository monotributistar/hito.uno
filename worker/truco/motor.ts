// Motor de reglas del truco argentino SIN flor, para 2 jugadores (1 contra 1) o 4 (parejas).
//
// Es logica pura: no toca red, ni tiempo, ni almacenamiento. El estado es serializable a JSON
// (para guardarlo en un Durable Object) y cada accion devuelve un estado nuevo.
// El servidor es el unico que ve todas las cartas: usar `vista()` para lo que se manda a cada celular.
//
// Simplificaciones declaradas (v1):
// - El envido se revela solo: al aceptarse se comparan los tantos sin que cada jugador "cante" el suyo.
// - No se puede irse al mazo mientras haya un canto sin responder.
// - Falta envido: vale lo que le falta al que va ganando para terminar la partida.
// - En parejas responde el rival que esta a la izquierda de quien canto (no cualquiera del equipo).
// - En parejas el tanto de envido del equipo es el mejor de sus integrantes.

import { barajar, crearMazo, fuerza, mismaCarta, tantoEnvido } from './cartas'
import type { Carta } from './cartas'

export type Equipo = 0 | 1
export type CantoEnvido = 'envido' | 'real_envido' | 'falta_envido'

export interface Config {
  jugadores: 2 | 4
  puntos: 15 | 30
}

export type Accion =
  | { tipo: 'jugar_carta'; carta: Carta }
  | { tipo: 'cantar_truco' } // sube al nivel siguiente: truco, retruco, vale cuatro
  | { tipo: 'cantar_envido'; canto: CantoEnvido }
  | { tipo: 'quiero' }
  | { tipo: 'no_quiero' }
  | { tipo: 'mazo' }

export interface Jugada {
  seat: number
  carta: Carta
}

export interface Baza {
  jugadas: Jugada[]
  ganador: Equipo | 'parda' | null // null mientras esta en curso
}

export interface EstadoMano {
  manos: Carta[][] // las tres cartas repartidas a cada asiento (el envido usa estas)
  restantes: Carta[][] // las que todavia no se jugaron
  bazas: Baza[] // la ultima es la que esta en curso
  lider: number // asiento que abre la baza en curso
  truco: { nivel: 0 | 1 | 2 | 3; aceptado: boolean; cantor: number | null }
  envido: { cantos: CantoEnvido[]; cantor: number | null; estado: 'sin_cantar' | 'pendiente' | 'resuelto' }
}

export interface Estado {
  config: Config
  puntos: [number, number]
  mano: number // asiento que es mano en la mano actual
  numeroMano: number
  actual: EstadoMano
  ganadorPartida: Equipo | null
}

export type Evento =
  | { tipo: 'reparto'; mano: number }
  | { tipo: 'carta'; seat: number; carta: Carta }
  | { tipo: 'baza'; ganador: Equipo | 'parda' }
  | { tipo: 'canto_truco'; seat: number; nivel: 1 | 2 | 3 }
  | { tipo: 'canto_envido'; seat: number; canto: CantoEnvido }
  | { tipo: 'quiero'; seat: number }
  | { tipo: 'no_quiero'; seat: number }
  | { tipo: 'mazo'; seat: number }
  | { tipo: 'envido_resuelto'; ganador: Equipo; tantos: number[]; puntos: number }
  | { tipo: 'puntos'; equipo: Equipo; puntos: number; motivo: string }
  | { tipo: 'fin_partida'; ganador: Equipo }

export type Resultado = { ok: true; estado: Estado; eventos: Evento[] } | { ok: false; error: string }

export interface Opciones {
  rng?: () => number
}

const VALOR_CANTO: Record<CantoEnvido, number> = { envido: 2, real_envido: 3, falta_envido: 0 }

export const equipoDe = (seat: number): Equipo => (seat % 2) as Equipo

// ---------- creacion ----------

function repartir(config: Config, rng: () => number): Carta[][] {
  const mazo = barajar(crearMazo(), rng)
  const manos: Carta[][] = []
  for (let s = 0; s < config.jugadores; s++) manos.push(mazo.slice(s * 3, s * 3 + 3))
  return manos
}

function manoNueva(manos: Carta[][], mano: number): EstadoMano {
  return {
    manos: manos.map((m) => m.slice()),
    restantes: manos.map((m) => m.slice()),
    bazas: [{ jugadas: [], ganador: null }],
    lider: mano,
    truco: { nivel: 0, aceptado: false, cantor: null },
    envido: { cantos: [], cantor: null, estado: 'sin_cantar' },
  }
}

export function validarConfig(config: Config): void {
  if (config.jugadores !== 2 && config.jugadores !== 4) throw new Error('jugadores debe ser 2 o 4')
  if (config.puntos !== 15 && config.puntos !== 30) throw new Error('puntos debe ser 15 o 30')
}

export function crearPartida(config: Config, opciones: Opciones = {}): Estado {
  validarConfig(config)
  const rng = opciones.rng ?? Math.random
  return {
    config,
    puntos: [0, 0],
    mano: 0,
    numeroMano: 1,
    actual: manoNueva(repartir(config, rng), 0),
    ganadorPartida: null,
  }
}

// Para pruebas y reproducciones: partida con cartas dadas.
export function crearPartidaConManos(
  config: Config,
  manos: Carta[][],
  mano = 0,
  puntos: [number, number] = [0, 0],
): Estado {
  validarConfig(config)
  if (manos.length !== config.jugadores) throw new Error('cantidad de manos incorrecta')
  return { config, puntos, mano, numeroMano: 1, actual: manoNueva(manos, mano), ganadorPartida: null }
}

// ---------- consultas ----------

export function turno(e: Estado): number {
  const baza = e.actual.bazas[e.actual.bazas.length - 1]!
  return (e.actual.lider + baza.jugadas.length) % e.config.jugadores
}

// Asiento que debe responder un canto pendiente (envido tiene prioridad sobre truco), o null.
export function quienResponde(e: Estado): number | null {
  const m = e.actual
  const n = e.config.jugadores
  if (m.envido.estado === 'pendiente') return (m.envido.cantor! + 1) % n
  if (m.truco.nivel > 0 && !m.truco.aceptado) return (m.truco.cantor! + 1) % n
  return null
}

function cantosEnvidoPosibles(cantos: readonly CantoEnvido[]): CantoEnvido[] {
  if (cantos.length === 0) return ['envido', 'real_envido', 'falta_envido']
  const ultimo = cantos[cantos.length - 1]!
  if (ultimo === 'falta_envido') return []
  if (ultimo === 'real_envido') return ['falta_envido']
  const envidos = cantos.filter((c) => c === 'envido').length
  return envidos < 2 ? ['envido', 'real_envido', 'falta_envido'] : ['real_envido', 'falta_envido']
}

// Todas las acciones validas para un asiento en este momento (la UI y el bot salen de aca).
export function accionesLegales(e: Estado, seat: number): Accion[] {
  if (e.ganadorPartida !== null) return []
  const m = e.actual
  const acciones: Accion[] = []
  const primeraBaza = m.bazas.length === 1
  const resp = quienResponde(e)

  if (resp !== null) {
    if (seat !== resp) return []
    acciones.push({ tipo: 'quiero' }, { tipo: 'no_quiero' })
    if (m.envido.estado === 'pendiente') {
      for (const canto of cantosEnvidoPosibles(m.envido.cantos))
        acciones.push({ tipo: 'cantar_envido', canto })
    } else {
      // Truco pendiente: se puede subir, o jugar el envido antes ("el envido esta primero").
      if (m.truco.nivel < 3) acciones.push({ tipo: 'cantar_truco' })
      if (primeraBaza && m.envido.estado === 'sin_cantar' && m.truco.nivel === 1) {
        for (const canto of cantosEnvidoPosibles([])) acciones.push({ tipo: 'cantar_envido', canto })
      }
    }
    return acciones
  }

  if (seat !== turno(e)) return []
  for (const carta of m.restantes[seat]!) acciones.push({ tipo: 'jugar_carta', carta })
  acciones.push({ tipo: 'mazo' })
  const puedeSubir = m.truco.nivel === 0 || equipoDe(m.truco.cantor!) !== equipoDe(seat)
  if (m.truco.nivel < 3 && puedeSubir) acciones.push({ tipo: 'cantar_truco' })
  if (primeraBaza && m.envido.estado === 'sin_cantar' && m.truco.nivel === 0) {
    for (const canto of cantosEnvidoPosibles([])) acciones.push({ tipo: 'cantar_envido', canto })
  }
  return acciones
}

function iguales(a: Accion, b: Accion): boolean {
  if (a.tipo !== b.tipo) return false
  if (a.tipo === 'jugar_carta' && b.tipo === 'jugar_carta') return mismaCarta(a.carta, b.carta)
  if (a.tipo === 'cantar_envido' && b.tipo === 'cantar_envido') return a.canto === b.canto
  return true
}

// Puntos en juego si la mano termina ahora (sin canto pendiente): 1 sin truco, 2, 3 o 4 segun el nivel.
function puntosEnJuego(m: EstadoMano): number {
  return m.truco.nivel === 0 ? 1 : m.truco.nivel + 1
}

// ---------- aplicar una accion ----------

export function aplicar(estado: Estado, seat: number, accion: Accion, opciones: Opciones = {}): Resultado {
  if (!Number.isInteger(seat) || seat < 0 || seat >= estado.config.jugadores) {
    return { ok: false, error: 'asiento invalido' }
  }
  if (estado.ganadorPartida !== null) return { ok: false, error: 'la partida ya termino' }
  if (!accionesLegales(estado, seat).some((a) => iguales(a, accion))) {
    return { ok: false, error: 'accion no permitida ahora' }
  }

  const e = structuredClone(estado)
  const eventos: Evento[] = []
  const m = e.actual
  const rng = opciones.rng ?? Math.random

  switch (accion.tipo) {
    case 'jugar_carta': {
      const mano = m.restantes[seat]!
      mano.splice(
        mano.findIndex((c) => mismaCarta(c, accion.carta)),
        1,
      )
      const baza = m.bazas[m.bazas.length - 1]!
      baza.jugadas.push({ seat, carta: accion.carta })
      eventos.push({ tipo: 'carta', seat, carta: accion.carta })
      if (baza.jugadas.length === e.config.jugadores) cerrarBaza(e, eventos, rng)
      break
    }
    case 'cantar_truco': {
      m.truco = { nivel: (m.truco.nivel + 1) as 1 | 2 | 3, aceptado: false, cantor: seat }
      eventos.push({ tipo: 'canto_truco', seat, nivel: m.truco.nivel as 1 | 2 | 3 })
      break
    }
    case 'cantar_envido': {
      m.envido.cantos.push(accion.canto)
      m.envido.cantor = seat
      m.envido.estado = 'pendiente'
      eventos.push({ tipo: 'canto_envido', seat, canto: accion.canto })
      break
    }
    case 'quiero': {
      eventos.push({ tipo: 'quiero', seat })
      if (m.envido.estado === 'pendiente') resolverEnvido(e, eventos)
      else m.truco.aceptado = true
      break
    }
    case 'no_quiero': {
      eventos.push({ tipo: 'no_quiero', seat })
      if (m.envido.estado === 'pendiente') {
        // Rechazar un envido le da al que canto lo ya aceptado (o 1 si fue el primer canto).
        const previos = m.envido.cantos.slice(0, -1)
        const puntos = previos.length === 0 ? 1 : previos.reduce((s, c) => s + VALOR_CANTO[c], 0)
        m.envido.estado = 'resuelto'
        sumarPuntos(e, equipoDe(m.envido.cantor!), puntos, 'envido no querido', eventos)
      } else {
        // Rechazar un truco le da al que canto lo que estaba aceptado antes: 1, 2 o 3.
        const cantor = equipoDe(m.truco.cantor!)
        terminarMano(e, cantor, m.truco.nivel, 'truco no querido', eventos, rng)
      }
      break
    }
    case 'mazo': {
      eventos.push({ tipo: 'mazo', seat })
      const rival: Equipo = equipoDe(seat) === 0 ? 1 : 0
      terminarMano(e, rival, puntosEnJuego(m), 'irse al mazo', eventos, rng)
      break
    }
  }
  return { ok: true, estado: e, eventos }
}

// ---------- piezas internas ----------

function sumarPuntos(e: Estado, equipo: Equipo, puntos: number, motivo: string, eventos: Evento[]): void {
  if (e.ganadorPartida !== null) return
  const total = Math.min(e.puntos[equipo] + puntos, e.config.puntos)
  eventos.push({ tipo: 'puntos', equipo, puntos: total - e.puntos[equipo], motivo })
  e.puntos[equipo] = total
  if (total >= e.config.puntos) {
    e.ganadorPartida = equipo
    eventos.push({ tipo: 'fin_partida', ganador: equipo })
  }
}

function resolverEnvido(e: Estado, eventos: Evento[]): void {
  const m = e.actual
  const n = e.config.jugadores
  // Tanto de cada equipo: el mejor de sus integrantes. En empate gana el equipo del
  // integrante mas cercano a la mano (la mano gana los empates).
  const mejor: [number, number] = [-1, -1]
  const asientoDelMejor: [number, number] = [0, 0]
  const tantos: number[] = []
  for (let paso = 0; paso < n; paso++) {
    const seat = (e.mano + paso) % n
    const tanto = tantoEnvido(m.manos[seat]!)
    tantos[seat] = tanto
    const eq = equipoDe(seat)
    if (tanto > mejor[eq]) {
      mejor[eq] = tanto
      asientoDelMejor[eq] = paso
    }
  }
  let ganador: Equipo
  if (mejor[0] !== mejor[1]) ganador = mejor[0] > mejor[1] ? 0 : 1
  else ganador = asientoDelMejor[0] <= asientoDelMejor[1] ? 0 : 1

  let puntos: number
  if (m.envido.cantos.includes('falta_envido')) {
    // Lo que le falta al que va ganando para terminar la partida.
    puntos = e.config.puntos - Math.max(e.puntos[0], e.puntos[1])
  } else {
    puntos = m.envido.cantos.reduce((s, c) => s + VALOR_CANTO[c], 0)
  }
  m.envido.estado = 'resuelto'
  eventos.push({ tipo: 'envido_resuelto', ganador, tantos, puntos })
  sumarPuntos(e, ganador, puntos, 'envido', eventos)
}

// Ganador de una baza: se compara la mejor carta de cada equipo. Igualdad = parda.
function cerrarBaza(e: Estado, eventos: Evento[], rng: () => number): void {
  const m = e.actual
  const baza = m.bazas[m.bazas.length - 1]!
  const mejorPorEquipo: [number, number] = [-1, -1]
  let mejorJugada: Jugada | null = null
  for (const j of baza.jugadas) {
    const f = fuerza(j.carta)
    const eq = equipoDe(j.seat)
    if (f > mejorPorEquipo[eq]) mejorPorEquipo[eq] = f
    if (mejorJugada === null || f > fuerza(mejorJugada.carta)) mejorJugada = j
  }
  if (mejorPorEquipo[0] === mejorPorEquipo[1]) {
    baza.ganador = 'parda'
    m.lider = e.mano // en parda abre la mano
  } else {
    baza.ganador = mejorPorEquipo[0] > mejorPorEquipo[1] ? 0 : 1
    m.lider = mejorJugada!.seat
  }
  eventos.push({ tipo: 'baza', ganador: baza.ganador })

  const ganadorMano = decidirMano(
    m.bazas.map((b) => b.ganador as Equipo | 'parda'),
    equipoDe(e.mano),
  )
  if (ganadorMano !== null) {
    terminarMano(e, ganadorMano, puntosEnJuego(m), 'mano ganada', eventos, rng)
  } else {
    m.bazas.push({ jugadas: [], ganador: null })
  }
}

// Quien gana la mano segun las bazas jugadas hasta ahora (null si todavia no esta definida).
export function decidirMano(bazas: readonly (Equipo | 'parda')[], equipoMano: Equipo): Equipo | null {
  const [b1, b2, b3] = bazas
  if (b1 === undefined || b2 === undefined) return null
  if (b1 !== 'parda' && b1 === b2) return b1 // gano las dos primeras
  if (b1 === 'parda' && b2 !== 'parda') return b2 // primera parda: define la segunda
  if (b1 !== 'parda' && b2 === 'parda') return b1 // segunda parda: vale la primera
  if (b3 === undefined) return null // 1-1, o parda y parda: hay tercera
  if (b3 !== 'parda') return b3
  return b1 !== 'parda' ? b1 : equipoMano // tercera parda: la primera, o la mano si todo fue parda
}

function terminarMano(
  e: Estado,
  ganador: Equipo,
  puntos: number,
  motivo: string,
  eventos: Evento[],
  rng: () => number,
): void {
  sumarPuntos(e, ganador, puntos, motivo, eventos)
  if (e.ganadorPartida !== null) return
  e.mano = (e.mano + 1) % e.config.jugadores
  e.numeroMano += 1
  e.actual = manoNueva(repartir(e.config, rng), e.mano)
  eventos.push({ tipo: 'reparto', mano: e.mano })
}

// ---------- lo que ve cada celular ----------

export interface Vista {
  config: Config
  yo: number
  puntos: [number, number]
  mano: number
  turno: number
  responde: number | null
  misCartas: Carta[]
  cartasRestantesPorAsiento: number[] // cantidad, nunca el contenido
  bazas: Baza[]
  truco: EstadoMano['truco']
  envido: EstadoMano['envido']
  acciones: Accion[]
  ganadorPartida: Equipo | null
}

// Proyeccion para UN asiento. Nunca incluye las cartas sin jugar de los demas
// ni sus tantos de envido: esa informacion no sale del servidor.
export function vista(e: Estado, seat: number): Vista {
  const m = e.actual
  return {
    config: e.config,
    yo: seat,
    puntos: [e.puntos[0], e.puntos[1]],
    mano: e.mano,
    turno: turno(e),
    responde: quienResponde(e),
    misCartas: structuredClone(m.restantes[seat]!),
    cartasRestantesPorAsiento: m.restantes.map((r) => r.length),
    bazas: structuredClone(m.bazas),
    truco: { ...m.truco },
    envido: { cantos: m.envido.cantos.slice(), cantor: m.envido.cantor, estado: m.envido.estado },
    acciones: accionesLegales(e, seat),
    ganadorPartida: e.ganadorPartida,
  }
}
