import { test } from 'vitest'
import { assert } from './aserciones'
import { accionesLegales } from '../truco/motor'
import {
  asientoQueMueve,
  botPendiente,
  codigoValido,
  crearSala,
  generarCodigo,
  iniciar,
  jugar,
  limpiarAlias,
  mensajePara,
  moverBot,
  resolverVencimiento,
  resumenPublico,
  tokenValido,
  unirse,
  validarConfigSala,
  vencimiento,
} from '../truco/sala'
import type { SalaEstado } from '../truco/sala'

const T1 = 'token-jugador-uno-1234'
const T2 = 'token-jugador-dos-5678'
const T3 = 'token-jugador-tres-999'
const T4 = 'token-jugador-cuatro-0'

function semilla(s: number): () => number {
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const sala2 = (): SalaEstado => crearSala('ABCDE', { jugadores: 2, puntos: 15 }, 0)

test('codigos de sala: formato y validacion', () => {
  const rng = semilla(3)
  for (let i = 0; i < 200; i++) assert.ok(codigoValido(generarCodigo(rng)))
  assert.equal(codigoValido('abcde'), false)
  assert.equal(codigoValido('ABCD'), false)
  assert.equal(codigoValido('ABCD0'), false, 'el cero se confunde con la O')
  assert.equal(codigoValido('../../'), false)
  assert.equal(codigoValido(undefined), false)
})

test('alias: se limpia, se acota y se rechaza lo vacio', () => {
  assert.equal(limpiarAlias('  Juan   Perez '), 'Juan Perez')
  assert.equal(limpiarAlias('<b>Ana</b>'), 'bAna/b', 'se quitan < y >')
  assert.equal(limpiarAlias('<script>alert(1)</script>'), 'scriptalert(1)/s', 'y despues se acota a 16')
  assert.equal(limpiarAlias('a'.repeat(50))!.length, 16)
  assert.equal(limpiarAlias('   '), null)
  assert.equal(limpiarAlias('\u0000\u0007'), null)
  assert.equal(limpiarAlias(42), null)
  assert.equal(limpiarAlias(null), null)
})

test('tokens y configuracion: validacion', () => {
  assert.equal(tokenValido(T1), true)
  assert.equal(tokenValido('corto'), false)
  assert.equal(tokenValido('con espacios y simbolos <>'), false)
  assert.equal(tokenValido(undefined), false)
  assert.equal(validarConfigSala({ jugadores: 2, puntos: 15 }).ok, true)
  assert.equal(validarConfigSala({ jugadores: 3, puntos: 15 }).ok, false)
  assert.equal(validarConfigSala({ jugadores: 2, puntos: 99 }).ok, false)
  assert.equal(validarConfigSala(null).ok, false)
  assert.equal(validarConfigSala('x').ok, false)
})

test('dos personas llenan la sala y la partida arranca sola', () => {
  const s = sala2()
  const a = unirse(s, T1, 'Ana', 1)
  assert.deepEqual(a, { ok: true, seat: 0, nuevo: true })
  assert.equal(s.fase, 'espera')
  const b = unirse(s, T2, 'Beto', 2)
  assert.deepEqual(b, { ok: true, seat: 1, nuevo: true })
  assert.equal(s.fase, 'jugando')
  assert.equal(s.pvp, true, 'dos personas: cuenta para el ranking')
})

test('alias repetido, reservado o sala llena se rechazan', () => {
  const s = sala2()
  unirse(s, T1, 'Ana', 1)
  assert.equal(unirse(s, T2, 'ana', 2).ok, false, 'alias repetido sin importar mayusculas')
  assert.equal(unirse(s, T2, 'Bot', 2).ok, false, 'reservado')
  assert.equal(unirse(s, T2, 'Bot 3', 2).ok, false, 'reservado')
  assert.equal(unirse(s, T2, '', 2).ok, false)
  unirse(s, T2, 'Beto', 2)
  assert.equal(unirse(s, T3, 'Carla', 3).ok, false, 'llena y ya empezo')
})

test('reconexion: el mismo token retoma su asiento aunque la partida ya empezo', () => {
  const s = sala2()
  unirse(s, T1, 'Ana', 1)
  unirse(s, T2, 'Beto', 2)
  assert.deepEqual(unirse(s, T1, 'otro nombre', 9), { ok: true, seat: 0, nuevo: false })
  assert.equal(s.asientos[0]!.alias, 'Ana', 'no cambia el alias al reconectar')
})

test('solo el anfitrion puede empezar y los lugares libres se llenan con bots', () => {
  const s = crearSala('ABCDE', { jugadores: 4, puntos: 30 }, 0)
  unirse(s, T1, 'Ana', 1)
  unirse(s, T2, 'Beto', 2)
  assert.equal(iniciar(s, T2, 3).ok, false, 'Beto no es anfitrion')
  assert.equal(iniciar(s, T3, 3).ok, false, 'desconocido')
  assert.equal(iniciar(s, T1, 3, semilla(1)).ok, true)
  assert.equal(s.fase, 'jugando')
  assert.deepEqual(
    s.asientos.map((a) => a!.bot),
    [false, false, true, true],
  )
  assert.deepEqual(
    s.asientos.map((a) => a!.alias),
    ['Ana', 'Beto', 'Bot 1', 'Bot 2'],
  )
  assert.equal(s.pvp, false, 'con bots no cuenta para el ranking')
  assert.equal(iniciar(s, T1, 4).ok, false, 'ya empezo')
})

test('el asiento sale del token: no se puede jugar por otro', () => {
  const s = sala2()
  unirse(s, T1, 'Ana', 1)
  unirse(s, T2, 'Beto', 2)
  const tiene = (seat: number) => accionesLegales(s.partida!, seat).length > 0
  const quien = tiene(0) ? [T1, T2] : [T2, T1]
  const [turno, ajeno] = quien as [string, string]
  const accion = accionesLegales(s.partida!, tiene(0) ? 0 : 1).find((a) => a.tipo === 'jugar_carta')!
  assert.equal(jugar(s, ajeno, accion, 5).ok, false, 'no es su turno')
  assert.equal(jugar(s, T3, accion, 5).ok, false, 'token desconocido')
  assert.equal(jugar(s, turno, accion, 5).ok, true)
})

test('sin partida en curso no se puede jugar', () => {
  const s = sala2()
  unirse(s, T1, 'Ana', 1)
  assert.equal(jugar(s, T1, { tipo: 'mazo' }, 2).ok, false)
})

test('el bot mueve cuando le toca y nunca antes', () => {
  const s = sala2()
  unirse(s, T1, 'Ana', 1)
  iniciar(s, T1, 2, semilla(7))
  // La mano arranca en el asiento 0 (la persona): al bot todavia no le toca.
  assert.equal(botPendiente(s), null)
  assert.equal(moverBot(s, 3).ok, false)
  const accion = accionesLegales(s.partida!, 0).find((a) => a.tipo === 'jugar_carta')!
  assert.equal(jugar(s, T1, accion, 3, semilla(1)).ok, true)
  assert.equal(botPendiente(s), 1, 'ahora le toca al bot')
  const r = moverBot(s, 4, semilla(2))
  assert.ok(r.ok)
})

test('una persona contra un bot juega hasta el final sin trabarse', () => {
  const s = sala2()
  unirse(s, T1, 'Ana', 1)
  iniciar(s, T1, 2, semilla(11))
  const rng = semilla(5)
  let pasos = 0
  while (s.fase === 'jugando') {
    assert.ok(++pasos < 3000, 'no termina')
    if (botPendiente(s) !== null) {
      assert.ok(moverBot(s, pasos, rng).ok)
    } else {
      const legales = accionesLegales(s.partida!, 0)
      assert.ok(legales.length > 0, 'trabada: ni humano ni bot pueden mover')
      const r = jugar(s, T1, legales[Math.floor(rng() * legales.length)]!, pasos, rng)
      assert.ok(r.ok)
    }
  }
  assert.equal(s.fase, 'fin')
  assert.equal(s.pvp, false)
})

test('el mensaje a un celular no contiene tokens ni cartas ajenas', () => {
  const s = sala2()
  unirse(s, T1, 'Ana', 1)
  unirse(s, T2, 'Beto', 2)
  const m1 = mensajePara(s, T1)!
  const texto = JSON.stringify(m1)
  assert.ok(!texto.includes(T1) && !texto.includes(T2), 'se filtro un token')
  for (const carta of s.partida!.actual.restantes[1]!) {
    assert.ok(!texto.includes(JSON.stringify(carta)), 'Ana ve cartas de Beto')
  }
  assert.equal(m1.yo, 0)
  assert.equal(m1.esAnfitrion, true)
  assert.equal(mensajePara(s, T2)!.esAnfitrion, false)
  assert.equal(mensajePara(s, T3), null, 'un desconocido no recibe nada')
})

test('el resumen para la pantalla del local no expone tokens ni cartas', () => {
  const s = sala2()
  unirse(s, T1, 'Ana', 1)
  unirse(s, T2, 'Beto', 2)
  const texto = JSON.stringify(resumenPublico(s))
  assert.ok(!texto.includes(T1) && !texto.includes(T2))
  assert.ok(!texto.includes('palo'), 'no deberia haber cartas')
  assert.deepEqual(resumenPublico(s).jugadores, ['Ana', 'Beto'])
})

test('sala de cuatro con cuatro personas arranca sola y es PvP', () => {
  const s = crearSala('ABCDE', { jugadores: 4, puntos: 15 }, 0)
  for (const [i, t] of [T1, T2, T3, T4].entries()) assert.ok(unirse(s, t, `J${i}`, i).ok)
  assert.equal(s.fase, 'jugando')
  assert.equal(s.pvp, true)
})

// ---------- limite de tiempo por jugada ----------

const LIMITE = 1000 // un segundo, para probar sin esperar

// Sala de 2 con dos personas; devuelve la sala, quien mueve primero y su token.
function salaConReloj() {
  const s = crearSala('ABCDE', { jugadores: 2, puntos: 15 }, 0, LIMITE)
  unirse(s, T1, 'Ana', 100)
  unirse(s, T2, 'Beto', 100)
  const seat = asientoQueMueve(s)!
  const tokens = [T1, T2]
  return { s, seat, token: tokens[seat]!, otro: tokens[1 - seat]! }
}

test('el reloj arranca con la partida y no vence antes de tiempo', () => {
  const { s } = salaConReloj()
  assert.equal(vencimiento(s), 100 + LIMITE)
  assert.equal(resolverVencimiento(s, 100 + LIMITE - 1).ok, false)
  assert.equal(s.fase, 'jugando')
})

test('sin partida en juego no hay reloj', () => {
  const s = crearSala('ABCDE', { jugadores: 2, puntos: 15 }, 0, LIMITE)
  unirse(s, T1, 'Ana', 1)
  assert.equal(vencimiento(s), null)
  assert.equal(resolverVencimiento(s, 999999).ok, false)
})

test('al vencerse, juega el bot por la persona y se reinicia el reloj', () => {
  const { s, seat } = salaConReloj()
  const r = resolverVencimiento(s, 100 + LIMITE, semilla(3))
  assert.ok(r.ok && r.resultado === 'autojugada' && r.seat === seat)
  assert.equal(s.ausencias[seat], 1)
  assert.equal(s.fase, 'jugando')
  assert.equal(s.turnoDesde, 100 + LIMITE, 'el reloj vuelve a empezar desde la jugada automatica')
})

test('el reloj no corre mientras le toca a un bot', () => {
  const s = crearSala('ABCDE', { jugadores: 2, puntos: 15 }, 0, LIMITE)
  unirse(s, T1, 'Ana', 1)
  iniciar(s, T1, 2, semilla(7))
  // Se fuerza el turno del bot jugando la carta de Ana.
  const accion = accionesLegales(s.partida!, 0).find((a) => a.tipo === 'jugar_carta')!
  jugar(s, T1, accion, 3, semilla(1))
  assert.equal(botPendiente(s), 1)
  assert.equal(vencimiento(s), null)
  assert.equal(resolverVencimiento(s, 999999).ok, false)
})

test('dos vencimientos seguidos son abandono: gana el rival', () => {
  const { s, seat } = salaConReloj()
  resolverVencimiento(s, 100 + LIMITE, semilla(3))
  // La jugada automatica pudo pasarle el turno al otro: se avanza hasta que vuelva a mover la misma persona.
  let ahora = 100 + LIMITE
  let abandono = false
  for (let i = 0; i < 50 && !abandono; i++) {
    const mueve = asientoQueMueve(s)!
    const esperaPersona = !s.asientos[mueve]!.bot
    assert.ok(esperaPersona)
    ahora += LIMITE
    const r = resolverVencimiento(s, ahora, semilla(i + 5))
    assert.ok(r.ok)
    if (r.ok && r.resultado === 'abandono') {
      abandono = true
      assert.equal(s.fase, 'fin')
      assert.equal(s.motivoFin, 'abandono')
      assert.equal(s.abandono, r.seat)
      assert.equal(s.partida!.ganadorPartida, r.seat === 0 ? 1 : 0)
    }
  }
  assert.ok(abandono, 'nunca se llego al abandono')
  void seat
})

test('jugar a tiempo borra los vencimientos anteriores', () => {
  const { s, seat, token } = salaConReloj()
  resolverVencimiento(s, 100 + LIMITE, semilla(3))
  assert.equal(s.ausencias[seat], 1)
  // La persona vuelve y juega lo que le toque.
  const mueve = asientoQueMueve(s)!
  const tokens = [T1, T2]
  const accion = accionesLegales(s.partida!, mueve)[0]!
  assert.ok(jugar(s, tokens[mueve]!, accion, 100 + LIMITE + 10, semilla(9)).ok)
  assert.equal(s.ausencias[mueve], 0)
  void token
})

test('despues del abandono no se puede seguir jugando ni hay reloj', () => {
  const { s } = salaConReloj()
  let ahora = 100
  for (let i = 0; i < 60 && s.fase === 'jugando'; i++) {
    ahora += LIMITE
    resolverVencimiento(s, ahora, semilla(i + 20))
  }
  assert.equal(s.fase, 'fin')
  assert.equal(vencimiento(s), null)
  assert.equal(jugar(s, T1, { tipo: 'mazo' }, ahora + 1).ok, false)
  assert.equal(jugar(s, T2, { tipo: 'mazo' }, ahora + 1).ok, false)
})

test('el mensaje informa el tiempo restante solo de quien mueve', () => {
  const { s, seat, token, otro } = salaConReloj()
  const m = mensajePara(s, token, 100 + 300)!
  assert.equal(m.mueve, seat)
  assert.equal(m.restanteMs, LIMITE - 300)
  assert.equal(
    mensajePara(s, otro, 100 + 300)!.restanteMs,
    LIMITE - 300,
    'el rival tambien ve cuanto le queda a quien mueve',
  )
  assert.equal(mensajePara(s, token, 100 + LIMITE + 5000)!.restanteMs, 0, 'nunca negativo')
})

test('el mensaje de fin por abandono dice quien abandono', () => {
  const { s } = salaConReloj()
  let ahora = 100
  for (let i = 0; i < 60 && s.fase === 'jugando'; i++) {
    ahora += LIMITE
    resolverVencimiento(s, ahora, semilla(i + 40))
  }
  const m = mensajePara(s, T1, ahora)!
  assert.equal(m.fase, 'fin')
  assert.equal(m.motivoFin, 'abandono')
  assert.ok(m.abandono === 0 || m.abandono === 1)
  assert.equal(m.restanteMs, null)
})

test('una persona pasiva contra un bot termina en abandono sin trabarse', () => {
  const s = crearSala('ABCDE', { jugadores: 2, puntos: 15 }, 0, LIMITE)
  unirse(s, T1, 'Ana', 1)
  iniciar(s, T1, 2, semilla(13))
  let ahora = 2
  const rng = semilla(17)
  for (let i = 0; i < 400 && s.fase === 'jugando'; i++) {
    if (botPendiente(s) !== null) {
      assert.ok(moverBot(s, ++ahora, rng).ok)
    } else {
      ahora += LIMITE // Ana nunca juega: siempre se vence
      assert.ok(resolverVencimiento(s, ahora, rng).ok)
    }
  }
  assert.equal(s.fase, 'fin', 'la sala deberia cerrarse sola')
})
