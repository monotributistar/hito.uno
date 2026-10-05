// Mazo español de 40 cartas y las dos jerarquias que usa el truco:
// la fuerza para ganar bazas y el valor para el envido.

export type Palo = 'espada' | 'basto' | 'oro' | 'copa'
export type Numero = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12

export interface Carta {
  palo: Palo
  numero: Numero
}

export const PALOS: readonly Palo[] = ['espada', 'basto', 'oro', 'copa']
export const NUMEROS: readonly Numero[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]

export function crearMazo(): Carta[] {
  const mazo: Carta[] = []
  for (const palo of PALOS) {
    for (const numero of NUMEROS) mazo.push({ palo, numero })
  }
  return mazo
}

export function mismaCarta(a: Carta, b: Carta): boolean {
  return a.palo === b.palo && a.numero === b.numero
}

// Mezcla Fisher-Yates. El generador se inyecta para que las pruebas sean reproducibles.
export function barajar(cartas: readonly Carta[], rng: () => number): Carta[] {
  const copia = cartas.slice()
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j]!, copia[i]!]
  }
  return copia
}

// Fuerza en la baza: mas alto gana. Dos cartas con la misma fuerza empatan (parda).
// Orden: 1 espada, 1 basto, 7 espada, 7 oro, los 3, los 2, 1 copa y 1 oro,
// los 12, 11, 10, 7 copa y 7 basto, los 6, 5 y 4.
export function fuerza(c: Carta): number {
  if (c.numero === 1 && c.palo === 'espada') return 14
  if (c.numero === 1 && c.palo === 'basto') return 13
  if (c.numero === 7 && c.palo === 'espada') return 12
  if (c.numero === 7 && c.palo === 'oro') return 11
  switch (c.numero) {
    case 3:
      return 10
    case 2:
      return 9
    case 1:
      return 8 // ancho falso (copa u oro)
    case 12:
      return 7
    case 11:
      return 6
    case 10:
      return 5
    case 7:
      return 4 // 7 de copa o de basto
    case 6:
      return 3
    case 5:
      return 2
    default:
      return 1 // el 4
  }
}

// Valor de una carta para el envido: las figuras (10, 11, 12) valen cero.
export function valorEnvido(c: Carta): number {
  return c.numero >= 10 ? 0 : c.numero
}

// Tanto de envido de una mano: con dos cartas del mismo palo es 20 mas la suma de las dos
// (se elige la mejor pareja); si no hay pareja, vale la carta mas alta.
export function tantoEnvido(cartas: readonly Carta[]): number {
  let mejor = 0
  for (const c of cartas) mejor = Math.max(mejor, valorEnvido(c))
  for (let i = 0; i < cartas.length; i++) {
    for (let j = i + 1; j < cartas.length; j++) {
      const a = cartas[i]!
      const b = cartas[j]!
      if (a.palo === b.palo) mejor = Math.max(mejor, 20 + valorEnvido(a) + valorEnvido(b))
    }
  }
  return mejor
}
