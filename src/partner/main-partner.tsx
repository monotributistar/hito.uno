import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PartnerProfile, { PartnerNotFound } from './PartnerProfile'
import { findPartner } from './partners'
import '../styles.css'
import './partner.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('No se encontro el contenedor #root para montar el perfil partner.')
}

/* El slug se resuelve en tres pasos, del mas explicito al mas tolerante:
   1. `data-partner` en el #root (lo que usa cada `p/<slug>/index.html`);
   2. el segmento de la URL `/p/<slug>`, por si la pagina se sirve sin el atributo;
   3. `?p=<slug>`, util para probar en local sin crear el HTML de la entrada. */
function resolveSlug(): string | null {
  const fromAttribute = container!.dataset.partner
  if (fromAttribute) return fromAttribute

  const segments = window.location.pathname.split('/').filter(Boolean)
  const pIndex = segments.indexOf('p')
  if (pIndex !== -1 && segments[pIndex + 1]) return segments[pIndex + 1]

  return new URLSearchParams(window.location.search).get('p')
}

const slug = resolveSlug()
const partner = findPartner(slug)

createRoot(container).render(
  <StrictMode>
    {partner ? <PartnerProfile partner={partner} /> : <PartnerNotFound slug={slug} />}
  </StrictMode>,
)
