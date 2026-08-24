import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

function App() {
  return (
    <main className="page">
      <section className="card" aria-labelledby="title">
        <span className="eyebrow">hito.uno</span>
        <h1 id="title">Hello, world!</h1>
        <p>React ya está funcionando sobre Cloudflare Workers.</p>
        <a href="https://github.com/monotributistar/hito.uno">
          Ver el proyecto en GitHub
        </a>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
