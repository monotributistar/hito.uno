import { useEffect, useState, type CSSProperties } from 'react'
import PartnerIcon from './PartnerIcon'
import { androidContactHref, detectPlatform, vcardUrl, type ContactPlatform } from './contact'
import CatalogModule from './modules/CatalogModule'
import type { Partner, PartnerLink } from './partners'

/* Perfil publico de un partner. Es lo primero que ve alguien que apoyo el
   celular sobre el objeto NFC: tiene que cargar rapido y resolverse en un
   solo gesto, sin scroll obligatorio en mobile. */
export default function PartnerProfile({ partner }: { partner: Partner }) {
  // El titulo real se arma aca porque el HTML de entrada es generico.
  useEffect(() => {
    document.title = `${partner.name} · Hito.uno`
  }, [partner.name])

  // Un objeto puede apuntar a una seccion del perfil (ej. "Mi catalogo" es
  // /p/<slug>#catalog-<slug>). El navegador intenta ir al #ancla al cargar,
  // antes de que React monte la pagina, y no la encuentra: lo repetimos una
  // vez montada.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1))
    if (!hash) return
    requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: 'start' }))
  }, [])

  const primary = partner.links.filter((link) => link.primary)
  const secondary = partner.links.filter((link) => !link.primary)

  // El color propio del partner viaja como custom property: el CSS lo lee con
  // un fallback al coral de hito, asi que un partner sin `accent` no rompe.
  const theme = partner.accent
    ? ({ '--partner-accent': partner.accent } as CSSProperties)
    : undefined

  // Los modulos sin canal propio (ej. "Lo quiero" sin WhatsApp) caen al link
  // destacado del perfil, que es donde el partner quiere que le escriban.
  const fallbackHref = primary[0]?.href ?? partner.links[0]?.href

  return (
    <main className="partner-shell" style={theme}>
      <header className="partner-topbar">
        <a className="partner-brand" href="https://hito.uno">
          Hito.uno
        </a>
      </header>

      <article className="partner-card">
        <div className="partner-identity">
          {partner.photo ? (
            <img className="partner-avatar" src={partner.photo} alt="" width={104} height={104} />
          ) : (
            <div className="partner-avatar partner-avatar--monogram" aria-hidden="true">
              {partner.monogram}
            </div>
          )}
          <h1 className="partner-name">{partner.name}</h1>
          {partner.tagline ? <p className="partner-tagline">{partner.tagline}</p> : null}
          {partner.location ? (
            <p className="partner-location">
              <span className="partner-location-dot" aria-hidden="true" />
              {partner.location}
            </p>
          ) : null}
          {partner.bio ? <p className="partner-bio">{partner.bio}</p> : null}
        </div>

        <nav className="partner-links" aria-label={`Canales de contacto de ${partner.name}`}>
          {primary.map((link) => (
            <LinkButton key={link.href} link={link} primary />
          ))}
          {secondary.map((link) => (
            <LinkButton key={link.href} link={link} />
          ))}
        </nav>

        <ProfileActions partner={partner} />
      </article>

      {partner.modules?.map((mod, i) => {
        if (mod.type === 'catalogo') {
          return <CatalogModule key={`catalogo-${i}`} slug={partner.slug} config={mod} fallbackHref={fallbackHref} />
        }
        return null
      })}

      <footer className="partner-footer">
        <p className="partner-footer-line">Un objeto, un gesto, una experiencia.</p>
        <a className="partner-footer-link" href="https://hito.uno">
          Activado con Hito.uno
        </a>
      </footer>
    </main>
  )
}

/* Acciones de utilidad: guardar el contacto y compartir la pagina. Van
   debajo de los canales y con menos peso visual, para no competir con la
   accion principal del partner. */
function ProfileActions({ partner }: { partner: Partner }) {
  const [shareState, setShareState] = useState<'idle' | 'copiado' | 'error'>('idle')

  /* El destino del boton depende del telefono, y el user agent solo existe
     en el navegador: hasta saberlo servimos el archivo, que funciona en
     todos lados. */
  const [platform, setPlatform] = useState<ContactPlatform>('otro')
  const [contactHref, setContactHref] = useState(() => vcardUrl(partner))
  const [saveHelp, setSaveHelp] = useState(false)

  useEffect(() => {
    const detected = detectPlatform(navigator.userAgent)
    setPlatform(detected)
    setContactHref(
      detected === 'android' ? androidContactHref(partner, window.location.origin) : vcardUrl(partner),
    )
  }, [partner])

  const share = async () => {
    const url = `${window.location.origin}/p/${partner.slug}`
    const data = { title: partner.name, text: partner.tagline ?? partner.name, url }
    try {
      // En celular abre el menu de compartir del sistema; en escritorio casi
      // nunca existe, asi que copiamos el link al portapapeles.
      if (navigator.share) {
        await navigator.share(data)
        return
      }
      await navigator.clipboard.writeText(url)
      setShareState('copiado')
      setTimeout(() => setShareState('idle'), 2500)
    } catch (err) {
      // Cancelar el menu de compartir tambien entra por aca: no es un error.
      if ((err as Error)?.name === 'AbortError') return
      console.error('No se pudo compartir el perfil:', err)
      setShareState('error')
      setTimeout(() => setShareState('idle'), 2500)
    }
  }

  return (
    <div className="partner-actions">
      {/* Sin `download`: dejamos que el navegador abra la ficha de contacto,
          que es lo que hace iOS con un text/vcard servido inline. En Android
          el destino es un intent que abre la agenda (ver contact.ts). */}
      <a className="partner-action" href={contactHref} onClick={() => setSaveHelp(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
        Guardar contacto
      </a>

      <button type="button" className="partner-action" onClick={share}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="M12 16V4M8 8l4-4 4 4" />
        </svg>
        {shareState === 'copiado' ? 'Link copiado' : shareState === 'error' ? 'No se pudo' : 'Compartir'}
      </button>

      {/* Solo si hizo falta: en iOS la ficha se abre sola y explicarlo sobra.
          En Android aparece por si el navegador no entendio el intent y
          termino bajando el archivo; en escritorio, para avisar que se
          descargo algo. */}
      {saveHelp && platform !== 'ios' ? (
        <p className="partner-action-note" aria-live="polite">
          {platform === 'android'
            ? 'Si no se abrió tu agenda, la ficha quedó en Descargas: abrila y elegí Contactos.'
            : 'Se descargó la ficha de contacto. Abrila para agregarla a tu agenda.'}
        </p>
      ) : null}
    </div>
  )
}

function LinkButton({ link, primary = false }: { link: PartnerLink; primary?: boolean }) {
  // Un link a una seccion de la misma pagina (ej. "#catalog-<slug>") baja
  // hasta ahi; abrirlo en otra pestana no tendria sentido.
  const internal = link.href.startsWith('#')
  return (
    <a
      className={primary ? 'partner-link partner-link--primary' : 'partner-link'}
      href={link.href}
      target={internal ? undefined : '_blank'}
      rel={internal ? undefined : 'noreferrer noopener'}
    >
      <span className="partner-link-icon">
        <PartnerIcon kind={link.kind} />
      </span>
      <span className="partner-link-text">
        <span className="partner-link-label">{link.label}</span>
        {link.detail ? <span className="partner-link-detail">{link.detail}</span> : null}
      </span>
      <span className="partner-link-chevron" aria-hidden="true">
        →
      </span>
    </a>
  )
}

/* Estado explicito cuando el slug no corresponde a ningun partner cargado:
   preferimos decirlo antes que mostrar una pagina vacia. */
export function PartnerNotFound({ slug }: { slug: string | null }) {
  useEffect(() => {
    document.title = 'Perfil no encontrado · Hito.uno'
  }, [])

  return (
    <main className="partner-shell">
      <header className="partner-topbar">
        <a className="partner-brand" href="https://hito.uno">
          Hito.uno
        </a>
      </header>

      <article className="partner-card partner-card--empty">
        <h1 className="partner-name">Perfil no disponible</h1>
        <p className="partner-bio">
          {slug
            ? `No encontramos un perfil para "${slug}".`
            : 'Esta página no tiene un perfil asociado.'}{' '}
          Si llegaste hasta acá apoyando el celular sobre un objeto, escribinos y lo resolvemos.
        </p>
        <a className="partner-link partner-link--primary" href="https://hito.uno">
          <span className="partner-link-text">
            <span className="partner-link-label">Ir a Hito.uno</span>
          </span>
          <span className="partner-link-chevron" aria-hidden="true">
            →
          </span>
        </a>
      </article>
    </main>
  )
}
