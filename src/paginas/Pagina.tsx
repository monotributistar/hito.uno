/* Molde de las paginas comerciales.

   ESTE COMPONENTE ES DE UX 1. Lo que hay ahora es una estructura provisoria:
   dibuja los campos del contrato (`paginas-data.ts`) en el orden de la hoja de
   planteo —titulo, que incluye, prueba, precio, un solo boton de WhatsApp— con
   el estilo minimo para poder abrir la pagina y probar que la ruta, el puerto y
   la vista previa funcionan.

   UX 1 reescribe el cuerpo de este archivo y sus estilos. Mientras la forma de
   los datos no cambie, no hay que tocar ni los HTML de entrada ni
   `main-pagina.tsx`: por eso el molde vive en un solo lugar. Si hace falta un
   campo nuevo, se agrega al contrato y se avisa (el contrato es de PLAT). */

import { whatsappHref } from '../partner/links'
import type { Pagina as PaginaDatos } from './paginas-data'

export default function Pagina({ pagina }: { pagina: PaginaDatos }) {
  return (
    <main className="pagina">
      <h1 className="pagina-titulo">{pagina.titulo}</h1>
      {pagina.entrada ? <p className="pagina-entrada">{pagina.entrada}</p> : null}

      <ul className="pagina-incluye">
        {pagina.incluye.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {pagina.prueba ? (
        <section className="pagina-prueba">
          {pagina.prueba.tipo === 'foto' && pagina.prueba.src ? (
            <img src={pagina.prueba.src} alt={pagina.prueba.texto} loading="lazy" />
          ) : pagina.prueba.href ? (
            <a href={pagina.prueba.href}>{pagina.prueba.texto}</a>
          ) : (
            <p>{pagina.prueba.texto}</p>
          )}
        </section>
      ) : null}

      {/* Precio vacio: la hoja de planteo dice "consultá", no inventar un numero. */}
      <p className="pagina-precio">{pagina.precio?.trim() ? pagina.precio : 'Consultá'}</p>

      <a
        className="pagina-boton"
        href={whatsappHref(pagina.whatsapp.telefono, pagina.whatsapp.mensaje)}
      >
        Escribir por WhatsApp
      </a>
    </main>
  )
}
