/* Registro de perfiles partner.
   Cada perfil es el destino de un objeto (tarjeta, llavero, porta tarjetas)
   de un cliente: al escanear el QR o apoyar el celular, se abre
   `hito.uno/p/<slug>` y esta pagina muestra sus canales.

   Los datos viven en `partners.json`. Dar de alta un perfil es agregar una
   entrada ahi: el Worker (`worker/index.ts`) sirve cualquier `/p/<slug>` con
   la entrada generica `p/index.html`, asi que no hace falta crear HTML por
   cliente ni tocar `vite.config.ts`. Este modulo solo valida el JSON y arma
   los `href` (wa.me, instagram.com) a partir de los datos crudos. */

import registry from './partners.json'
import { instagramHref, whatsappHref, type PartnerLinkKind } from './links'

export { instagramHref, whatsappHref }
export type { PartnerLinkKind }
import type { CatalogConfig } from './modules/CatalogModule'

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

/* Modulos opcionales del perfil. Son lo que diferencia un escalon de otro
   en la oferta: un perfil Lite no tiene ninguno; uno Vitrina tiene catalogo.
   Cada tipo define su propia config; se agregan aca a medida que existen. */
export type PartnerModule = CatalogConfig

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
      Si no viene, la pagina usa el coral de hito. Tiene que ser legible tanto
      sobre el crema #eef1e8 como sobre el verde #17383a del boton principal. */
  accent?: string
  /** Perfil interno de prueba del equipo. No cambia nada en pantalla; sirve
      para distinguirlos de los clientes reales en el registro. */
  sandbox?: boolean
  links: PartnerLink[]
  /** Secciones debajo de los links, en el orden en que se declaran. */
  modules?: PartnerModule[]
}

/* Forma cruda de un link en `partners.json`: whatsapp lleva `phone`,
   instagram lleva `handle`, el resto lleva `href` ya armado. */
type RawLink = {
  kind: PartnerLinkKind
  label: string
  detail?: string
  primary?: boolean
  phone?: string
  handle?: string
  href?: string
}

type RawPartner = Omit<Partner, 'links'> & { links: RawLink[] }

/* Convierte un link crudo del JSON en un link listo para renderizar.
   Falla con un mensaje claro si faltan datos: preferimos que el build se
   rompa a que un boton del perfil de un cliente lleve a ningun lado. */
function buildLink(slug: string, raw: RawLink): PartnerLink {
  const base = { kind: raw.kind, label: raw.label, detail: raw.detail, primary: raw.primary }

  if (raw.kind === 'whatsapp') {
    if (!raw.phone) throw new Error(`Perfil "${slug}": el link de WhatsApp necesita "phone".`)
    return { ...base, href: whatsappHref(raw.phone), detail: raw.detail ?? raw.phone }
  }
  if (raw.kind === 'instagram') {
    if (!raw.handle) throw new Error(`Perfil "${slug}": el link de Instagram necesita "handle".`)
    const user = raw.handle.replace(/^@/, '')
    return { ...base, href: instagramHref(user), detail: raw.detail ?? `@${user}` }
  }
  if (!raw.href) throw new Error(`Perfil "${slug}": el link "${raw.label}" necesita "href".`)
  return { ...base, href: raw.href }
}

function validateModule(slug: string, mod: PartnerModule): PartnerModule {
  if (mod.type === 'catalogo') {
    if (!mod.sheetId && !mod.csvUrl) {
      throw new Error(`Perfil "${slug}": el modulo catalogo necesita "sheetId" o "csvUrl".`)
    }
    return mod
  }
  throw new Error(`Perfil "${slug}": tipo de modulo desconocido "${(mod as { type: string }).type}".`)
}

function buildPartner(raw: RawPartner): Partner {
  if (!/^[a-z0-9-]+$/.test(raw.slug)) {
    throw new Error(`Slug invalido "${raw.slug}": solo minusculas, numeros y guiones.`)
  }
  return {
    ...raw,
    links: raw.links.map((link) => buildLink(raw.slug, link)),
    modules: raw.modules?.map((mod) => validateModule(raw.slug, mod)),
  }
}

const partners: Partner[] = (registry.partners as RawPartner[]).map(buildPartner)

const slugs = new Set<string>()
for (const partner of partners) {
  if (slugs.has(partner.slug)) throw new Error(`Slug repetido en partners.json: "${partner.slug}".`)
  slugs.add(partner.slug)
}

/** Devuelve el partner del slug, o `null` si no existe (la pagina muestra un
    estado de error explicito en vez de romper). */
export function findPartner(slug: string | null | undefined): Partner | null {
  if (!slug) return null
  const normalized = slug.trim().toLowerCase()
  return partners.find((partner) => partner.slug === normalized) ?? null
}

export default partners
