import { lazy, StrictMode, Suspense, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import LandingV01 from './LandingV01'
import { experiences, type ExperienceId } from '../experience-data'
import '../styles.css'
import './landing-v01.css'

const CariloMap = lazy(() => import('../scene/CariloMap'))

function AppV01() {
  const [sceneFocus, setSceneFocus] = useState<ExperienceId>(experiences[0].id)
  const handleSceneFocusChange = useCallback((id: ExperienceId) => setSceneFocus(id), [])

  return (
    <main className="site-shell v01-shell">
      <div className="map-background" aria-hidden="true">
        <Suspense fallback={<div className="map-loading" />}>
          <CariloMap activeId={sceneFocus} />
        </Suspense>
      </div>

      <LandingV01 onSceneFocusChange={handleSceneFocusChange} />

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
    <AppV01 />
  </StrictMode>,
)
