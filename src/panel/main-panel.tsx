import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Panel from './Panel'
import '../styles.css'
import './panel.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('No se encontro el contenedor #root para montar el panel.')
}

/* El token viene en la URL (`/panel/<token>`). Se lee una vez y se queda en
   memoria: las llamadas a la API lo mandan por header, no por la URL, para
   que no quede en logs ni en el Referer. Tambien se acepta `?t=` para poder
   probar en local con `npm run dev`, donde no corre el Worker. */
function resolveToken(): string {
  const segments = window.location.pathname.split('/').filter(Boolean)
  const index = segments.indexOf('panel')
  if (index !== -1 && segments[index + 1]) return segments[index + 1]
  return new URLSearchParams(window.location.search).get('t') ?? ''
}

createRoot(container).render(
  <StrictMode>
    <Panel token={resolveToken()} />
  </StrictMode>,
)
