import { useEffect, useState, type CSSProperties } from 'react'
import { experiences, type ExperienceId } from '../experience-data'
import {
  doors,
  layers,
  needs,
  objects,
  stepsWithout,
  tapActions,
  tiers,
  useCases,
  type ObjectKey,
  type TapActionKey,
  type UseCaseKey,
} from './landing-data'

type Props = {
  onSceneFocusChange: (id: ExperienceId) => void
}

/* El formulario le habla a nuestro Worker (`/api/lead`), no a Google. El
   Worker guarda la consulta y despues se la reenvia a la planilla desde el
   servidor, asi que esta respuesta se puede leer de verdad: si dice que si,
   la consulta esta guardada. Ver worker/leads.ts. */
const LEAD_ENDPOINT = '/api/lead'

/* Encuadre calibrado por foto (ver Photo en landing-data.ts). object-position
   va inline; zoom y nudge viajan como custom properties que lee el CSS. */
function photoStyle(photo: { focus?: string; zoom?: number; nudge?: string }): CSSProperties | undefined {
  if (!photo.focus && !photo.zoom && !photo.nudge) return undefined
  return {
    objectPosition: photo.focus,
    ...(photo.zoom ? { ['--zoom' as string]: String(photo.zoom) } : {}),
    ...(photo.nudge ? { ['--nudge' as string]: photo.nudge } : {}),
  } as CSSProperties
}

export default function Landing({ onSceneFocusChange }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [useCase, setUseCase] = useState<UseCaseKey>('presentarme')
  const [tapAction, setTapAction] = useState<TapActionKey>('guardar-contacto')
  const [activeObject, setActiveObject] = useState<ObjectKey>('tarjeta')
  const [tapped, setTapped] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  // Estados del Formulario de Contacto
  const [contactData, setContactData] = useState({
    name: '',
    company: '',
    contact: '',
    notes: '',
    /* Trampa anti-spam: el campo esta escondido y una persona no lo ve. Si
       viene con algo, lo completo un bot y el Worker descarta el envio. */
    hp: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorText, setErrorText] = useState<string | null>(null)

  // Sincronizar foco del visor 3D al montar el componente
  useEffect(() => {
    onSceneFocusChange(useCases[useCase].sceneId)
  }, [])

  // CTA sticky (solo se ve en mobile por CSS): aparece cuando el hero ya
  // quedo atras, asi el "Pedi tu Hito" acompaña todo el recorrido.
  const [stickyVisible, setStickyVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setStickyVisible(window.scrollY > window.innerHeight * 0.8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const selectUseCase = (key: UseCaseKey) => {
    setUseCase(key)
    // Las acciones dependen del uso: si la elegida no aplica al uso nuevo,
    // se toma la mas relevante de ese uso.
    if (!useCases[key].actions.includes(tapAction)) setTapAction(useCases[key].actions[0])
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
    setPhotoIndex(0)
    onSceneFocusChange(objects[key].sceneId)
  }

  const object = objects[activeObject]
  const photoCount = object.photos.length
  const currentPhoto = photoCount > 0 ? object.photos[photoIndex] : null

  // Al tocar, si el soporte tiene foto de resultado el carrusel cruza a ella:
  // misma escena, pantalla ya resuelta. Sin resultPhoto solo cambia el texto.
  const showingResult = tapped && Boolean(object.resultPhoto)
  const visibleSrc = showingResult ? object.resultPhoto!.src : currentPhoto?.src

  // El resultado del toque pertenece a la foto que se estaba viendo:
  // cambiar de foto apaga el estado tocado.
  const goToPhoto = (index: number) => {
    setPhotoIndex(index)
    setTapped(false)
  }
  const nextPhoto = () => goToPhoto((photoIndex + 1) % photoCount)
  const prevPhoto = () => goToPhoto((photoIndex - 1 + photoCount) % photoCount)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setContactData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactData.name || !contactData.contact) return

    setStatus('submitting')

    const payload = {
      useCase: useCases[useCase].label,
      tapAction: tapActions[tapAction].label,
      // El Hito propuesto viaja en la columna "forma" de la planilla, que
      // quedo libre al sacar forma, tamano y terminacion del formulario.
      shape: useCases[useCase].object,
      ...contactData,
      pageUrl: window.location.pathname,
    }

    try {
      const response = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !data.ok) throw new Error(data.error ?? `HTTP ${response.status}`)
      setStatus('success')
    } catch (err) {
      console.error('Error al enviar la solicitud:', err)
      setErrorText(err instanceof Error ? err.message : null)
      setStatus('error')
    }
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="hito.uno — Inicio">
          hito<span>.uno</span>
        </a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#demo">Pedí tu Hito</a>
          <a href="#soportes">Soportes</a>
          <a href="#incluye">Qué incluye</a>
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
              Pedí tu Hito
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

      {/* Tres puertas: orientan por contexto y dejan el carrusel en el
          soporte que corresponde. Cada una baja a una seccion que ya existe. */}
      <section className="hito-doors" id="puertas" aria-label="Elegí tu contexto">
        <p className="card-eyebrow">Tres puertas / ¿cuál es la tuya?</p>
        <div className="hito-doors-grid">
          {doors.map((door) => (
            <a
              key={door.key}
              className={door.status === 'Foco comercial' ? 'hito-door hito-door--focus' : 'hito-door'}
              href={door.href}
              onClick={() => selectObject(door.object)}
            >
              <img
                className="hito-door-photo"
                src={door.photo.src}
                alt={door.photo.alt}
                loading="lazy"
                decoding="async"
                style={photoStyle(door.photo)}
              />
              <div className="hito-door-head">
                <p className="hito-door-label">{door.label}</p>
                <span className="hito-door-status">{door.status}</span>
              </div>
              <h3>{door.title}</h3>
              <p>{door.description}</p>
              <span className="hito-door-examples">{door.examples}</span>
              <span className="hito-door-arrow" aria-hidden="true">
                →
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="hito-configurator" id="demo" aria-labelledby="configurator-title">
        <aside className="experience-rail">
          <p className="kicker">PEDÍ TU HITO / CONFIGURADOR</p>
          <h2 id="configurator-title">
            Diseñamos
            <br />
            <em>tu primer hito.</em>
          </h2>
          <p className="rail-intro">
            Dos preguntas antes de pedirte un dato personal. Con eso preparamos una propuesta
            concreta de objeto y experiencia.
          </p>

          <div className="hito-step-head">
            <span className="hito-step-label">PASO {step} DE 3</span>
            <span className="hito-step-rule" aria-hidden="true" />
            <button
              type="button"
              className="hito-step-back"
              onClick={() => setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3)}
              disabled={step === 1}
            >
              Atrás
            </button>
          </div>

          <h3 className="hito-question">
            {step === 1 && '¿Para qué lo querés?'}
            {step === 2 && '¿Qué querés que pase al tocarlo?'}
            {step === 3 && '¿Cómo te contactamos?'}
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
                {useCases[useCase].actions.map((key) => (
                  <button
                    type="button"
                    key={key}
                    className={tapAction === key ? 'is-active' : ''}
                    aria-pressed={tapAction === key}
                    onClick={() => selectTapAction(key)}
                  >
                    {tapActions[key].label}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <>
                {status === 'success' ? (
                  <div className="hito-success-message">
                    <h4>¡Solicitud enviada!</h4>
                    <p>Nos pondremos en contacto pronto para preparar tu propuesta de Hito.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="hito-object-form">
                    <label className="hito-field">
                      <span>Tu nombre *</span>
                      <input
                        type="text"
                        name="name"
                        required
                        value={contactData.name}
                        onChange={handleInputChange}
                        placeholder="Ej. Juan Pérez"
                      />
                    </label>

                    <label className="hito-field">
                      <span>Empresa / Proyecto</span>
                      <input
                        type="text"
                        name="company"
                        value={contactData.company}
                        onChange={handleInputChange}
                        placeholder="Ej. Estudio Creativo"
                      />
                    </label>

                    <label className="hito-field">
                      <span>Email o WhatsApp *</span>
                      <input
                        type="text"
                        name="contact"
                        required
                        value={contactData.contact}
                        onChange={handleInputChange}
                        placeholder="+54 9... o correo"
                      />
                    </label>

                    {/* Trampa anti-spam: fuera de pantalla y fuera del
                        recorrido del teclado. Una persona no la ve nunca. */}
                    <div className="hito-hp" aria-hidden="true">
                      <label>
                        No completar este campo
                        <input
                          type="text"
                          name="hp"
                          tabIndex={-1}
                          autoComplete="off"
                          value={contactData.hp}
                          onChange={handleInputChange}
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="primary-action hito-submit"
                      disabled={status === 'submitting'}
                    >
                      {status === 'submitting' ? 'Enviando...' : 'Pedir mi Hito'}
                      <span aria-hidden="true">↗</span>
                    </button>

                    {status === 'error' && (
                      <p className="hito-error-text">
                        {errorText ?? 'Hubo un error al enviar. Intentá nuevamente.'}
                      </p>
                    )}
                  </form>
                )}
              </>
            )}
          </div>

          <p className="mock-note">
            Tu elección: {useCases[useCase].label} · {tapActions[tapAction].label}
          </p>
        </aside>

        <div className="hito-preview">
          <div className="card-index" aria-hidden="true">01</div>
          <p className="card-eyebrow">Tu primer hito / preview</p>
          <h3>{tapActions[tapAction].promise}</h3>
          <p className="card-description">{useCases[useCase].description}</p>
          <ol className="product-list">
            <li>
              <span className="marker-number">01</span>
              <span>
                <strong>{useCases[useCase].object}</strong>
                <small>El objeto que te proponemos</small>
              </span>
            </li>
            <li>
              <span className="marker-number">02</span>
              <span>
                <strong>{tapActions[tapAction].label}</strong>
                <small>Qué pasa al tocarlo</small>
              </span>
            </li>
            <li>
              <span className="marker-number">03</span>
              <span>
                <strong>{useCases[useCase].label}</strong>
                <small>Para qué lo usás</small>
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className="hito-steps" id="pasos" aria-labelledby="steps-title">
        <p className="card-eyebrow">Reducimos pasos / la idea</p>
        <h2 id="steps-title">
          Menos pasos entre una persona
          <br />
          <em>y lo que importa.</em>
        </h2>
        <div className="hito-steps-grid">
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
            <p className="kicker hito-kicker-accent">CON HITO</p>
            <ol className="product-list hito-single-step">
              <li>
                <span className="marker-number">01</span>
                <span>
                  <strong>Un toque</strong>
                  <small>El objeto ya sabe qué tiene que pasar.</small>
                </span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Explica el valor por necesidad, no por tecnologia. */}
      <section className="hito-needs" id="simplificar" aria-labelledby="needs-title">
        <p className="card-eyebrow">¿Qué querés simplificar?</p>
        <h2 id="needs-title">
          Lo que todos preguntan,
          <br />
          <em>resuelto en el objeto.</em>
        </h2>
        <ul className="hito-needs-grid">
          {needs.map((need) => (
            <li key={need.label} className="hito-need">
              <strong>{need.label}</strong>
              <span>{need.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="hito-supports" id="soportes" aria-labelledby="supports-title">
        <p className="card-eyebrow">Soportes / el sistema</p>
        <h2 id="supports-title">
          Una tarjeta es
          <br />
          <em>solo el primer hito.</em>
        </h2>

        <div className="carousel">
          <div className="business-selector hito-object-selector" aria-label="Elegir soporte">
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

          <div className="carousel-stage">
            {(object.resultPhoto ? [...object.photos, object.resultPhoto] : object.photos).map(
              (photo, index) => (
                <img
                  key={photo.src}
                  className={photo.src === visibleSrc ? 'carousel-photo is-current' : 'carousel-photo'}
                  src={photo.src}
                  alt={photo.alt}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  aria-hidden={photo.src !== visibleSrc}
                  style={photoStyle(photo)}
                />
              ),
            )}

            {photoCount === 0 ? (
              // Soporte sin fotos todavia (hoy: la placa). Un panel dibujado
              // en vez de un stage vacio: se ve intencional, no roto.
              <div className="carousel-empty" aria-hidden="true">
                <span className="carousel-empty-mark">{object.label}</span>
                <span className="carousel-empty-note">Foto en producción</span>
              </div>
            ) : null}

            <div className="carousel-scrim" aria-hidden="true" />

            <div className="carousel-copy">
              <p className="kicker">OBJETO · {object.label.toUpperCase()}</p>
              <h3 aria-live="polite">{tapped ? object.result : object.moment}</h3>
              <p className="carousel-description">
                {tapped ? 'El objeto ya sabía qué tenía que pasar. Un toque, un paso.' : object.blurb}
              </p>
              <div className="carousel-actions">
                <button type="button" className="primary-action" onClick={() => setTapped((value) => !value)}>
                  {tapped ? 'Reiniciar' : 'Un toque'}
                  <span aria-hidden="true">{tapped ? '↺' : '◦'}</span>
                </button>
                <span className={tapped ? 'carousel-signal is-live' : 'carousel-signal'} aria-hidden="true" />
              </div>
            </div>
          </div>

          {currentPhoto && (
            <div className="carousel-controls">
              <span className="carousel-count">
                {String(photoIndex + 1).padStart(2, '0')} / {String(photoCount).padStart(2, '0')}
              </span>

              <div className="carousel-rail" role="tablist" aria-label="Fotos del soporte">
                {object.photos.map((photo, index) => (
                  <button
                    type="button"
                    role="tab"
                    key={photo.src}
                    className={index === photoIndex ? 'is-current' : ''}
                    aria-selected={index === photoIndex}
                    aria-label={`Foto ${String(index + 1).padStart(2, '0')} · ${photo.caption}`}
                    onClick={() => goToPhoto(index)}
                  >
                    <span aria-hidden="true" />
                  </button>
                ))}
              </div>

              <span className="carousel-caption">{currentPhoto.caption}</span>

              <div className="carousel-arrows">
                <button type="button" onClick={prevPhoto} aria-label="Foto anterior">
                  ←
                </button>
                <button type="button" className="is-primary" onClick={nextPhoto} aria-label="Foto siguiente">
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Las tres capas del sistema y la escalera. Sin precios hasta que
          esten definidos; el panel de metricas es proximamente a proposito. */}
      <section className="hito-includes" id="incluye" aria-labelledby="includes-title">
        <p className="card-eyebrow">Qué incluye Hito / las tres capas</p>
        <h2 id="includes-title">
          Un objeto, un destino
          <br />
          <em>y alguien que lo mantiene.</em>
        </h2>
        <ol className="hito-layers">
          {layers.map((layer, index) => (
            <li key={layer.label} className="hito-layer">
              <span className="hito-layer-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="kicker" style={{ margin: 0 }}>{layer.label.toUpperCase()}</p>
              <h3>{layer.title}</h3>
              <p>{layer.description}</p>
              {layer.note ? <span className="hito-layer-note">{layer.note}</span> : null}
            </li>
          ))}
        </ol>

        <div className="hito-tiers" role="table" aria-label="Escalera de planes">
          <div className="hito-tiers-head" role="row">
            <span role="columnheader">Plan</span>
            <span role="columnheader">Objeto</span>
            <span role="columnheader">Destino</span>
            <span role="columnheader">Estado</span>
          </div>
          {tiers.map((tier) => (
            <div key={tier.label} className="hito-tier" role="row">
              <strong role="cell">{tier.label}</strong>
              <span role="cell">{tier.object}</span>
              <span role="cell">{tier.destination}</span>
              <span
                role="cell"
                className={tier.status === 'Disponible hoy' ? 'hito-tier-status hito-tier-status--now' : 'hito-tier-status'}
              >
                {tier.status}
              </span>
            </div>
          ))}
        </div>
        <p className="hito-tiers-note">
          El objeto se paga una vez. El destino y el servicio van por membresía mensual. Los precios se
          definen con vos según el caso.
        </p>
      </section>

      <section className="hito-cases" id="casos" aria-labelledby="cases-title">
        <p className="card-eyebrow">Casos / microhistorias</p>
        <h2 id="cases-title">
          El mismo principio,
          <br />
          <em>seis contextos.</em>
        </h2>
        <div className="hito-cases-grid">
          {experiences.map((experience) => (
            <article
              className="hito-case"
              key={experience.id}
              onMouseEnter={() => onSceneFocusChange(experience.id)}
              onFocus={() => onSceneFocusChange(experience.id)}
              tabIndex={0}
            >
              <p className="card-eyebrow">{experience.eyebrow}</p>
              <h3>{experience.title}</h3>
              <p className="card-description">{experience.description}</p>
              <ul className="hito-case-products">
                {experience.products.map((product) => (
                  <li key={product.label}>{product.label}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="hito-platform" id="plataforma" aria-labelledby="platform-title">
        <p className="card-eyebrow">Plataforma / el panel que viene con tu Hito</p>
        <h2 id="platform-title">
          Vos decidís qué pasa
          <br />
          <em>después del toque.</em>
        </h2>
        {/* Reproduce el panel real (`/panel/<token>`), no una maqueta con
            numeros de fantasia: el objeto, el campo de destino y las
            sugerencias son los que el cliente ve al entrar. */}
        <div className="hito-panel">
          <p className="kicker">TU HITO</p>
          <p className="hito-panel-object">
            Tarjeta Lite <span>t-tunombre-01</span>
          </p>
          <p className="hito-panel-label">Cuando alguien la toca, se abre:</p>
          <div className="hito-panel-field">
            <span>hito.uno/p/tunombre</span>
            <span className="hito-panel-save">Guardar</span>
          </div>
          <ul className="hito-panel-chips">
            <li>Mi página</li>
            <li>Mi WhatsApp</li>
            <li>Mi Instagram</li>
            <li>Mi catálogo</li>
          </ul>
          <p className="hito-panel-note">
            Cambia en el próximo toque. Sin app, sin cuenta y sin contraseña.
          </p>
        </div>
      </section>

      <section className="contact-section" id="hablemos" aria-labelledby="contact-title">
        <p className="kicker">PRÓXIMO PUNTO / TU NEGOCIO</p>
        <h2 id="contact-title">
          ¿Qué proceso de tu empresa querés
          <br />
          <em>reducir a un toque?</em>
        </h2>
        <a className="primary-action" href="#demo">
          Pedí tu Hito <span aria-hidden="true">↗</span>
        </a>
      </section>

      <a className={stickyVisible ? 'hito-sticky-cta is-visible' : 'hito-sticky-cta'} href="#demo">
        <strong>
          Pedí tu Hito
          <small>Tu página en 24 horas · sin app</small>
        </strong>
        <span aria-hidden="true">↗</span>
      </a>
    </>
  )
}
