/* La pagina de una propiedad.

   Orden pensado para alguien parado en la vereda: foto grande, nombre y zona,
   estado, precio, lo que tiene, el resto de las fotos y la consulta. Si la
   propiedad no esta disponible, se dice arriba y no se le hace completar un
   formulario al pedo.

   La consulta viaja al mismo `/api/lead` que la landing: el Worker la guarda
   y la reenvia a la planilla. No hace falta nada nuevo del lado del servidor. */

import { useState } from 'react'
import { whatsappHref } from '../partner/links'
import type { Propiedad as PropiedadDatos } from './propiedades-data'
import './propiedad.css'

const LEAD_ENDPOINT = '/api/lead'

const ETIQUETA_ESTADO: Record<PropiedadDatos['estado'], string> = {
  disponible: 'Disponible',
  reservada: 'Reservada',
  alquilada: 'Alquilada',
  vendida: 'Vendida',
}

export default function Propiedad({ propiedad }: { propiedad: PropiedadDatos }) {
  const [principal, setPrincipal] = useState(0)
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'listo' | 'error'>('idle')
  const [datos, setDatos] = useState({
    nombre: '',
    contacto: '',
    desde: '',
    hasta: '',
    personas: '',
    cuando: '',
    mensaje: '',
    hp: '',
  })
  const temporario = propiedad.modo === 'temporario'
  const libre = propiedad.estado === 'disponible'
  const foto = propiedad.fotos[principal]

  const cambiar = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setDatos((prev) => ({ ...prev, [name]: value }))
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!datos.nombre || !datos.contacto) return
    setEstado('enviando')

    /* El detalle de la consulta viaja en `notes`, que es el campo libre que el
       Worker ya acepta: asi esta pagina no necesita campos nuevos en la API. */
    const detalle = temporario
      ? [
          datos.desde && `Del ${datos.desde} al ${datos.hasta || 'sin fecha de salida'}`,
          datos.personas && `${datos.personas} personas`,
          datos.mensaje,
        ]
      : [datos.cuando && `Quiere visitar: ${datos.cuando}`, datos.mensaje]

    try {
      const respuesta = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: datos.nombre,
          contact: datos.contacto,
          notes: detalle.filter(Boolean).join(' · '),
          useCase: temporario ? 'Consulta de alquiler' : 'Consulta de venta',
          shape: propiedad.nombre,
          pageUrl: window.location.pathname,
          hp: datos.hp,
        }),
      })
      const json = (await respuesta.json()) as { ok?: boolean }
      if (!respuesta.ok || !json.ok) throw new Error('no se pudo enviar')
      setEstado('listo')
    } catch {
      setEstado('error')
    }
  }

  return (
    <main className="casa">
      <figure className="casa-principal">
        <img src={foto.src} alt={foto.alt} />
        <figcaption>{foto.alt}</figcaption>
      </figure>

      <header className="casa-cabecera">
        <p className={`casa-estado casa-estado--${propiedad.estado}`}>
          {ETIQUETA_ESTADO[propiedad.estado]}
        </p>
        <h1>{propiedad.nombre}</h1>
        <p className="casa-zona">{propiedad.zona}</p>
        {/* Capacidad y mascotas arriba: son las dos preguntas que deciden una
            consulta en la costa, antes incluso que el precio. */}
        {propiedad.capacidad || propiedad.mascotas ? (
          <ul className="casa-claves">
            {propiedad.capacidad ? <li>{propiedad.capacidad}</li> : null}
            {propiedad.mascotas === 'si' ? <li className="casa-clave--si">Acepta mascotas</li> : null}
            {propiedad.mascotas === 'no' ? <li>No acepta mascotas</li> : null}
          </ul>
        ) : null}
        <p className="casa-precio">{propiedad.precio?.trim() ? propiedad.precio : 'Consultá el precio'}</p>
        {propiedad.precioNota ? <p className="casa-precio-nota">{propiedad.precioNota}</p> : null}
        <p className="casa-descripcion">{propiedad.descripcion}</p>
      </header>

      <ul className="casa-datos">
        {propiedad.datos.map((dato) => (
          <li key={dato.etiqueta}>
            <span>{dato.etiqueta}</span>
            <strong>{dato.valor}</strong>
          </li>
        ))}
      </ul>

      {propiedad.servicios.length > 0 ? (
        <section className="casa-servicios" aria-labelledby="casa-servicios-titulo">
          <h2 id="casa-servicios-titulo">Lo que tiene</h2>
          <ul>
            {propiedad.servicios.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* El contacto a mitad de camino: el que ya se convencio con las fotos y
          lo que tiene no deberia tener que seguir bajando. */}
      {libre ? (
        <a
          className="casa-whatsapp casa-whatsapp--medio"
          href={whatsappHref(propiedad.whatsapp.telefono, propiedad.whatsapp.mensaje)}
        >
          Consultar por WhatsApp
        </a>
      ) : null}

      {propiedad.fotos.length > 1 ? (
        <section className="casa-galeria" aria-label="Más fotos">
          {propiedad.fotos.map((f, i) => (
            <button
              key={f.src}
              type="button"
              className={i === principal ? 'is-actual' : undefined}
              onClick={() => setPrincipal(i)}
              aria-label={`Ver: ${f.alt}`}
            >
              <img src={f.src} alt="" loading="lazy" />
            </button>
          ))}
        </section>
      ) : null}

      <section className="casa-consulta" id="consultar" aria-labelledby="casa-consulta-titulo">
        <h2 id="casa-consulta-titulo">{libre ? 'Consultar' : 'Esta propiedad no está disponible'}</h2>

        {!libre ? (
          <p className="casa-aviso">
            Si querés que te avisemos cuando se libere, o ver otras parecidas, escribinos.
          </p>
        ) : estado === 'listo' ? (
          <p className="casa-aviso">Recibimos tu consulta. Te contestamos por donde nos dejaste.</p>
        ) : (
          <form onSubmit={enviar}>
            {temporario ? (
              <div className="casa-fechas">
                <label>
                  <span>Llegada</span>
                  <input type="date" name="desde" value={datos.desde} onChange={cambiar} />
                </label>
                <label>
                  <span>Salida</span>
                  <input type="date" name="hasta" value={datos.hasta} onChange={cambiar} />
                </label>
                <label>
                  <span>Personas</span>
                  <input type="number" name="personas" min="1" value={datos.personas} onChange={cambiar} />
                </label>
              </div>
            ) : (
              <label>
                <span>¿Cuándo querés visitarla?</span>
                <input type="text" name="cuando" value={datos.cuando} onChange={cambiar} placeholder="Ej. esta semana, a la tarde" />
              </label>
            )}

            <label>
              <span>Tu nombre *</span>
              <input type="text" name="nombre" required value={datos.nombre} onChange={cambiar} />
            </label>
            <label>
              <span>WhatsApp o email *</span>
              <input type="text" name="contacto" required value={datos.contacto} onChange={cambiar} />
            </label>
            <label>
              <span>Algo más que quieras contarnos</span>
              <textarea name="mensaje" rows={3} value={datos.mensaje} onChange={cambiar} />
            </label>

            {/* Trampa anti-spam, igual que en la landing: una persona no la ve. */}
            <div className="casa-hp" aria-hidden="true">
              <label>
                No completar
                <input type="text" name="hp" tabIndex={-1} autoComplete="off" value={datos.hp} onChange={cambiar} />
              </label>
            </div>

            <button type="submit" disabled={estado === 'enviando'}>
              {estado === 'enviando' ? 'Enviando…' : 'Enviar consulta'}
            </button>
            {estado === 'error' ? (
              <p className="casa-aviso">No se pudo enviar. Probá por WhatsApp acá abajo.</p>
            ) : null}
          </form>
        )}

        <a
          className="casa-whatsapp"
          href={whatsappHref(propiedad.whatsapp.telefono, propiedad.whatsapp.mensaje)}
        >
          Escribir por WhatsApp
        </a>
      </section>

      <footer className="casa-pie">
        <p>Publica: {propiedad.publica}</p>
        <p>La dirección exacta se pasa al coordinar la visita.</p>
      </footer>
    </main>
  )
}
