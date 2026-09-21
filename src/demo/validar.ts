/* Validacion del formulario de reserva de la demo.

   Todo en funciones puras, sin React ni navegador: asi se prueba con casos
   limite (worker/pruebas no, src/demo/pruebas) y la interfaz solo pinta lo que
   esto devuelve. Los mensajes van en castellano y se muestran al lado de cada
   campo, asi que cada uno dice que hacer, no solo que esta mal.

   La demo no manda nada a ningun lado: esta validacion es la unica barrera y
   vive en el navegador. En un sistema real de un cliente, el servidor valida
   de nuevo (como hace `worker/leads.ts` con nuestro formulario). */

export type FormularioReserva = {
  adultos: string
  menores: string
  /** `AAAA-MM-DD`, como lo devuelve un `<input type="date">`. */
  entrada: string
  salida: string
  mascota: boolean
  mascotaCual: string
  /** Franja estimada de llegada. Opcional. */
  llegada: string
  cochera: boolean
  comentario: string
  nombre: string
  contacto: string
}

export type Campo = keyof FormularioReserva
export type Errores = Partial<Record<Campo, string>>

export const FORMULARIO_VACIO: FormularioReserva = {
  adultos: '2',
  menores: '0',
  entrada: '',
  salida: '',
  mascota: false,
  mascotaCual: '',
  llegada: '',
  cochera: false,
  comentario: '',
  nombre: '',
  contacto: '',
}

export const LARGO_MAXIMO = { nombre: 80, contacto: 120, mascotaCual: 80, comentario: 1000 }

/** Estadia mas larga que se acepta. Mas que esto es casi siempre un error de tipeo. */
export const NOCHES_MAXIMAS = 60
/** Hasta cuando se puede pedir. Frena los "2062" por "2026" al tipear la fecha. */
export const DIAS_HACIA_ADELANTE = 730

/** El dia de hoy en `AAAA-MM-DD`, en la hora LOCAL del dispositivo.

    No se usa `toISOString()`, que da la fecha en hora universal: en Argentina,
    despues de las 21 ya dice "mañana", y la demo rechazaria una llegada para
    hoy a quien consulta de noche. */
export function hoyLocal(ahora: Date = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
}

/** Convierte `AAAA-MM-DD` en numero de dia, o null si la fecha no existe.
    Se cuenta en hora universal a proposito: asi un cambio de horario de
    verano nunca hace que un dia tenga 23 horas y se pierda una noche. */
function diaNumero(fecha: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (!m) return null
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const ms = Date.UTC(anio, mes - 1, dia)
  const d = new Date(ms)
  // 2026-02-30 se convertiria en 2 de marzo: si no vuelve igual, no existe.
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null
  return ms / 86_400_000
}

/** Noches entre dos fechas validas, o null si alguna no lo es. */
export function noches(entrada: string, salida: string): number | null {
  const a = diaNumero(entrada)
  const b = diaNumero(salida)
  return a === null || b === null ? null : b - a
}

/** Entero no negativo escrito en un campo, o null si no lo es ("2.5", "", "dos"). */
function entero(valor: string): number | null {
  const limpio = valor.trim()
  return /^\d+$/.test(limpio) ? Number(limpio) : null
}

/** Un telefono (8 digitos o mas, con espacios, guiones o +) o un email. */
export function contactoValido(valor: string): boolean {
  const v = valor.trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true
  if (/^[+\d\s()-]+$/.test(v) && v.replace(/\D/g, '').length >= 8) return true
  return false
}

/** Devuelve los errores por campo. Sin errores, el objeto viene vacio.

    `hoy` se recibe de afuera para poder probar cualquier fecha: la interfaz
    le pasa `hoyLocal()`. */
export function validar(
  datos: FormularioReserva,
  capacidad: number,
  aceptaMascotas: boolean,
  hoy: string,
): Errores {
  const e: Errores = {}

  // Quienes viajan ---------------------------------------------------------
  const adultos = entero(datos.adultos)
  const menores = entero(datos.menores)
  if (adultos === null) e.adultos = 'Escribí cuántos adultos viajan, en números.'
  else if (adultos < 1) e.adultos = 'Tiene que viajar al menos un adulto.'
  if (menores === null) e.menores = 'Escribí cuántos menores viajan. Si no viaja ninguno, poné 0.'
  if (!e.adultos && adultos !== null && menores !== null && adultos + menores > capacidad) {
    // El error va en adultos, que es el campo que casi siempre se corrige.
    e.adultos = `La casa es para ${capacidad} personas en total y suman ${adultos + menores}.`
  }

  // Fechas -----------------------------------------------------------------
  const hoyN = diaNumero(hoy)
  const entradaN = diaNumero(datos.entrada)
  const salidaN = diaNumero(datos.salida)

  if (!datos.entrada) e.entrada = 'Elegí el día de llegada.'
  else if (entradaN === null) e.entrada = 'Esa fecha no existe. Revisala.'
  else if (hoyN !== null && entradaN < hoyN) e.entrada = 'La llegada no puede ser antes de hoy.'
  else if (hoyN !== null && entradaN - hoyN > DIAS_HACIA_ADELANTE) {
    e.entrada = 'Esa fecha está muy adelante. ¿Está bien el año?'
  }

  if (!datos.salida) e.salida = 'Elegí el día de salida.'
  else if (salidaN === null) e.salida = 'Esa fecha no existe. Revisala.'
  else if (entradaN !== null && salidaN <= entradaN) {
    e.salida = 'La salida tiene que ser al menos un día después de la llegada.'
  } else if (entradaN !== null && salidaN - entradaN > NOCHES_MAXIMAS) {
    e.salida = `Son más de ${NOCHES_MAXIMAS} noches. Para estadías largas, contalo en el comentario.`
  }

  // Mascotas ---------------------------------------------------------------
  if (datos.mascota && !aceptaMascotas) {
    e.mascota = 'Esta casa no acepta mascotas.'
  } else if (datos.mascota && !datos.mascotaCual.trim()) {
    e.mascotaCual = 'Contanos qué mascota viaja (por ejemplo: un perro mediano).'
  }

  // Quien consulta ---------------------------------------------------------
  if (!datos.nombre.trim()) e.nombre = 'Escribí tu nombre.'
  if (!datos.contacto.trim()) e.contacto = 'Dejá un teléfono o un email para que te respondan.'
  else if (!contactoValido(datos.contacto)) {
    e.contacto = 'No parece un teléfono ni un email. Revisalo.'
  }

  // Largos: un pegado accidental no puede romper la vista del propietario. --
  for (const [campo, maximo] of Object.entries(LARGO_MAXIMO) as [Campo, number][]) {
    const valor = datos[campo]
    if (typeof valor === 'string' && valor.trim().length > maximo && !e[campo]) {
      e[campo] = `Es demasiado largo: hasta ${maximo} caracteres.`
    }
  }

  return e
}
