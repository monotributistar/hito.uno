/* Lectura del catalogo desde una planilla.
   El "backend" del modulo Catalogo es una planilla de Google que edita el
   cliente: una fila por producto. La pagina la lee como CSV desde el
   navegador; no hay servidor en el medio. Para que funcione, la planilla
   tiene que estar compartida como "cualquiera con el enlace puede ver". */

export type CatalogItem = {
  name: string
  /** Texto libre: "12.500", "$ 12.500", "consultar". Vacio = sin precio. */
  price: string
  description: string
  photo: string
  available: boolean
}

/** URL de exportacion CSV de una planilla de Google. `sheet` es el nombre de
    la pestana; sin el, Google devuelve la primera. */
export function googleSheetCsvUrl(sheetId: string, sheet?: string): string {
  const base = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv`
  return sheet ? `${base}&sheet=${encodeURIComponent(sheet)}` : base
}

/** Un link de Drive "compartir" no sirve como <img src>. Lo convertimos a la
    miniatura publica, que si se puede embeber (el archivo tiene que estar
    compartido con enlace). Cualquier otra URL se devuelve tal cual. */
export function imageUrl(raw: string): string {
  const url = raw.trim()
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([A-Za-z0-9_-]{10,})/)
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` : url
}

/* Parser CSV minimo pero correcto: comillas, comas y saltos de linea dentro
   de comillas, comillas escapadas ("") y finales CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
      continue
    }
    if (ch === '"') inQuotes = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      rows.push(row); row = []
    } else field += ch
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/* Nombres de columna aceptados. La primera fila de la planilla es la
   cabecera; el orden no importa y las mayusculas/acentos tampoco. */
const COLUMNS: Record<keyof CatalogItem, string[]> = {
  name: ['nombre', 'producto', 'item', 'articulo'],
  price: ['precio', 'valor'],
  description: ['descripcion', 'detalle', 'texto'],
  photo: ['foto', 'imagen', 'url', 'link'],
  available: ['disponible', 'stock', 'activo'],
}

const FALSY = new Set(['no', 'false', '0', 'agotado', 'sin stock', 'oculto'])

export function csvToItems(text: string): CatalogItem[] {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const header = rows[0].map(normalizeHeader)
  const col = (key: keyof CatalogItem) => header.findIndex((h) => COLUMNS[key].includes(h))
  const idx = {
    name: col('name'), price: col('price'), description: col('description'),
    photo: col('photo'), available: col('available'),
  }
  if (idx.name === -1) throw new Error('La planilla no tiene columna "nombre".')

  const cell = (r: string[], i: number) => (i === -1 ? '' : (r[i] ?? '').trim())
  return rows.slice(1)
    .map((r) => ({
      name: cell(r, idx.name),
      price: cell(r, idx.price),
      description: cell(r, idx.description),
      photo: imageUrl(cell(r, idx.photo)),
      available: !FALSY.has(cell(r, idx.available).toLowerCase()),
    }))
    .filter((item) => item.name !== '')
}

/** "12500" → "$ 12.500"; cualquier otra cosa se muestra como esta escrita. */
export function formatPrice(price: string): string {
  const digits = price.replace(/[^\d,.]/g, '')
  if (!digits || !/^\d[\d.]*(,\d+)?$/.test(digits)) return price
  const n = Number(digits.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return price
  return `$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}
