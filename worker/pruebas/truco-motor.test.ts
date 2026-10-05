import { test } from 'vitest'
import { assert } from './aserciones'
import { crearMazo, fuerza, tantoEnvido } from '../truco/cartas'
import type { Carta, Numero, Palo } from '../truco/cartas'
import {
  accionesLegales,
  aplicar,
  crearPartida,
  crearPartidaConManos,
  decidirMano,
  quienResponde,
  turno,
  vista,
} from '../truco/motor'
import type { Accion, Estado } from '../truco/motor'

const c = (palo: Palo, numero: Numero): Carta => ({ palo, numero })

// Generador pseudoaleatorio con semilla, para que las pruebas con azar sean reproducibles.
function semilla(s: number): () => number {
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Aplica una accion y falla la prueba si el motor la rechaza.
function hacer(e: Estado, seat: number, a: Accion): Estado {
  const r = aplicar(e, seat, a, { rng: semilla(1) })
  assert.ok(r.ok, r.ok ? '' : `rechazada: ${r.error}`)
  return r.estado
}

const dosJugadores = { jugadores: 2, puntos: 15 } as const

// ---------- cartas ----------

test('el mazo tiene 40 cartas distintas', () => {
  const mazo = crearMazo()
  assert.equal(mazo.length, 40)
  assert.equal(new Set(mazo.map((x) => `${x.palo}${x.numero}`)).size, 40)
})

test('jerarquia del truco, de mayor a menor', () => {
  const orden: Carta[] = [
    c('espada', 1),
    c('basto', 1),
    c('espada', 7),
    c('oro', 7),
    c('copa', 3),
    c('copa', 2),
    c('copa', 1),
    c('basto', 12),
    c('oro', 11),
    c('copa', 10),
    c('copa', 7),
    c('oro', 6),
    c('basto', 5),
    c('espada', 4),
  ]
  for (let i = 0; i < orden.length - 1; i++) {
    assert.ok(fuerza(orden[i]!) > fuerza(orden[i + 1]!), `${i} deberia ganarle a ${i + 1}`)
  }
  assert.equal(fuerza(c('oro', 1)), fuerza(c('copa', 1)), 'los anchos falsos empatan')
  assert.equal(fuerza(c('copa', 7)), fuerza(c('basto', 7)), 'los sietes falsos empatan')
  assert.equal(fuerza(c('oro', 3)), fuerza(c('espada', 3)))
})

test('tanto de envido', () => {
  assert.equal(tantoEnvido([c('espada', 7), c('espada', 6), c('oro', 1)]), 33)
  assert.equal(tantoEnvido([c('copa', 12), c('oro', 11), c('basto', 10)]), 0, 'solo figuras')
  assert.equal(tantoEnvido([c('oro', 5), c('oro', 12), c('copa', 3)]), 25, 'figura suma cero')
  assert.equal(tantoEnvido([c('espada', 1), c('oro', 7), c('copa', 6)]), 7, 'sin pareja vale la mas alta')
  assert.equal(tantoEnvido([c('espada', 7), c('espada', 6), c('espada', 5)]), 33, 'elige la mejor pareja')
  assert.equal(tantoEnvido([c('oro', 12), c('oro', 11), c('copa', 2)]), 20, 'dos figuras del mismo palo')
})

// ---------- quien gana la mano ----------

test('decision de la mano segun las bazas', () => {
  assert.equal(decidirMano([0], 0), null)
  assert.equal(decidirMano([0, 0], 1), 0)
  assert.equal(decidirMano([1, 1], 0), 1)
  assert.equal(decidirMano([0, 1], 0), null)
  assert.equal(decidirMano([0, 1, 1], 0), 1)
  assert.equal(decidirMano([0, 1, 0], 1), 0)
  assert.equal(decidirMano(['parda', 1], 0), 1, 'primera parda: define la segunda')
  assert.equal(decidirMano([0, 'parda'], 1), 0, 'segunda parda: vale la primera')
  assert.equal(decidirMano([0, 1, 'parda'], 1), 0, 'tercera parda: vale la primera')
  assert.equal(decidirMano(['parda', 'parda'], 1), null)
  assert.equal(decidirMano(['parda', 'parda', 0], 1), 0)
  assert.equal(decidirMano(['parda', 'parda', 'parda'], 1), 1, 'todo parda: gana la mano')
})

// ---------- una mano completa, 1 contra 1 ----------

// Seat 0 (mano) tiene las mejores cartas; seat 1 las peores.
const manosFuertes = (): Carta[][] => [
  [c('espada', 1), c('basto', 1), c('espada', 7)],
  [c('copa', 4), c('oro', 5), c('copa', 6)],
]

test('mano ganada 2 a 0: un punto, rota la mano y se reparte de nuevo', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('espada', 1) })
  e = hacer(e, 1, { tipo: 'jugar_carta', carta: c('copa', 4) })
  assert.equal(turno(e), 0, 'el que gana la baza abre la siguiente')
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('basto', 1) })
  e = hacer(e, 1, { tipo: 'jugar_carta', carta: c('oro', 5) })
  assert.deepEqual(e.puntos, [1, 0])
  assert.equal(e.mano, 1)
  assert.equal(e.numeroMano, 2)
  assert.equal(e.actual.restantes[0]!.length, 3)
  assert.equal(e.actual.restantes[1]!.length, 3)
})

test('el que gana la baza abre la siguiente, aunque no sea la mano', () => {
  const manos = [
    [c('copa', 4), c('oro', 1), c('copa', 6)],
    [c('espada', 1), c('oro', 5), c('copa', 5)],
  ]
  let e = crearPartidaConManos(dosJugadores, manos, 0)
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('copa', 4) })
  e = hacer(e, 1, { tipo: 'jugar_carta', carta: c('espada', 1) })
  assert.equal(turno(e), 1)
})

test('parda en la primera: abre la mano y define la segunda', () => {
  const manos = [
    [c('copa', 3), c('oro', 1), c('copa', 6)],
    [c('oro', 3), c('copa', 4), c('copa', 5)],
  ]
  let e = crearPartidaConManos(dosJugadores, manos, 0)
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('copa', 3) })
  e = hacer(e, 1, { tipo: 'jugar_carta', carta: c('oro', 3) })
  assert.equal(e.actual.bazas[0]!.ganador, 'parda')
  assert.equal(turno(e), 0, 'abre la mano')
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('oro', 1) })
  e = hacer(e, 1, { tipo: 'jugar_carta', carta: c('copa', 4) })
  assert.deepEqual(e.puntos, [1, 0])
})

// ---------- truco ----------

test('truco querido vale 2; retruco y vale cuatro suben de a uno', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  assert.equal(quienResponde(e), 1)
  e = hacer(e, 1, { tipo: 'cantar_truco' }) // quiero y subo: retruco
  assert.equal(e.actual.truco.nivel, 2)
  assert.equal(quienResponde(e), 0)
  e = hacer(e, 0, { tipo: 'cantar_truco' }) // vale cuatro
  assert.equal(e.actual.truco.nivel, 3)
  e = hacer(e, 1, { tipo: 'quiero' })
  assert.equal(e.actual.truco.aceptado, true)
  assert.ok(!accionesLegales(e, 0).some((a) => a.tipo === 'cantar_truco'), 'ya no hay mas para subir')
  // Seat 0 gana las dos bazas: 4 puntos.
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('espada', 1) })
  e = hacer(e, 1, { tipo: 'jugar_carta', carta: c('copa', 4) })
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('basto', 1) })
  e = hacer(e, 1, { tipo: 'jugar_carta', carta: c('oro', 5) })
  assert.deepEqual(e.puntos, [4, 0])
})

test('truco no querido: 1 punto; retruco no querido: 2; vale cuatro no querido: 3', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  e = hacer(e, 1, { tipo: 'no_quiero' })
  assert.deepEqual(e.puntos, [1, 0])

  e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  e = hacer(e, 1, { tipo: 'cantar_truco' })
  e = hacer(e, 0, { tipo: 'no_quiero' })
  assert.deepEqual(e.puntos, [0, 2])

  e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  e = hacer(e, 1, { tipo: 'cantar_truco' })
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  e = hacer(e, 1, { tipo: 'no_quiero' })
  assert.deepEqual(e.puntos, [3, 0])
})

test('solo puede subir el truco el equipo que no canto el ultimo', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  e = hacer(e, 1, { tipo: 'quiero' })
  // Seat 0 juega y le toca a seat 1, que si puede subir; seat 0 no.
  assert.ok(!accionesLegales(e, 0).some((a) => a.tipo === 'cantar_truco'))
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('espada', 1) })
  assert.ok(accionesLegales(e, 1).some((a) => a.tipo === 'cantar_truco'))
})

test('irse al mazo da lo que estaba en juego', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'mazo' })
  assert.deepEqual(e.puntos, [0, 1])

  e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  e = hacer(e, 1, { tipo: 'quiero' })
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('espada', 1) })
  e = hacer(e, 1, { tipo: 'mazo' })
  assert.deepEqual(e.puntos, [2, 0], 'truco aceptado vale 2')
})

test('no se puede irse al mazo con un canto sin responder', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  assert.ok(!accionesLegales(e, 1).some((a) => a.tipo === 'mazo'))
  assert.equal(aplicar(e, 1, { tipo: 'mazo' }).ok, false)
})

// ---------- envido ----------

test('envido querido: gana el mayor tanto y se lleva 2', () => {
  const manos = [
    [c('espada', 7), c('espada', 6), c('oro', 1)], // 33
    [c('copa', 7), c('copa', 4), c('basto', 4)], // 31
  ]
  let e = crearPartidaConManos(dosJugadores, manos, 0)
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'envido' })
  e = hacer(e, 1, { tipo: 'quiero' })
  assert.deepEqual(e.puntos, [2, 0])
  assert.equal(e.actual.envido.estado, 'resuelto')
  assert.ok(!accionesLegales(e, 0).some((a) => a.tipo === 'cantar_envido'), 'el envido se juega una sola vez')
})

test('envido, envido, real envido: se suman 7', () => {
  const manos = [
    [c('copa', 12), c('oro', 11), c('basto', 10)], // 0
    [c('copa', 7), c('copa', 6), c('basto', 4)], // 33
  ]
  let e = crearPartidaConManos(dosJugadores, manos, 0)
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'envido' })
  e = hacer(e, 1, { tipo: 'cantar_envido', canto: 'envido' })
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'real_envido' })
  e = hacer(e, 1, { tipo: 'quiero' })
  assert.deepEqual(e.puntos, [0, 7])
})

test('envido no querido: 1 punto si fue el primer canto, o lo aceptado antes', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'envido' })
  e = hacer(e, 1, { tipo: 'no_quiero' })
  assert.deepEqual(e.puntos, [1, 0])

  e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'envido' })
  e = hacer(e, 1, { tipo: 'cantar_envido', canto: 'envido' })
  e = hacer(e, 0, { tipo: 'no_quiero' })
  assert.deepEqual(e.puntos, [0, 2], 'se lleva el primer envido')

  e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'envido' })
  e = hacer(e, 1, { tipo: 'cantar_envido', canto: 'real_envido' })
  e = hacer(e, 0, { tipo: 'no_quiero' })
  assert.deepEqual(e.puntos, [0, 2])
})

test('no se puede repetir envido tres veces ni volver atras tras real envido', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'real_envido' })
  const opciones = accionesLegales(e, 1).filter((a) => a.tipo === 'cantar_envido')
  assert.deepEqual(opciones, [{ tipo: 'cantar_envido', canto: 'falta_envido' }])

  e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'envido' })
  e = hacer(e, 1, { tipo: 'cantar_envido', canto: 'envido' })
  const tras = accionesLegales(e, 0)
    .filter((a) => a.tipo === 'cantar_envido')
    .map((a) => (a as { canto: string }).canto)
  assert.deepEqual(tras, ['real_envido', 'falta_envido'])
})

test('empate de envido lo gana la mano', () => {
  const manos = [
    [c('espada', 7), c('espada', 6), c('oro', 1)], // 33
    [c('copa', 7), c('copa', 6), c('basto', 4)], // 33
  ]
  let e = crearPartidaConManos(dosJugadores, manos, 1) // mano = seat 1
  // Con mano = 1, abre seat 1; el envido lo canta quien tiene el turno.
  e = hacer(e, 1, { tipo: 'cantar_envido', canto: 'envido' })
  e = hacer(e, 0, { tipo: 'quiero' })
  assert.deepEqual(e.puntos, [0, 2])
})

test('falta envido: lo que le falta al que va ganando', () => {
  const manos = [
    [c('copa', 12), c('oro', 11), c('basto', 10)], // 0
    [c('copa', 7), c('copa', 6), c('basto', 4)], // 33
  ]
  let e = crearPartidaConManos(dosJugadores, manos, 0, [9, 4])
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'falta_envido' })
  e = hacer(e, 1, { tipo: 'quiero' })
  // Va ganando seat 0 con 9: le faltan 6 para 15. Gana seat 1 y se lleva 6.
  assert.deepEqual(e.puntos, [9, 10])
})

test('el envido solo se canta en la primera baza', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('espada', 1) })
  assert.ok(
    accionesLegales(e, 1).some((a) => a.tipo === 'cantar_envido'),
    'el pie todavia puede',
  )
  e = hacer(e, 1, { tipo: 'jugar_carta', carta: c('copa', 4) })
  assert.ok(!accionesLegales(e, 0).some((a) => a.tipo === 'cantar_envido'))
  assert.equal(aplicar(e, 0, { tipo: 'cantar_envido', canto: 'envido' }).ok, false)
})

test('despues de aceptado el truco ya no hay envido', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  e = hacer(e, 1, { tipo: 'quiero' })
  assert.ok(!accionesLegales(e, 0).some((a) => a.tipo === 'cantar_envido'))
})

test('el envido esta primero: se juega antes de contestar el truco', () => {
  const manos = [
    [c('copa', 12), c('oro', 11), c('basto', 10)], // 0
    [c('copa', 7), c('copa', 6), c('basto', 4)], // 33
  ]
  let e = crearPartidaConManos(dosJugadores, manos, 0)
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  assert.ok(accionesLegales(e, 1).some((a) => a.tipo === 'cantar_envido'))
  e = hacer(e, 1, { tipo: 'cantar_envido', canto: 'envido' })
  assert.equal(quienResponde(e), 0, 'ahora responde el envido')
  e = hacer(e, 0, { tipo: 'quiero' })
  assert.deepEqual(e.puntos, [0, 2])
  assert.equal(quienResponde(e), 1, 'vuelve a quedar pendiente el truco')
  e = hacer(e, 1, { tipo: 'quiero' })
  assert.equal(e.actual.truco.aceptado, true)
})

// ---------- validaciones ----------

test('acciones fuera de turno o con cartas ajenas se rechazan', () => {
  const e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  assert.equal(aplicar(e, 1, { tipo: 'jugar_carta', carta: c('copa', 4) }).ok, false, 'no es su turno')
  assert.equal(aplicar(e, 0, { tipo: 'jugar_carta', carta: c('copa', 4) }).ok, false, 'esa carta no es suya')
  assert.equal(aplicar(e, 5, { tipo: 'mazo' }).ok, false, 'asiento inexistente')
  assert.equal(aplicar(e, -1, { tipo: 'mazo' }).ok, false)
  assert.equal(aplicar(e, 0, { tipo: 'quiero' }).ok, false, 'no hay nada que querer')
})

test('no se puede mutar el estado original', () => {
  const e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  const antes = JSON.stringify(e)
  hacer(e, 0, { tipo: 'jugar_carta', carta: c('espada', 1) })
  assert.equal(JSON.stringify(e), antes)
})

test('configuracion invalida', () => {
  assert.throws(() => crearPartida({ jugadores: 3 as never, puntos: 15 }))
  assert.throws(() => crearPartida({ jugadores: 2, puntos: 20 as never }))
})

test('llegar a los puntos termina la partida y no admite mas acciones', () => {
  let e = crearPartidaConManos({ jugadores: 2, puntos: 15 }, manosFuertes(), 0, [14, 0])
  e = hacer(e, 0, { tipo: 'cantar_truco' })
  e = hacer(e, 1, { tipo: 'no_quiero' })
  assert.equal(e.ganadorPartida, 0)
  assert.equal(e.puntos[0], 15)
  assert.deepEqual(accionesLegales(e, 0), [])
  assert.equal(aplicar(e, 0, { tipo: 'mazo' }).ok, false)
})

test('los puntos no pasan del objetivo', () => {
  const manos = [
    [c('copa', 12), c('oro', 11), c('basto', 10)],
    [c('copa', 7), c('copa', 6), c('basto', 4)],
  ]
  let e = crearPartidaConManos({ jugadores: 2, puntos: 15 }, manos, 0, [0, 13])
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'real_envido' })
  e = hacer(e, 1, { tipo: 'quiero' })
  assert.equal(e.puntos[1], 15)
  assert.equal(e.ganadorPartida, 1)
})

// ---------- privacidad ----------

test('la vista de un asiento no contiene las cartas ni el envido de los demas', () => {
  let e = crearPartidaConManos(dosJugadores, manosFuertes(), 0)
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'envido' })
  e = hacer(e, 1, { tipo: 'quiero' })
  const v0 = JSON.stringify(vista(e, 0))
  const v1 = JSON.stringify(vista(e, 1))
  for (const carta of manosFuertes()[1]!)
    assert.ok(!v0.includes(JSON.stringify(carta)), 'seat 0 ve cartas de seat 1')
  for (const carta of manosFuertes()[0]!)
    assert.ok(!v1.includes(JSON.stringify(carta)), 'seat 1 ve cartas de seat 0')
  assert.ok(!v0.includes('"manos"') && !v0.includes('"restantes"'), 'no se filtra el estado interno')
  assert.deepEqual(vista(e, 0).cartasRestantesPorAsiento, [3, 3])
})

// ---------- parejas ----------

test('parejas: orden de juego, equipos y envido del equipo', () => {
  const manos = [
    [c('copa', 12), c('oro', 11), c('basto', 10)], // equipo 0: 0
    [c('espada', 1), c('espada', 7), c('copa', 4)], // equipo 1: 28
    [c('oro', 7), c('oro', 6), c('copa', 5)], // equipo 0: 33
    [c('basto', 3), c('copa', 2), c('oro', 4)], // equipo 1: 4
  ]
  let e = crearPartidaConManos({ jugadores: 4, puntos: 30 }, manos, 0)
  assert.equal(turno(e), 0)
  e = hacer(e, 0, { tipo: 'cantar_envido', canto: 'envido' })
  assert.equal(quienResponde(e), 1)
  e = hacer(e, 1, { tipo: 'quiero' })
  assert.deepEqual(e.puntos, [2, 0], 'el equipo 0 gana con el 33 del asiento 2')
  e = hacer(e, 0, { tipo: 'jugar_carta', carta: c('copa', 12) })
  assert.equal(turno(e), 1)
  e = hacer(e, 1, { tipo: 'jugar_carta', carta: c('espada', 1) })
  e = hacer(e, 2, { tipo: 'jugar_carta', carta: c('oro', 7) })
  e = hacer(e, 3, { tipo: 'jugar_carta', carta: c('basto', 3) })
  assert.equal(e.actual.bazas[0]!.ganador, 1, 'el ancho de espada gana para el equipo 1')
  assert.equal(turno(e), 1, 'abre quien gano la baza')
})

// ---------- partidas al azar: el motor nunca se traba ni rompe invariantes ----------

test('partidas completas al azar terminan y conservan las cartas', () => {
  const configs = [
    { jugadores: 2, puntos: 15 },
    { jugadores: 2, puntos: 30 },
    { jugadores: 4, puntos: 15 },
    { jugadores: 4, puntos: 30 },
  ] as const
  for (const config of configs) {
    for (let partida = 0; partida < 40; partida++) {
      const rng = semilla(partida * 31 + config.jugadores * 7 + config.puntos)
      let e = crearPartida(config, { rng })
      let pasos = 0
      while (e.ganadorPartida === null) {
        assert.ok(++pasos < 5000, `la partida ${partida} no termina`)
        // Cualquier asiento con acciones legales puede mover; debe haber siempre al menos uno.
        const activos = Array.from({ length: config.jugadores }, (_, s) => s).filter(
          (s) => accionesLegales(e, s).length > 0,
        )
        assert.ok(activos.length >= 1, 'partida trabada sin acciones disponibles')
        const seat = activos[Math.floor(rng() * activos.length)]!
        const opciones = accionesLegales(e, seat)
        // Se sesga hacia jugar cartas para que las partidas avancen y no se llenen de cantos.
        const cartas = opciones.filter((a) => a.tipo === 'jugar_carta')
        const accion =
          cartas.length > 0 && rng() < 0.7
            ? cartas[Math.floor(rng() * cartas.length)]!
            : opciones[Math.floor(rng() * opciones.length)]!
        const r = aplicar(e, seat, accion, { rng })
        assert.ok(r.ok, r.ok ? '' : `una accion legal fue rechazada: ${r.error}`)
        e = r.estado
        assert.ok(e.puntos[0] <= config.puntos && e.puntos[1] <= config.puntos, 'puntos fuera de rango')
        if (e.ganadorPartida === null) {
          const enJuego = e.actual.restantes.reduce((s, m) => s + m.length, 0)
          const jugadas = e.actual.bazas.reduce((s, b) => s + b.jugadas.length, 0)
          assert.equal(enJuego + jugadas, config.jugadores * 3, 'se perdieron o duplicaron cartas')
        }
      }
      assert.ok(e.puntos[e.ganadorPartida] === config.puntos)
    }
  }
}, 60_000)
