/* Entrada del listado de propiedades de un dueño. Una sola para todos: cada
   HTML (`alquileres/<dueno>/index.html`) carga este modulo y el dueño se elige
   por la ruta. */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Listado from './Listado'
import { duenoPorRuta, propiedadesDe } from './propiedades-data'
import { findPartner } from '../partner/partners'
import '../styles.css'

const dueno = duenoPorRuta(window.location.pathname)
const partner = findPartner(dueno)
const root = document.getElementById('root')

if (root && partner && propiedadesDe(dueno).length > 0) {
  createRoot(root).render(
    <StrictMode>
      <Listado dueno={dueno} publica={partner.name} />
    </StrictMode>,
  )
} else if (root) {
  root.innerHTML =
    '<main class="listado"><h1>No hay propiedades publicadas</h1>' +
    '<p><a href="/">Ir a Hito.uno</a></p></main>'
}
