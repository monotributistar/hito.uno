/* Tokens del panel revocados.

   Por que existe esta lista: los tokens se cargan desde worker/tokens.json con
   INSERT OR IGNORE (store.ts), asi que sacar un token del archivo NO lo revoca.
   Sigue vivo en el Durable Object de produccion y de dev, y el link sigue
   abriendo el panel. Revocar pide un borrado explicito en el almacen: el
   almacen aplica esta lista cada vez que arranca, y cada deploy lo hace
   arrancar de nuevo.

   Se guarda el hash (SHA-256 del token, en hexadecimal) y no el token: aunque
   estos ya son publicos, el repositorio no tiene por que volver a publicarlos.

   Lo que NO se hace, a proposito: borrar todo token que no este en
   tokens.json. El dia que exista la administracion va a haber tokens de
   clientes que no estan en ese archivo, y un "borrar lo que falte" se los
   llevaria puestos. Se revoca uno por uno, sabiendo cual.

   Para revocar otro: calcular el hash sin imprimir el token
     node -e "console.log(require('crypto').createHash('sha256').update(TOKEN).digest('hex'))"
   y sumarlo aca con el motivo. */

export const REVOCADOS: { hash: string; dueno: string; motivo: string }[] = [
  {
    hash: 'f3f4fa041eea547e7344b3b2796babcdc01cd690e5dfac1063f0251d71fcc7e1',
    dueno: 'stephano',
    motivo: '2026-09-21: publicado en el repositorio, que estaba publico',
  },
  {
    hash: 'a59bbf202f25aa3f272d51e2cedae21a2e5326e3cbe6989635fd9d5280cfb841',
    dueno: 'javier',
    motivo: '2026-09-21: publicado en el repositorio, que estaba publico',
  },
]

/** SHA-256 en hexadecimal. `crypto.subtle` existe igual en el Worker y en Node. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** De una lista de tokens, los que estan revocados. */
export async function tokensRevocados(tokens: string[], revocados: string[]): Promise<string[]> {
  const lista = new Set(revocados)
  const hashes = await Promise.all(tokens.map(hashToken))
  return tokens.filter((_, i) => lista.has(hashes[i]))
}
