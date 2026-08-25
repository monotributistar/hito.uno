import { lazy, StrictMode, Suspense, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ExperienceStory from './ExperienceStory'
import { experiences, type ExperienceId } from './experience-data'
import './styles.css'

const CariloMap = lazy(() => import('./scene/CariloMap'))

function App() {
  const [activeExperience, setActiveExperience] = useState<ExperienceId>(experiences[0].id)
  const handleActiveChange = useCallback((id: ExperienceId) => setActiveExperience(id), [])

  return (
    <main className="site-shell">
      <div className="map-background" aria-hidden="true">
        <Suspense fallback={<div className="map-loading" />}>
          <CariloMap activeId={activeExperience} />
        </Suspense>
      </div>

      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="hito.uno — Inicio">
          hito<span>.uno</span>
        </a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#producto">Producto</a>
          <a href="#casos">Casos</a>
          <a className="nav-cta" href="#hablemos">Hablemos</a>
        </nav>
      </header>

      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="kicker">CARILÓ / 37.1611° S · 56.8998° O</p>
          <h1 id="hero-title">
            Un objeto.
            <br />
            Un gesto.
            <br />
            <em>Una experiencia.</em>
          </h1>
          <p className="hero-description">
            Convertimos objetos físicos en puntos de interacción digital.
            Experiencias simples que empiezan en el mundo real.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#producto">
              Probar una experiencia
              <span aria-hidden="true">↘</span>
            </a>
            <a className="secondary-action" href="#hablemos">
              Quiero un Hito
            </a>
          </div>
        </div>

        <div className="map-key" aria-hidden="true">
          <span className="map-key-line" />
          <span>Cartografía experimental 01</span>
        </div>
      </section>

      <ExperienceStory activeId={activeExperience} onActiveChange={handleActiveChange} />

      <section className="contact-section" id="hablemos" aria-labelledby="contact-title">
        <p className="kicker">PRÓXIMO PUNTO / TU NEGOCIO</p>
        <h2 id="contact-title">¿Dónde ponemos<br /><em>el próximo hito?</em></h2>
        <a className="primary-action" href="mailto:hola@hito.uno">
          Hablemos de una idea <span aria-hidden="true">↗</span>
        </a>
      </section>

      <a
        className="map-attribution"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        Map data © OpenStreetMap contributors · ODbL
      </a>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
