import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Reservas from './Reservas'
import '../styles.css'
import './reservas.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('No se encontro el contenedor #root para montar la demo de reservas.')
}

createRoot(root).render(
  <StrictMode>
    <Reservas />
  </StrictMode>,
)
