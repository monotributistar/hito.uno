/* Registro de perfiles partner.
   Cada entrada es el destino de un objeto NFC de un cliente: al apoyar el
   celular, el chip abre `hito.uno/p/<slug>` y esta pagina muestra sus canales.

   Para dar de alta un partner nuevo hacen falta dos pasos:
   1. agregar su objeto `Partner` en `partners` (abajo);
   2. crear `p/<slug>/index.html` (copiando el de otro partner y cambiando el
      `data-partner`) y sumar esa entrada a `build.rollupOptions.input` en
      `vite.config.ts`. Sin el paso 2 la URL no existe como asset y Cloudflare
      devuelve la landing principal. */

export type PartnerLinkKind = 'whatsapp' | 'instagram' | 'facebook' | 'web' | 'email'

export type PartnerLink = {
  kind: PartnerLinkKind
  /** Texto principal del boton. */
  label: string
  /** Segunda linea opcional: el @usuario, el numero, el dominio. */
  detail?: string
  href: string
  /** El link destacado del perfil (uno solo por partner). */
  primary?: boolean
}

export type Partner = {
  slug: string
  name: string
  /** Que hace, en una linea. Va debajo del nombre, en mayusculas. */
  tagline?: string
  /** Ciudad o zona donde trabaja. */
  location?: string
  /** Parrafo corto debajo del nombre. Opcional. */
  bio?: string
  /** Iniciales para el avatar mientras no haya foto. */
  monogram: string
  /** Ruta a la foto de perfil dentro de `public/`. Opcional. */
  photo?: string
  /** Color propio del partner para acentos (flechas, halo, hover).
      Si no viene, la pagina usa el coral de hito. Tiene que legible tanto
      sobre el crema #eef1e8 como sobre el verde #17383a del boton principal:
      un tono medio saturado funciona, uno muy claro o muy oscuro no. */
  accent?: string
  links: PartnerLink[]
}

/** wa.me exige el numero en formato internacional y SOLO digitos: sin `+`,
    sin espacios, sin guiones. Normalizamos aca para que quien cargue un
    partner pueda escribirlo como quiera y el link salga siempre bien. */
export function whatsappHref(phone: string, presetMessage?: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) {
    throw new Error(`Numero de WhatsApp invalido: "${phone}"`)
  }
  const query = presetMessage ? `?text=${encodeURIComponent(presetMessage)}` : ''
  return `https://wa.me/${digits}${query}`
}

/** Acepta el handle con o sin `@`. */
export function instagramHref(handle: string): string {
  const user = handle.replace(/^@/, '').trim()
  return `https://instagram.com/${encodeURIComponent(user)}`
}

const partners: Partner[] = [
  {
    slug: 'danaarx',
    name: 'Dana Arcella',
    tagline: 'Club de viajes privado en cruceros',
    location: 'Pinamar, Argentina',
    monogram: 'DA',
    accent: '#0e7a91',
    links: [
      {
        kind: 'whatsapp',
        label: 'Escribime por WhatsApp',
        detail: '+54 9 223 582 4178',
        href: whatsappHref('+5492235824178'),
        primary: true,
      },
      {
        kind: 'instagram',
        label: 'Instagram',
        detail: '@danaarx',
        href: instagramHref('danaarx'),
      },
      {
        kind: 'facebook',
        label: 'Facebook',
        detail: 'Dana por el Mundo',
        href: 'https://www.facebook.com/61582912405547/',
      },
    ],
  },
]

/** Devuelve el partner del slug, o `null` si no existe (la pagina muestra un
    estado de error explicito en vez de romper). */
export function findPartner(slug: string | null | undefined): Partner | null {
  if (!slug) return null
  const normalized = slug.trim().toLowerCase()
  return partners.find((partner) => partner.slug === normalized) ?? null
}

export default partners
