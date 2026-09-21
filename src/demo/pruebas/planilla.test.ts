/* Pruebas del renglon de la planilla del propietario.

   Una planilla se filtra y se ordena: si una columna sale una vez "Si" y otra
   "true", o una fecha una vez 10/10/2026 y otra 2026-10-10, el propietario no
   puede ordenar por llegada ni contar cuantos traen mascota. Estas pruebas
   fijan que cada columna salga siempre con el mismo formato. */

import { test, expect } from 'vitest'
import { COLUMNAS, fechaPlanilla, filaPlanilla, momentoPlanilla } from '../planilla'
import { FORMULARIO_VACIO, type FormularioReserva } from '../validar'

function consulta(cambios: Partial<FormularioReserva> = {}): FormularioReserva {
  return {
    ...FORMULARIO_VACIO,
    adultos: '2',
    menores: '1',
    entrada: '2026-12-28',
    salida: '2027-01-03',
    nombre: '  Ana Prueba ',
    contacto: ' ana@ejemplo.com ',
    ...cambios,
  }
}

/** 21 de septiembre de 2026, 14:05, en hora local. */
const RECIBIDA = new Date(2026, 8, 21, 14, 5)

test('el renglon tiene todas las columnas, en orden, y ninguna sobra', () => {
  expect(Object.keys(filaPlanilla(consulta(), RECIBIDA))).toEqual([...COLUMNAS])
})

test('una consulta completa queda asi en la planilla', () => {
  const fila = filaPlanilla(
    consulta({
      llegada: 'De 16 a 20',
      mascota: true,
      mascotaCual: ' Una perra chica ',
      cochera: true,
      comentario: ' ¿Hay cuna? ',
    }),
    RECIBIDA,
  )
  expect(fila).toEqual({
    Recibida: '21/09/2026 14:05',
    Nombre: 'Ana Prueba',
    Contacto: 'ana@ejemplo.com',
    Llegada: '28/12/2026',
    Salida: '03/01/2027',
    Noches: '6',
    Adultos: '2',
    Menores: '1',
    Mascota: 'Una perra chica',
    Cochera: 'Sí',
    'Horario de llegada': 'De 16 a 20',
    Comentario: '¿Hay cuna?',
  })
})

test('lo que no se marco sale como No o vacio, nunca como false o undefined', () => {
  const fila = filaPlanilla(consulta(), RECIBIDA)
  expect(fila.Mascota).toBe('No')
  expect(fila.Cochera).toBe('No')
  expect(fila['Horario de llegada']).toBe('')
  expect(fila.Comentario).toBe('')
  for (const valor of Object.values(fila)) {
    expect(valor).not.toMatch(/undefined|null|true|false|NaN/)
  }
})

test('sin mascota, lo que haya quedado escrito en "cual" no aparece', () => {
  // Alguien marca mascota, escribe, y despues la desmarca: el texto queda en
  // el estado del formulario, pero no puede llegar a la planilla.
  expect(filaPlanilla(consulta({ mascota: false, mascotaCual: 'Un gato' }), RECIBIDA).Mascota).toBe('No')
})

test('los numeros salen limpios aunque se hayan escrito con ceros o espacios', () => {
  const fila = filaPlanilla(consulta({ adultos: '02', menores: ' 0 ' }), RECIBIDA)
  expect(fila.Adultos).toBe('2')
  expect(fila.Menores).toBe('0')
})

test('las fechas salen como las escribe una planilla en castellano', () => {
  expect(fechaPlanilla('2026-10-05')).toBe('05/10/2026')
  expect(fechaPlanilla('')).toBe('')
})

test('el momento de la consulta va en hora local, con ceros', () => {
  expect(momentoPlanilla(new Date(2026, 0, 3, 9, 7))).toBe('03/01/2026 09:07')
})
