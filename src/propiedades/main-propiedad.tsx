/* Entrada de las paginas de propiedad. Una sola para todas: cada HTML
   (`c/<slug>/index.html`) carga este modulo y la propiedad se elige por la
   ruta, como hacen las paginas comerciales. */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Propiedad from './Propiedad'
import { propiedadPorRuta } from './propiedades-data'
import '../styles.css'

const propiedad = propiedadPorRuta(window.location.pathname)
const root = document.getElementById('root')

if (root && propiedad) {
  createRoot(root).render(
    <StrictMode>
      <Propiedad propiedad={propiedad} />
    </StrictMode>,
  )
} else if (root) {
  /* Alguien llego por un QR impreso en un cartel: nunca una pantalla en blanco. */
  root.innerHTML =
    '<main class="casa"><h1>Esta propiedad ya no está publicada</h1>' +
    '<p><a href="/">Ir a Hito.uno</a></p></main>'
}
