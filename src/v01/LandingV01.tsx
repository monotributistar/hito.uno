import { useMemo, useState } from 'react'
import { experiences, type ExperienceId } from '../experience-data'
import {
  finishes,
  objects,
  shapes,
  sizes,
  stepsWithout,
  tapActions,
  useCases,
  type ObjectKey,
  type TapActionKey,
  type UseCaseKey,
} from './v01-data'

type Props = {
  onSceneFocusChange: (id: ExperienceId) => void
}

const CONTACT_EMAIL = 'hola@hito.uno'

export default function LandingV01({ onSceneFocusChange }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [useCase, setUseCase] = useState<UseCaseKey>('networking')
  const [tapAction, setTapAction] = useState<TapActionKey>('guardar-contacto')
  const [shape, setShape] = useState(shapes[0])
  const [size, setSize] = useState(sizes[0])
  const [finish, setFinish] = useState(finishes[0])
  const [activeObject, setActiveObject] = useState<ObjectKey>('tarjeta')
  const [tapped, setTapped] = useState(false)

  const selectUseCase = (key: UseCaseKey) => {
    setUseCase(key)
    setStep(2)
    onSceneFocusChange(useCases[key].sceneId)
  }

  const selectTapAction = (key: TapActionKey) => {
    setTapAction(key)
    setStep(3)
  }

  const selectObject = (key: ObjectKey) => {
    setActiveObject(key)
    setTapped(false)
    onSceneFocusChange(objects[key].sceneId)
  }

  const object = objects[activeObject]

  const mailtoHref = useMemo(() => {
    const lines = [
      `Uso: ${useCases[useCase].label}`,
      `Al tocarla: ${tapActions[tapAction].label}`,
      `Forma: ${shape}`,
      `Tamaño: ${size}`,
      `Terminación: ${finish}`,
      '',
      'Nombre:',
      'Empresa:',
      'Contacto:',
      'Cantidad aproximada:',
      'Idea libre:',
    ]
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Mi primer Hito')}&body=${encodeURIComponent(lines.join('\n'))}`
  }, [useCase, tapAction, shape, size, finish])

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="hito.uno — Inicio">
          hito<span>.uno</span>
        </a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#demo">Pedí tu demo</a>
          <a href="#pasos">Reducimos pasos</a>
          <a href="#soportes">Soportes</a>
          <a className="nav-cta" href="#hablemos">Hablemos</a>
        </nav>
      </header>

      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="kicker">TARJETAS PERSONALES HITO / 01</p>
          <h1 id="hero-title">
            Tu tarjeta.
            <br />
            A un toque
            <br />
            <em>de distancia.</em>
          </h1>
          <p className="hero-description">
            Diseñamos tarjetas físicas personalizadas que conectan directamente con la acción que
            necesitás. La primera es el punto de partida del sistema.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#demo">
              Pedí tu demo
              <span aria-hidden="true">↘</span>
            </a>
            <a className="secondary-action" href="#pasos">
              Cómo funciona
            </a>
          </div>
        </div>
        <div className="map-key" aria-hidden="true">
          <span className="map-key-line" />
          <span>Cartografía experimental 01</span>
        </div>
      </section>

      <section className="v01-configurator" id="demo" aria-labelledby="configurator-title">
        <aside className="experience-rail">
          <p className="kicker">PEDÍ TU DEMO / CONFIGURADOR</p>
          <h2 id="configurator-title">
            Diseñamos
            <br />
            <em>tu primer hito.</em>
          </h2>
          <p className="rail-intro">
            Tres preguntas antes de pedirte un dato personal. Con eso preparamos una propuesta
            concreta de objeto y experiencia.
          </p>

          <div className="v01-step-head">
            <span className="v01-step-label">PASO {step} DE 3</span>
            <span className="v01-step-rule" aria-hidden="true" />
            <button
              type="button"
              className="v01-step-back"
              onClick={() => setStep((current) => (current === 1 ? 1 : ((current - 1) as 1 | 2)))}
              disabled={step === 1}
            >
              Atrás
            </button>
          </div>

          <h3 className="v01-question">
            {step === 1 && '¿Para qué la querés?'}
            {step === 2 && '¿Qué querés que pase al tocarla?'}
            {step === 3 && '¿Cómo imaginás el objeto?'}
          </h3>

          <div aria-live="polite">
            {step === 1 && (
              <div className="business-selector">
                {Object.entries(useCases).map(([key, item]) => (
                  <button
                    type="button"
                    key={key}
                    className={useCase === key ? 'is-active' : ''}
                    aria-pressed={useCase === key}
                    onClick={() => selectUseCase(key as UseCaseKey)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="business-selector">
                {Object.entries(tapActions).map(([key, item]) => (
                  <button
                    type="button"
                    key={key}
                    className={tapAction === key ? 'is-active' : ''}
                    aria-pressed={tapAction === key}
                    onClick={() => selectTapAction(key as TapActionKey)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="v01-object-form">
                <label className="v01-field">
                  <span>Forma</span>
                  <select value={shape} onChange={(event) => setShape(event.target.value)}>
                    {shapes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="v01-field">
                  <span>Tamaño</span>
                  <select value={size} onChange={(event) => setSize(event.target.value)}>
                    {sizes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="v01-field">
                  <span>Terminación</span>
                  <select value={finish} onChange={(event) => setFinish(event.target.value)}>
                    {finishes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <a className="primary-action v01-submit" href={mailtoHref}>
                  Pedir mi demo
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            )}
          </div>

          <p className="mock-note">
            Tu elección: {useCases[useCase].label} · {tapActions[tapAction].label}
          </p>
        </aside>

        <div className="v01-preview">
          <div className="card-index" aria-hidden="true">01</div>
          <p className="card-eyebrow">Tu primer hito / preview</p>
          <h3>{tapActions[tapAction].promise}</h3>
          <p className="card-description">{useCases[useCase].description}</p>
          <ol className="product-list">
            <li>
              <span className="marker-number">01</span>
              <span>
                <strong>{shape} · {size}</strong>
                <small>Terminación {finish.toLowerCase()}</small>
              </span>
            </li>
            <li>
              <span className="marker-number">02</span>
              <span>
                <strong>{tapActions[tapAction].label}</strong>
                <small>Acción al activar el objeto</small>
              </span>
            </li>
            <li>
              <span className="marker-number">03</span>
              <span>
                <strong>{useCases[useCase].label}</strong>
                <small>Contexto de uso declarado</small>
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className="v01-steps" id="pasos" aria-labelledby="steps-title">
        <p className="card-eyebrow">Reducimos pasos / la idea</p>
        <h2 id="steps-title">
          Menos pasos entre una persona
          <br />
          <em>y lo que importa.</em>
        </h2>
        <div className="v01-steps-grid">
          <div>
            <p className="kicker">SIN HITO</p>
            <ol className="product-list">
              {stepsWithout.map((label, index) => (
                <li key={label}>
                  <span className="marker-number is-muted">{String(index + 1).padStart(2, '0')}</span>
                  <span>
                    <strong>{label}</strong>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="kicker v01-kicker-accent">CON HITO</p>
            <ol className="product-list v01-single-step">
              <li>
                <span className="marker-number">01</span>
                <span>
                  <strong>Un toque</strong>
                  <small>El objeto ya sabe qué tiene que pasar.</small>
                </span>
              </li>
            </ol>
            <p className="mock-note">
              Los cinco pasos colapsan sobre el punto coral al entrar en viewport. Mismo gesto que la
              activación del objeto.
            </p>
          </div>
        </div>
      </section>

      <section className="v01-supports" id="soportes" aria-labelledby="supports-title">
        <p className="card-eyebrow">Soportes / el sistema</p>
        <h2 id="supports-title">
          Una tarjeta es
          <br />
          <em>solo el primer hito.</em>
        </h2>

        <div className="business-selector v01-object-selector" aria-label="Elegir soporte">
          {Object.entries(objects).map(([key, item]) => (
            <button
              type="button"
              key={key}
              className={activeObject === key ? 'is-active' : ''}
              aria-pressed={activeObject === key}
              onClick={() => selectObject(key as ObjectKey)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="v01-activation">
          <div className="v01-object">
            <p className="kicker">OBJETO · {object.label.toUpperCase()}</p>
            <p className="card-description">{object.moment}</p>
            <button type="button" className="primary-action" onClick={() => setTapped((value) => !value)}>
              {tapped ? 'Reiniciar' : 'Un toque'}
              <span aria-hidden="true">◦</span>
            </button>
          </div>

          <div className="v01-signal" aria-hidden="true">
            <span className="v01-dot" />
            <span className="v01-line" />
          </div>

          <div className="v01-phone" aria-live="polite">
            <span className="v01-phone-notch" aria-hidden="true" />
            <p className="kicker">{tapped ? 'EXPERIENCIA ACTIVA' : 'PANTALLA EN ESPERA'}</p>
            <p className="v01-phone-result">{tapped ? object.result : '—'}</p>
            <span className="secondary-action v01-phone-action">Acción</span>
          </div>
        </div>
      </section>

      <section className="v01-cases" id="casos" aria-labelledby="cases-title">
        <p className="card-eyebrow">Casos / microhistorias</p>
        <h2 id="cases-title">
          El mismo principio,
          <br />
          <em>seis contextos.</em>
        </h2>
        <div className="v01-cases-grid">
          {experiences.map((experience) => (
            <article
              className="v01-case"
              key={experience.id}
              onMouseEnter={() => onSceneFocusChange(experience.id)}
              onFocus={() => onSceneFocusChange(experience.id)}
              tabIndex={0}
            >
              <p className="card-eyebrow">{experience.eyebrow}</p>
              <h3>{experience.title}</h3>
              <p className="card-description">{experience.description}</p>
              <ul className="v01-case-products">
                {experience.products.map((product) => (
                  <li key={product.label}>{product.label}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="v01-platform" id="plataforma" aria-labelledby="platform-title">
        <p className="card-eyebrow">Plataforma / vista conceptual, en desarrollo</p>
        <h2 id="platform-title">
          Vos decidís qué pasa
          <br />
          <em>después del toque.</em>
        </h2>
        <div className="v01-panel">
          <nav className="v01-panel-nav" aria-label="Secciones del panel (maqueta)">
            <span className="is-current">Mis hitos</span>
            <span>Destinos</span>
            <span>Contenido</span>
            <span>Activaciones</span>
          </nav>
          <div className="v01-panel-body">
            <div className="v01-metrics">
              <div>
                <p className="kicker">HITOS ACTIVOS</p>
                <strong>24</strong>
              </div>
              <div>
                <p className="kicker">ACTIVACIONES</p>
                <strong>1.482</strong>
              </div>
              <div>
                <p className="kicker">ACCIONES</p>
                <strong className="is-accent">316</strong>
              </div>
            </div>
            <div className="v01-panel-table">Lista de hitos · objeto / destino / estado</div>
          </div>
        </div>
      </section>

      <section className="contact-section" id="hablemos" aria-labelledby="contact-title">
        <p className="kicker">PRÓXIMO PUNTO / TU NEGOCIO</p>
        <h2 id="contact-title">
          ¿Qué proceso de tu empresa querés
          <br />
          <em>reducir a un toque?</em>
        </h2>
        <a className="primary-action" href={mailtoHref}>
          Pedí tu demo <span aria-hidden="true">↗</span>
        </a>
      </section>
    </>
  )
}
