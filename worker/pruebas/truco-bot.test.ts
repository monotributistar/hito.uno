import { test } from 'vitest'
import { assert } from './aserciones'
import { decidir } from '../truco/bot'
import { accionesLegales, aplicar, crearPartida, vista } from '../truco/motor'
import type { Accion, Config, Estado } from '../truco/motor'

function semilla(s: number): () => number {
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Jugador = 'bot' | 'azar'

// Juega una partida completa. `jugadores[seat]` dice quien mueve cada asiento.
// Devuelve el equipo ganador. Si el bot devuelve una accion ilegal, el motor la rechaza y la prueba falla.
function jugar(config: Config, jugadores: Jugador[], rng: () => number): 0 | 1 {
  let e: Estado = crearPartida(config, { rng })
  let pasos = 0
  while (e.ganadorPartida === null) {
    assert.ok(++pasos < 5000, 'la partida no termina')
    const seat = Array.from({ length: config.jugadores }, (_, s) => s).find(
      (s) => accionesLegales(e, s).length > 0,
    )
    assert.ok(seat !== undefined, 'partida trabada')
    let accion: Accion
    if (jugadores[seat] === 'bot') {
      accion = decidir(vista(e, seat))
    } else {
      const legales = accionesLegales(e, seat)
      accion = legales[Math.floor(rng() * legales.length)]!
    }
    const r = aplicar(e, seat, accion, { rng })
    assert.ok(r.ok, r.ok ? '' : `el ${jugadores[seat]} jugo algo ilegal: ${r.error}`)
    e = r.estado
  }
  return e.ganadorPartida
}

const TIEMPO_SIMULACION = 60_000 // las simulaciones son lentas: vitest da 5 s por defecto

test(
  'el bot siempre juega acciones legales, en las cuatro configuraciones',
  () => {
    const configs: Config[] = [
      { jugadores: 2, puntos: 15 },
      { jugadores: 2, puntos: 30 },
      { jugadores: 4, puntos: 15 },
      { jugadores: 4, puntos: 30 },
    ]
    for (const config of configs) {
      for (let i = 0; i < 10; i++) {
        jugar(config, Array(config.jugadores).fill('bot'), semilla(i + 100))
      }
    }
  },
  TIEMPO_SIMULACION,
)

test(
  'el bot le gana al azar bastante mas que la mitad, pero no es imbatible (1 contra 1)',
  () => {
    const config: Config = { jugadores: 2, puntos: 15 }
    const total = 200
    let victorias = 0
    for (let i = 0; i < total; i++) {
      // Se alterna el asiento del bot para que ser mano no sesgue el resultado.
      const botSeat = i % 2
      const jugadores: Jugador[] = botSeat === 0 ? ['bot', 'azar'] : ['azar', 'bot']
      if (jugar(config, jugadores, semilla(i + 1)) === botSeat) victorias++
    }
    const porcentaje = (victorias / total) * 100
    assert.ok(porcentaje >= 70, `el bot solo gano ${porcentaje.toFixed(1)}% (${victorias}/${total})`)
    // Un bot que gana el 100% aburre: el azar tiene que ganar al menos una.
    assert.ok(victorias < total, 'el bot nunca perdio')
  },
  TIEMPO_SIMULACION,
)

test('el bot sin acciones legales falla de forma explicita', () => {
  const e = crearPartida({ jugadores: 2, puntos: 15 }, { rng: semilla(5) })
  const sinTurno = vista(e, 1) // seat 1 no tiene el turno
  assert.throws(() => decidir(sinTurno), /acciones legales/)
})
