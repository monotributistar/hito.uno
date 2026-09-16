/* Genera el archivo de contacto (.vcf) de un perfil.

   Se sirve desde la pagina (`/p/<slug>/contacto.vcf`) y no se escribe en el
   chip del objeto, por dos razones: en el chip los datos quedan congelados y
   cambiarlos obliga a reimprimir, y iOS no lee bien un vCard escrito en el
   chip salvo con una app de lectura ya abierta. Con una URL anda en todos.

   vCard 3.0 a proposito: 4.0 es el estandar actual, pero 3.0 lo leen mejor
   las agendas viejas de Android y iOS lo acepta igual. Sin foto: pesa y no
   hace falta para guardar un contacto. */

type RawLink = {
  kind: string
  label: string
  detail?: string
  phone?: string
  handle?: string
  href?: string
}

export type VCardPartner = {
  slug: string
  name: string
  tagline?: string
  location?: string
  bio?: string
  links?: RawLink[]
}

/** Escapa lo que en vCard tiene significado: `\`, `;`, `,` y los saltos. */
function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** El formato pide cortar a los 75 octetos y continuar con un espacio. Las
    agendas modernas toleran lineas largas, pero las viejas no. */
function fold(line: string): string {
  if (line.length <= 74) return line
  const parts = [line.slice(0, 74)]
  let rest = line.slice(74)
  while (rest.length > 73) {
    parts.push(' ' + rest.slice(0, 73))
    rest = rest.slice(73)
  }
  if (rest) parts.push(' ' + rest)
  return parts.join('\r\n')
}

/** "Stephano Arcella" -> { nombre: "Stephano", apellido: "Arcella" } */
function splitName(full: string): { given: string; family: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return { given: parts[0], family: '' }
  return { given: parts.slice(0, -1).join(' '), family: parts[parts.length - 1] }
}

export function buildVCard(partner: VCardPartner, origin: string): string {
  const { given, family } = splitName(partner.name)
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(family)};${esc(given)};;;`,
    `FN:${esc(partner.name)}`,
  ]

  if (partner.tagline) lines.push(`TITLE:${esc(partner.tagline)}`)

  const phone = partner.links?.find((l) => l.kind === 'whatsapp' && l.phone)?.phone
  if (phone) {
    // Solo digitos y el `+`: una agenda no quiere espacios ni guiones.
    const clean = '+' + phone.replace(/\D/g, '')
    lines.push(`TEL;TYPE=CELL,VOICE:${clean}`)
  }

  const email = partner.links?.find((l) => l.kind === 'email')
  if (email?.href) {
    lines.push(`EMAIL;TYPE=INTERNET:${esc(email.href.replace(/^mailto:/, ''))}`)
  }

  // La pagina del perfil primero: es la que se mantiene al dia.
  lines.push(`URL:${origin}/p/${partner.slug}`)

  /* Cada red como una URL etiquetada. El par `itemN.URL` + `itemN.X-ABLabel`
     es la convencion de Apple y Android la ignora sin romperse. */
  let item = 1
  for (const link of partner.links ?? []) {
    let url: string | undefined
    let label: string | undefined
    if (link.kind === 'instagram' && link.handle) {
      url = `https://instagram.com/${link.handle.replace(/^@/, '')}`
      label = 'Instagram'
    } else if (link.kind === 'facebook' && link.href) {
      url = link.href
      label = 'Facebook'
    } else if (link.kind === 'web' && link.href?.startsWith('http')) {
      url = link.href
      label = link.label
    }
    if (!url || !label) continue
    lines.push(`item${item}.URL:${esc(url)}`)
    lines.push(`item${item}.X-ABLabel:${esc(label)}`)
    item++
  }

  if (partner.location) {
    /* Sin calle ni numero: el perfil solo publica ciudad y pais. El formato
       los quiere en campos distintos, asi que cortamos por la ultima coma
       ("Cariló, Argentina" -> ciudad + pais). */
    const parts = partner.location.split(',').map((p) => p.trim()).filter(Boolean)
    const country = parts.length > 1 ? parts[parts.length - 1] : ''
    const city = parts.length > 1 ? parts.slice(0, -1).join(', ') : partner.location
    lines.push(`ADR;TYPE=WORK:;;;${esc(city)};;;${esc(country)}`)
  }

  const note = [partner.bio, `Activado con hito.uno`].filter(Boolean).join(' ')
  lines.push(`NOTE:${esc(note)}`)
  lines.push(`REV:${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}`)
  lines.push('END:VCARD')

  // CRLF: lo pide el formato y algunas agendas se plantan sin el.
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Nombre de archivo seguro: "Stephano Arcella" -> "stephano-arcella.vcf" */
export function vcardFilename(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'contacto'}.vcf`
}
