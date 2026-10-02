/* Molde de las paginas comerciales (/software, /comercios, /personal, /objetos).

   Una pagina, una conversacion: Stephano la manda por WhatsApp a alguien que
   tiene UN problema, y la pagina tiene que resolverlo de arriba abajo sin
   hablar de nada mas. Por eso el orden es fijo y sale de la hoja de planteo:

     1. El problema de esa persona (titulo), no la tecnologia.
     2. Que incluye, en lista corta y numerada.
     3. Una prueba: una foto real o algo que se puede abrir y tocar.
     4. Precio, o "Consultá" si todavia no hay uno definido.
     5. Un solo boton: WhatsApp con el mensaje ya escrito.

   El boton es uno solo a proposito. En mobile queda fijo al pie de la pantalla
   (es el mismo elemento, no una copia), asi acompaña todo el recorrido sin
   sumar un segundo llamado que compita con el primero.

   Los datos vienen de `paginas-data.ts` (el contrato es de PLAT). Este archivo
   y `pagina.css` son de UX: se cambia el diseño aca y vale para las cuatro.
   Documentado en docs/DISENO.md, seccion "Molde de las paginas". */

import { useEffect } from 'react'
import { whatsappHref } from '../partner/links'
import Foto from '../compartido/Foto'
import type { Pagina as PaginaDatos, PaginaPrueba } from './paginas-data'
import './pagina.css'

export default function Pagina({ pagina }: { pagina: PaginaDatos }) {
  // El HTML de entrada ya trae el titulo para la vista previa; lo repetimos
  // por si la pagina se abre desde una ruta con mayusculas o barra final.
  useEffect(() => {
    document.title = `${pagina.nombre} · Hito.uno`
  }, [pagina.nombre])

  const precio = pagina.precio?.trim()

  return (
    <div className="pagina">
      <header className="pagina-top">
        <a className="pagina-marca" href="/" aria-label="Hito.uno — Inicio">
          Hito<span>.uno</span>
        </a>
      </header>

      <main className="pagina-cuerpo">
        <section className="pagina-intro" aria-labelledby="pagina-titulo">
          <p className="pagina-kicker">{pagina.nombre}</p>
          <h1 id="pagina-titulo" className="pagina-titulo">
            {pagina.titulo}
          </h1>
          {pagina.entrada ? <p className="pagina-entrada">{pagina.entrada}</p> : null}
        </section>

        {/* Foto principal, o su hueco con la descripcion si todavia no esta. */}
        {pagina.imagen ? <Foto {...pagina.imagen} /> : null}

        <section className="pagina-bloque" aria-labelledby="pagina-incluye">
          <h2 id="pagina-incluye" className="pagina-subtitulo">
            Qué incluye
          </h2>
          <ol className="pagina-incluye">
            {pagina.incluye.map((item, i) => (
              <li key={item}>
                <span className="pagina-numero" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>

        {pagina.prueba ? <Prueba prueba={pagina.prueba} /> : null}

        <section className="pagina-bloque pagina-precio" aria-labelledby="pagina-precio">
          <h2 id="pagina-precio" className="pagina-subtitulo">
            Precio
          </h2>
          {/* Precio vacio no es un hueco: es la decision tomada mientras no haya
              numero. "Consultá" y una linea que diga por que. */}
          {precio ? (
            <p className="pagina-precio-valor">{precio}</p>
          ) : (
            <>
              <p className="pagina-precio-valor">Consultá</p>
              <p className="pagina-precio-nota">Depende de lo que necesites. Te lo pasamos por WhatsApp.</p>
            </>
          )}
        </section>
      </main>

      <div className="pagina-accion">
        <a
          className="pagina-boton"
          href={whatsappHref(pagina.whatsapp.telefono, pagina.whatsapp.mensaje)}
          target="_blank"
          rel="noreferrer noopener"
        >
          <span>Escribinos por WhatsApp</span>
          <span className="pagina-boton-flecha" aria-hidden="true">
            ↗
          </span>
        </a>
      </div>

      <footer className="pagina-pie">
        <p>Tecnología para la vida real.</p>
        <a href="/">Hito.uno</a>
      </footer>
    </div>
  )
}

/* La prueba es lo que convierte la pagina en algo creible: una foto de un
   objeto real, o un perfil funcionando que se puede abrir ahi mismo. */
function Prueba({ prueba }: { prueba: PaginaPrueba }) {
  if (prueba.tipo === 'foto' && prueba.src) {
    return (
      <figure className="pagina-bloque pagina-prueba-foto">
        <img src={prueba.src} alt={prueba.texto} loading="lazy" decoding="async" />
        <figcaption>{prueba.texto}</figcaption>
      </figure>
    )
  }

  if (prueba.tipo === 'enlace' && prueba.href) {
    return (
      <section className="pagina-bloque" aria-label="Un ejemplo funcionando">
        <a className="pagina-prueba-enlace" href={prueba.href} target="_blank" rel="noreferrer noopener">
          <span className="pagina-prueba-etiqueta">Miralo funcionando</span>
          <span className="pagina-prueba-texto">{prueba.texto}</span>
          <span className="pagina-prueba-flecha" aria-hidden="true">
            →
          </span>
        </a>
      </section>
    )
  }

  /* Prueba mal cargada (foto sin src o enlace sin href): error de datos, no de
     la persona que mira. No mostramos un bloque vacio; lo avisamos en consola
     para que se vea al probar en dev. */
  console.error('Prueba incompleta en la pagina:', prueba)
  return null
}
