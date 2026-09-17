/* Personaliza el <head> del perfil antes de mandarlo al navegador.

   Hay una sola entrada HTML para todos los perfiles (`p/index.html`), asi que
   sus etiquetas son genericas: quien comparte su link por WhatsApp ve
   "Perfil · hito.uno" y ninguna foto. WhatsApp, Instagram y los buscadores
   leen el HTML crudo y no ejecutan JavaScript, asi que ponerlo desde React
   no alcanza: hay que reescribir el HTML en el Worker.

   HTMLRewriter procesa el HTML mientras pasa, sin cargarlo en memoria. */

type RewriterElement = {
  setAttribute(name: string, value: string): void
  setInnerContent(content: string, options?: { html: boolean }): void
  append(content: string, options?: { html: boolean }): void
}
type Handlers = { element(element: RewriterElement): void }
type Rewriter = {
  on(selector: string, handlers: Handlers): Rewriter
  transform(response: Response): Response
}
declare const HTMLRewriter: { new (): Rewriter }

export type MetaPartner = {
  slug: string
  name: string
  tagline?: string
  bio?: string
  location?: string
  photo?: string
  /** Copia en JPEG de la foto, solo para la vista previa: WhatsApp y otros
      lectores de enlaces no siempre renderizan webp. Si no esta, se usa
      `photo` y en el peor caso la vista previa sale sin imagen. */
  photoOg?: string
}

/** Escapa lo que rompe un atributo HTML. */
function attr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** La linea que se lee debajo del titulo en la vista previa. La bio primero:
    es la que esta escrita para una persona. El resto es relleno. */
function describe(partner: MetaPartner): string {
  const text = partner.bio || partner.tagline || partner.location || ''
  // Las vistas previas cortan alrededor de los 160 caracteres.
  return text.length > 160 ? text.slice(0, 157).trimEnd() + '…' : text
}

export function withProfileMeta(
  response: Response,
  partner: MetaPartner,
  origin: string,
): Response {
  const title = `${partner.name} · hito.uno`
  const description = describe(partner) || 'Activado con hito.uno.'
  const pageUrl = `${origin}/p/${partner.slug}`
  const photo = partner.photoOg ?? partner.photo
  const image = photo ? `${origin}${photo}` : undefined

  const set = (value: string): Handlers => ({
    element(element) {
      element.setAttribute('content', value)
    },
  })

  return new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(title)
      },
    })
    .on('meta[name="description"]', set(description))
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(description))
    .on('head', {
      element(element) {
        /* og:url y og:image no estan en el HTML base (dependen del perfil),
           asi que se agregan aca. `twitter:card` con `summary` usa la foto
           cuadrada; `summary_large_image` recortaria una foto de perfil. */
        let extra = `<meta property="og:url" content="${attr(pageUrl)}" />`
        if (image) {
          extra += `<meta property="og:image" content="${attr(image)}" />`
          extra += `<meta property="og:image:alt" content="${attr(partner.name)}" />`
          // Las fotos de perfil son cuadradas de 400: declararlo evita que
          // algunos lectores descarten la imagen por no saber su tamano.
          extra += '<meta property="og:image:width" content="400" />'
          extra += '<meta property="og:image:height" content="400" />'
          extra += '<meta name="twitter:card" content="summary" />'
        }
        element.append(extra, { html: true })
      },
    })
    .transform(response)
}
