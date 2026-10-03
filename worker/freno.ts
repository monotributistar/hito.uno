/* Freno de respaldo, para cuando el almacen no contesta.

   El freno de verdad vive en el Durable Object (`allow` en store.ts): cuenta
   bien, es consistente y lo ven todos los pedidos. El problema es cuando no
   contesta, que es justo cuando lo estan golpeando: hasta ahora, sin respuesta
   del almacen la consulta pasaba igual. Un freno que se apaga solo cuando mas
   falta no es un freno.

   Rechazar todo en ese caso tampoco sirve: hoy, con el almacen caido, la
   consulta igual llega a la planilla, asi que rechazarla significa perder un
   pedido real de un cliente. Entre "no frena nada" y "pierde consultas", este
   archivo es el punto del medio.

   Que es: una cuenta en la memoria del isolate. No reemplaza al almacen y no
   pretende ser exacto. Cloudflare reparte los pedidos entre varios isolates y
   los recicla cuando quiere, asi que un atacante decidido pasa mas de lo que
   dice el limite. Pero una sola persona nunca se ve frenada, y una avalancha
   desde un mismo lugar deja de ser gratis. Para el tamaño de Hito, alcanza.

   No guarda la IP: recibe el mismo hash corto que usa el almacen. */

type Cuenta = { count: number; desde: number }

const CUENTAS = new Map<string, Cuenta>()

/* Tope de entradas. Sin esto, una avalancha desde miles de direcciones
   distintas llenaria la memoria del isolate, que es otra forma de voltearlo. */
const MAX_ENTRADAS = 1000

/** `true` si el intento pasa. Cuenta por ventana, igual que el almacen. */
export function permiteSinAlmacen(bucket: string, limit: number, windowMs: number): boolean {
  const ahora = Date.now()

  if (CUENTAS.size > MAX_ENTRADAS) limpiar(ahora, windowMs)

  const actual = CUENTAS.get(bucket)
  if (!actual || ahora - actual.desde > windowMs) {
    CUENTAS.set(bucket, { count: 1, desde: ahora })
    return true
  }
  if (actual.count >= limit) return false
  actual.count += 1
  return true
}

/** Saca las ventanas vencidas. Si despues de eso sigue lleno —todas vigentes,
    o sea una avalancha de verdad— se vacia entero: perder la cuenta es volver
    a empezar de cero, no dejar pasar a todos. */
function limpiar(ahora: number, windowMs: number): void {
  for (const [bucket, cuenta] of CUENTAS) {
    if (ahora - cuenta.desde > windowMs) CUENTAS.delete(bucket)
  }
  if (CUENTAS.size > MAX_ENTRADAS) CUENTAS.clear()
}

/** Solo para las pruebas: deja la cuenta como recien arrancada. */
export function vaciarFreno(): void {
  CUENTAS.clear()
}
