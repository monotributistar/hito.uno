/* El renglon que le quedaria al propietario en su planilla.

   Es la promesa que la demo tiene que mostrar: "cada pedido ordenado en una
   planilla". En un sistema real de un cliente, este renglon lo escribe el
   servidor en su Google Sheet, con el mismo mecanismo que ya usa nuestro
   formulario (Worker -> Apps Script -> planilla). En la demo solo se dibuja:
   no se guarda en ningun lado, ni siquiera en el navegador.

   Funcion pura para poder probar el formato: una planilla es una herramienta
   que el propietario va a filtrar y ordenar, asi que cada columna tiene que
   salir siempre igual (fechas como las escribe una planilla, Si/No y no
   true/false, vacio y no "undefined"). */

import { noches, type FormularioReserva } from './validar'

/** Columnas, en el orden en que aparecen en la planilla. */
export const COLUMNAS = [
  'Recibida',
  'Nombre',
  'Contacto',
  'Llegada',
  'Salida',
  'Noches',
  'Adultos',
  'Menores',
  'Mascota',
  'Cochera',
  'Horario de llegada',
  'Comentario',
] as const

export type Columna = (typeof COLUMNAS)[number]
export type Fila = Record<Columna, string>

const dos = (n: number) => String(n).padStart(2, '0')

/** "2026-10-10" -> "10/10/2026": como lo muestra una planilla en castellano. */
export function fechaPlanilla(iso: string): string {
  const [a, m, d] = iso.split('-')
  return a && m && d ? `${d}/${m}/${a}` : ''
}

/** Momento de la consulta, en hora local: "21/09/2026 14:05". */
export function momentoPlanilla(fecha: Date): string {
  return (
    `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ` +
    `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
  )
}

/** Arma el renglon de una consulta ya validada. */
export function filaPlanilla(datos: FormularioReserva, recibida: Date): Fila {
  const n = noches(datos.entrada, datos.salida)
  return {
    Recibida: momentoPlanilla(recibida),
    Nombre: datos.nombre.trim(),
    Contacto: datos.contacto.trim(),
    Llegada: fechaPlanilla(datos.entrada),
    Salida: fechaPlanilla(datos.salida),
    Noches: n === null ? '' : String(n),
    Adultos: String(Number(datos.adultos)),
    Menores: String(Number(datos.menores)),
    Mascota: datos.mascota ? datos.mascotaCual.trim() : 'No',
    Cochera: datos.cochera ? 'Sí' : 'No',
    'Horario de llegada': datos.llegada,
    Comentario: datos.comentario.trim(),
  }
}
