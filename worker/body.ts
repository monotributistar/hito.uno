/* Lectura de cuerpos JSON con tope de tamaño.

   `request.json()` lee el cuerpo entero antes de mirar nada: un pedido de
   50 MB se carga completo en memoria y recién ahí falla o pasa. Cloudflare
   deja entrar cuerpos de hasta 100 MB, así que el tope lo tenemos que poner
   nosotros.

   Se mira primero `Content-Length`, que es barato, pero no alcanza: el
   encabezado puede no venir (envío por partes) o mentir. Por eso además se
   lee de a pedazos y se corta apenas se pasa del tope, sin guardar el resto. */

export type BodyResult<T> =
  | { ok: true; data: T }
  /** 413: el cuerpo se pasa del tope. 400: está vacío o no es JSON. */
  | { ok: false; status: 400 | 413 }

export async function readJson<T>(request: Request, maxBytes: number): Promise<BodyResult<T>> {
  const declared = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, status: 413 }
  if (!request.body) return { ok: false, status: 400 }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      // Cortar la lectura: el resto del cuerpo no se descarga.
      await reader.cancel().catch(() => {})
      return { ok: false, status: 413 }
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(bytes)) as T }
  } catch {
    return { ok: false, status: 400 }
  }
}
