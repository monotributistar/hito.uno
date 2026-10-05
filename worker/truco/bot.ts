// Bot basico de truco. Decide SOLO con la `vista` de su asiento (lo mismo que ve un celular),
// asi que no puede hacer trampa. No farolea: canta y acepta segun la fuerza real de su mano.
// Es una funcion pura y determinista; la demora "de pensar" la pone la sala, no el bot.

import { fuerza, tantoEnvido } from './cartas'
import type { Carta } from './cartas'
import { equipoDe } from './motor'
import type { Accion, Vista } from './motor'

// Umbrales unicos y simples (se pueden ajustar tras probar con jugadores reales).
const TANTO_PARA_CANTAR = 28
const TANTO_PARA_QUERER = 25
const FUERZA_PARA_CANTAR_TRUCO = 10 // promedio: tres o mejor
const FUERZA_PARA_SUBIR = 12 // promedio: un siete de espada o mejor, en promedio
const FUERZA_PARA_QUERER_TRUCO = 8

// Las tres cartas repartidas: las que le quedan mas las que ya jugo.
function cartasOriginales(v: Vista): Carta[] {
  const jugadas = v.bazas
    .flatMap((b) => b.jugadas)
    .filter((j) => j.seat === v.yo)
    .map((j) => j.carta)
  return [...v.misCartas, ...jugadas]
}

function fuerzaPromedio(cartas: readonly Carta[]): number {
  if (cartas.length === 0) return 0
  return cartas.reduce((s, c) => s + fuerza(c), 0) / cartas.length
}

function tiene(acciones: readonly Accion[], tipo: Accion['tipo']): boolean {
  return acciones.some((a) => a.tipo === tipo)
}

// Elige la carta a jugar: la mas baja que alcance para ganar la baza; si no alcanza (o si ya va
// ganando el companero), la mas baja; si abre la baza, la mas alta.
function elegirCarta(v: Vista): Accion {
  const bajas = v.misCartas.slice().sort((a, b) => fuerza(a) - fuerza(b))
  const baza = v.bazas[v.bazas.length - 1]!
  const jugadas = baza.jugadas
  let carta: Carta
  if (jugadas.length === 0) {
    carta = bajas[bajas.length - 1]!
  } else {
    const mejorDe = (equipo: number) =>
      Math.max(0, ...jugadas.filter((j) => equipoDe(j.seat) === equipo).map((j) => fuerza(j.carta)))
    const rival = mejorDe(equipoDe(v.yo) === 0 ? 1 : 0)
    const propio = mejorDe(equipoDe(v.yo))
    const alcanza = bajas.find((c) => fuerza(c) > rival)
    carta = propio > rival || alcanza === undefined ? bajas[0]! : alcanza
  }
  return { tipo: 'jugar_carta', carta }
}

export function decidir(v: Vista): Accion {
  const acciones = v.acciones
  if (acciones.length === 0) throw new Error('el bot no tiene acciones legales en este momento')

  const originales = cartasOriginales(v)
  const tanto = tantoEnvido(originales)
  const promedio = fuerzaPromedio(v.misCartas.length > 0 ? v.misCartas : originales)

  // Le toca responder un canto.
  if (v.responde === v.yo) {
    if (v.envido.estado === 'pendiente') {
      return tanto >= TANTO_PARA_QUERER ? { tipo: 'quiero' } : { tipo: 'no_quiero' }
    }
    if (tiene(acciones, 'cantar_truco') && promedio >= FUERZA_PARA_SUBIR) return { tipo: 'cantar_truco' }
    return promedio >= FUERZA_PARA_QUERER_TRUCO ? { tipo: 'quiero' } : { tipo: 'no_quiero' }
  }

  // Es su turno de jugar. Primero el envido (si tiene buen tanto), despues el truco.
  const envido = acciones.find((a) => a.tipo === 'cantar_envido' && a.canto === 'envido')
  if (envido && tanto >= TANTO_PARA_CANTAR) return envido
  if (tiene(acciones, 'cantar_truco')) {
    const umbral = v.truco.nivel === 0 ? FUERZA_PARA_CANTAR_TRUCO : FUERZA_PARA_SUBIR
    if (promedio >= umbral) return { tipo: 'cantar_truco' }
  }
  return elegirCarta(v)
}
