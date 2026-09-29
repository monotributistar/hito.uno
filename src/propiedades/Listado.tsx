/* El listado de propiedades de un dueño: /alquileres/<dueno>.

   Es a donde lleva "Alquileres" desde el perfil. Cada tarjeta muestra lo que
   decide en la costa —foto, capacidad, zona y si acepta mascotas— y abre la
   pagina de esa propiedad.

   A proposito no tiene buscador ni filtros: con pocas propiedades estorban, y
   la gracia de esta pagina es que no compite con nadie adentro. */

import { propiedadesDe, type Propiedad } from './propiedades-data'
import './propiedad.css'

const ETIQUETA_ESTADO: Record<Propiedad['estado'], string> = {
  disponible: 'Disponible',
  reservada: 'Reservada',
  alquilada: 'Alquilada',
  vendida: 'Vendida',
}

export default function Listado({ dueno, titulo }: { dueno: string; titulo: string }) {
  const propiedades = propiedadesDe(dueno)

  return (
    <main className="listado">
      <header className="listado-cabecera">
        <h1>{titulo}</h1>
        <p>
          {propiedades.length === 1
            ? 'Una propiedad publicada.'
            : `${propiedades.length} propiedades publicadas.`}
        </p>
      </header>

      <ul className="listado-grilla">
        {propiedades.map((p) => (
          <li key={p.slug}>
            <a className="listado-casa" href={`/c/${p.slug}`}>
              <img src={p.fotos[0].src} alt={p.fotos[0].alt} loading="lazy" />
              <div className="listado-casa-cuerpo">
                <p className={`casa-estado casa-estado--${p.estado}`}>{ETIQUETA_ESTADO[p.estado]}</p>
                <h2>{p.nombre}</h2>
                <p className="listado-zona">{p.zona}</p>
                <ul className="casa-claves">
                  {p.capacidad ? <li>{p.capacidad}</li> : null}
                  {p.mascotas === 'si' ? <li className="casa-clave--si">Acepta mascotas</li> : null}
                </ul>
                <p className="listado-precio">{p.precio?.trim() ? p.precio : 'Consultá el precio'}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <footer className="casa-pie">
        <p>La dirección exacta de cada propiedad se pasa al coordinar la visita.</p>
      </footer>
    </main>
  )
}
