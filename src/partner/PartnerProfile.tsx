import { useEffect, type CSSProperties } from 'react'
import PartnerIcon from './PartnerIcon'
import type { Partner } from './partners'

/* Perfil publico de un partner. Es lo primero que ve alguien que apoyo el
   celular sobre el objeto NFC: tiene que cargar rapido y resolverse en un
   solo gesto, sin scroll obligatorio en mobile. */
export default function PartnerProfile({ partner }: { partner: Partner }) {
  // El titulo real se arma aca porque el HTML de entrada es generico.
  useEffect(() => {
    document.title = `${partner.name} · hito.uno`
  }, [partner.name])

  const primary = partner.links.filter((link) => link.primary)
  const secondary = partner.links.filter((link) => !link.primary)

  // El color propio del partner viaja como custom property: el CSS lo lee con
  // un fallback al coral de hito, asi que un partner sin `accent` no rompe.
  const theme = partner.accent
    ? ({ '--partner-accent': partner.accent } as CSSProperties)
    : undefined

  return (
    <main className="partner-shell" style={theme}>
      <header className="partner-topbar">
        <a className="partner-brand" href="https://hito.uno">
          hito.uno
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
            <a
              key={link.href}
              className="partner-link partner-link--primary"
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
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
          ))}

          {secondary.map((link) => (
            <a
              key={link.href}
              className="partner-link"
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
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
          ))}
        </nav>
      </article>

      <footer className="partner-footer">
        <p className="partner-footer-line">Un objeto, un gesto, una experiencia.</p>
        <a className="partner-footer-link" href="https://hito.uno">
          Activado con hito.uno
        </a>
      </footer>
    </main>
  )
}

/* Estado explicito cuando el slug no corresponde a ningun partner cargado:
   preferimos decirlo antes que mostrar una pagina vacia. */
export function PartnerNotFound({ slug }: { slug: string | null }) {
  useEffect(() => {
    document.title = 'Perfil no encontrado · hito.uno'
  }, [])

  return (
    <main className="partner-shell">
      <header className="partner-topbar">
        <a className="partner-brand" href="https://hito.uno">
          hito.uno
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
            <span className="partner-link-label">Ir a hito.uno</span>
          </span>
          <span className="partner-link-chevron" aria-hidden="true">
            →
          </span>
        </a>
      </article>
    </main>
  )
}
