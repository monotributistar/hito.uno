import { useEffect, useRef } from 'react'
import { experiences, type ExperienceId } from './experience-data'

type Props = {
  activeId: ExperienceId
  onActiveChange: (id: ExperienceId) => void
}

export default function ExperienceStory({ activeId, onActiveChange }: Props) {
  const sections = useRef<(HTMLElement | null)[]>([])
  const selector = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const id = visible?.target.getAttribute('data-experience') as ExperienceId | null
        if (id) onActiveChange(id)
      },
      { rootMargin: '-30% 0px -42%', threshold: [0, 0.2, 0.55] },
    )

    sections.current.forEach((section) => section && observer.observe(section))
    return () => observer.disconnect()
  }, [onActiveChange])

  useEffect(() => {
    const activeButton = selector.current?.querySelector<HTMLButtonElement>(`[data-business="${activeId}"]`)
    activeButton?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeId])

  const goTo = (id: ExperienceId) => {
    document.getElementById(`caso-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="experience-story" id="producto" aria-labelledby="experience-title">
      <aside className="experience-rail">
        <p className="kicker">RECORRIDO / PRODUCTOS</p>
        <h2 id="experience-title">Un mapa.<br /><em>Distintos hitos.</em></h2>
        <p className="rail-intro">Elegí un tipo de negocio o recorré la escena. Cada punto señala un producto posible.</p>

        <div className="business-selector" aria-label="Elegir tipo de negocio" ref={selector}>
          {experiences.map((experience, index) => (
            <button
              type="button"
              key={experience.id}
              data-business={experience.id}
              className={activeId === experience.id ? 'is-active' : ''}
              aria-current={activeId === experience.id ? 'step' : undefined}
              onClick={() => goTo(experience.id)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {experience.shortLabel}
            </button>
          ))}
        </div>

        <p className="mock-note">Ubicaciones demostrativas sobre cartografía real de Cariló.</p>
      </aside>

      <div className="experience-cases" id="casos">
        {experiences.map((experience, index) => (
          <article
            className={`experience-card ${activeId === experience.id ? 'is-active' : ''}`}
            id={`caso-${experience.id}`}
            data-experience={experience.id}
            key={experience.id}
            ref={(element) => { sections.current[index] = element }}
            aria-labelledby={`title-${experience.id}`}
          >
            <div className="card-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
            <p className="card-eyebrow">{experience.eyebrow}</p>
            <h3 id={`title-${experience.id}`}>{experience.title}</h3>
            <p className="card-description">{experience.description}</p>
            <ol className="product-list">
              {experience.products.map((product, productIndex) => (
                <li key={product.label}>
                  <span className="marker-number">{String(productIndex + 1).padStart(2, '0')}</span>
                  <span>
                    <strong>{product.label}</strong>
                    <small>{product.description}</small>
                  </span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  )
}
