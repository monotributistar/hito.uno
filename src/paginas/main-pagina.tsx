/* Entrada de las cuatro paginas comerciales. Es UNA sola: cada HTML
   (`software/index.html`, `comercios/index.html`, ...) carga este modulo y la
   pagina se elige por la ruta, como ya hace `/p/<slug>` con el perfil. Asi
   agregar una pagina no es agregar un archivo mas de codigo. */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Pagina from './Pagina'
import { paginaDe } from './paginas-data'
import '../styles.css'

const pagina = paginaDe(window.location.pathname)
const root = document.getElementById('root')

if (root && pagina) {
  createRoot(root).render(
    <StrictMode>
      <Pagina pagina={pagina} />
    </StrictMode>,
  )
} else if (root) {
  /* No deberia pasar: cada HTML de entrada existe porque hay una entrada en
     `PAGINAS` con esa ruta. Si pasa, la persona llego por un QR impreso y no
     puede terminar en una pantalla en blanco. */
  root.innerHTML =
    '<main class="pagina"><h1>Esta página todavía no está</h1>' +
    '<p><a href="/">Ir a Hito.uno</a></p></main>'
}
