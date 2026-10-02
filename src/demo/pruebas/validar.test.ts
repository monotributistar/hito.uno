/* Pruebas de la validacion del formulario de reserva.

   Cada regla tiene su caso limite: el valor justo que tiene que pasar y el
   primero que no. Un formulario que rechaza a alguien legitimo por un dia o
   por una persona es tan malo como uno que deja pasar cualquier cosa. */

import { test, expect, describe, vi } from 'vitest'
import {
  FORMULARIO_VACIO,
  LARGO_MAXIMO,
  NOCHES_MAXIMAS,
  contactoValido,
  hoyLocal,
  noches,
  validar,
  type FormularioReserva,
} from '../validar'

const HOY = '2026-09-21'
const CAPACIDAD = 6

/** Una consulta valida, para cambiarle un solo campo por prueba. */
function consulta(cambios: Partial<FormularioReserva> = {}): FormularioReserva {
  return {
    ...FORMULARIO_VACIO,
    adultos: '2',
    menores: '1',
    entrada: '2026-10-10',
    salida: '2026-10-13',
    nombre: 'Ana',
    contacto: '+54 9 11 5555 5555',
    ...cambios,
  }
}

const errores = (cambios: Partial<FormularioReserva> = {}, aceptaMascotas = true) =>
  validar(consulta(cambios), CAPACIDAD, aceptaMascotas, HOY)

test('una consulta completa y razonable no tiene errores', () => {
  expect(errores()).toEqual({})
})

describe('fechas', () => {
  test('llegar hoy se puede', () => {
    expect(errores({ entrada: HOY, salida: '2026-09-22' })).toEqual({})
  })

  test('llegar ayer no', () => {
    expect(errores({ entrada: '2026-09-20' }).entrada).toMatch(/antes de hoy/)
  })

  test('una sola noche se puede', () => {
    expect(errores({ entrada: '2026-10-10', salida: '2026-10-11' })).toEqual({})
  })

  test('salir el mismo dia que se llega no', () => {
    expect(errores({ entrada: '2026-10-10', salida: '2026-10-10' }).salida).toMatch(/después de la llegada/)
  })

  test('salir antes de llegar no', () => {
    expect(errores({ entrada: '2026-10-10', salida: '2026-10-08' }).salida).toMatch(/después de la llegada/)
  })

  test(`${NOCHES_MAXIMAS} noches se puede, una mas no`, () => {
    expect(errores({ entrada: '2026-10-01', salida: '2026-11-30' })).toEqual({})
    expect(noches('2026-10-01', '2026-11-30')).toBe(NOCHES_MAXIMAS)
    expect(errores({ entrada: '2026-10-01', salida: '2026-12-01' }).salida).toMatch(/más de 60 noches/)
  })

  test('una fecha que no existe se rechaza, no se corre al mes siguiente', () => {
    // Date convierte el 30 de febrero en 2 de marzo sin avisar.
    expect(errores({ entrada: '2027-02-30', salida: '2027-03-05' }).entrada).toMatch(/no existe/)
  })

  test('un año tipeado de mas se frena', () => {
    expect(errores({ entrada: '2062-10-10', salida: '2062-10-12' }).entrada).toMatch(/muy adelante/)
  })

  test('las fechas vacias piden completarse', () => {
    const e = errores({ entrada: '', salida: '' })
    expect(e.entrada).toMatch(/llegada/)
    expect(e.salida).toMatch(/salida/)
  })

  test('las noches se cuentan bien a traves de un cambio de mes y de año', () => {
    expect(noches('2026-12-30', '2027-01-02')).toBe(3)
    expect(noches('2028-02-28', '2028-03-01')).toBe(2) // 2028 es bisiesto
  })
})

describe('hoy, en hora local', () => {
  test('a las 23:30 en Argentina sigue siendo hoy, no mañana', () => {
    /* La trampa: toISOString() da la fecha en hora universal, y a las 23:30
       de Argentina ya es el dia siguiente. Si hoyLocal la usara, quien
       consulta de noche no podria elegir llegar hoy.
       La zona se fija aca para que la prueba muerda tambien en la validacion
       de GitHub, que corre en hora universal. */
    /* vi.stubEnv y no process.env: este codigo es de navegador y su tsconfig
       no incluye los tipos de Node a proposito. */
    vi.stubEnv('TZ', 'America/Argentina/Buenos_Aires')
    try {
      const nocheDel21 = new Date('2026-09-22T02:30:00Z') // 23:30 del 21 en Argentina
      expect(nocheDel21.toISOString().slice(0, 10)).toBe('2026-09-22') // lo que NO hay que usar
      expect(hoyLocal(nocheDel21)).toBe('2026-09-21')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('quienes viajan', () => {
  test('justo la capacidad se puede', () => {
    expect(errores({ adultos: '4', menores: '2' })).toEqual({})
  })

  test('una persona mas que la capacidad no', () => {
    expect(errores({ adultos: '4', menores: '3' }).adultos).toMatch(/6 personas en total y suman 7/)
  })

  test('los menores cuentan para la capacidad', () => {
    expect(errores({ adultos: '1', menores: '6' }).adultos).toMatch(/suman 7/)
  })

  test('tiene que viajar al menos un adulto', () => {
    expect(errores({ adultos: '0', menores: '2' }).adultos).toMatch(/al menos un adulto/)
  })

  test('sin adultos y pasados de capacidad, se dice primero lo de los adultos', () => {
    // Si el de capacidad pisara al otro, la persona corrige los menores y
    // recien despues se entera de que falta un adulto.
    expect(errores({ adultos: '0', menores: '7' }).adultos).toMatch(/al menos un adulto/)
  })

  test('sin menores se escribe 0, y 0 es valido', () => {
    expect(errores({ menores: '0' })).toEqual({})
    expect(errores({ menores: '' }).menores).toMatch(/poné 0/)
  })

  test('solo numeros enteros', () => {
    expect(errores({ adultos: '2.5' }).adultos).toMatch(/en números/)
    expect(errores({ adultos: 'dos' }).adultos).toMatch(/en números/)
    expect(errores({ menores: '-1' }).menores).toBeDefined()
  })
})

describe('mascotas', () => {
  test('si viaja una mascota, hay que decir cual', () => {
    expect(errores({ mascota: true, mascotaCual: '' }).mascotaCual).toMatch(/qué mascota/)
    expect(errores({ mascota: true, mascotaCual: '   ' }).mascotaCual).toMatch(/qué mascota/)
    expect(errores({ mascota: true, mascotaCual: 'Un perro mediano' })).toEqual({})
  })

  test('sin mascota, el campo de cual no importa', () => {
    expect(errores({ mascota: false, mascotaCual: '' })).toEqual({})
  })

  test('si la casa no acepta mascotas, se avisa', () => {
    expect(errores({ mascota: true, mascotaCual: 'Un gato' }, false).mascota).toMatch(/no acepta/)
  })
})

describe('quien consulta', () => {
  test('nombre y contacto son obligatorios', () => {
    const e = errores({ nombre: ' ', contacto: '' })
    expect(e.nombre).toBeDefined()
    expect(e.contacto).toMatch(/teléfono o un email/)
  })

  test('acepta telefonos escritos como los escribe la gente', () => {
    for (const tel of ['+54 9 2254 59 0762', '2254590762', '(011) 4555-5555', '11 5555 5555']) {
      expect(contactoValido(tel), tel).toBe(true)
    }
  })

  test('acepta emails', () => {
    expect(contactoValido('ana@ejemplo.com')).toBe(true)
  })

  test('rechaza lo que no es ni una cosa ni la otra', () => {
    for (const malo of ['abc', '1234', 'ana@', 'ana@ejemplo', '12 34 56']) {
      expect(contactoValido(malo), malo).toBe(false)
    }
  })
})

test('un texto demasiado largo se frena con el maximo dicho', () => {
  const largo = 'x'.repeat(LARGO_MAXIMO.comentario + 1)
  expect(errores({ comentario: largo }).comentario).toMatch(/hasta 1000 caracteres/)
  expect(errores({ comentario: 'x'.repeat(LARGO_MAXIMO.comentario) })).toEqual({})
})
