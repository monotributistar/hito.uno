/* Demo de sistema de reservas: la pagina de una propiedad inventada y su
   formulario de consulta.

   Es la prueba que acompaña a la pagina de Software a medida: un propietario
   de alquiler temporario la abre en el celular, hace una consulta de prueba y
   ve como le quedaria su propia pagina.

   NO GUARDA NI MANDA NADA. Ni a una planilla, ni al almacen del Worker, ni a
   Google. Es publica y la gente va a probar con sus datos reales: no hay que
   retenerlos, no abre una puerta al spam y no carga el almacen. Por eso la
   franja de arriba lo dice siempre, y el resumen del final no dice "enviado".

   Tres vistas, elegidas por el hash de la URL para que el boton "atras" del
   celular funcione como se espera:
     (sin hash)  la propiedad
     #consulta   el formulario
     #resumen    asi le llegaria al propietario

   Las consultas de la visita se acumulan en memoria para mostrar la planilla
   creciendo renglon por renglon. Solo en memoria: ni localStorage ni nada que
   sobreviva a cerrar la pestaña. */

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { COLUMNAS, filaPlanilla, type Fila } from './planilla'
import { PROPIEDAD } from './propiedad'
import {
  FORMULARIO_VACIO,
  LARGO_MAXIMO,
  hoyLocal,
  noches,
  validar,
  type Campo,
  type Errores,
  type FormularioReserva,
} from './validar'

type Vista = 'propiedad' | 'consulta' | 'resumen'

function vistaDeHash(hash: string): Vista {
  if (hash === '#consulta') return 'consulta'
  if (hash === '#resumen') return 'resumen'
  return 'propiedad'
}

/** Franjas de llegada: una hora exacta no la sabe nadie de antemano. */
const LLEGADAS = ['Antes de las 12', 'De 12 a 16', 'De 16 a 20', 'Después de las 20']

/** "2026-10-10" -> "sábado 10 de octubre". Se arma sobre la fecha local para
    no correrla un dia con la zona horaria. */
function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  if (!a || !m || !d) return iso
  // toLocaleDateString pone "sábado, 10 de octubre": la coma sobra en una frase.
  return new Date(a, m - 1, d)
    .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(',', '')
}

/** Una consulta completada en esta visita: lo que se cargo y su renglon. */
type Consulta = { datos: FormularioReserva; fila: Fila }

export default function Reservas() {
  const [vista, setVista] = useState<Vista>(() => vistaDeHash(window.location.hash))
  const [datos, setDatos] = useState<FormularioReserva>(FORMULARIO_VACIO)
  const [consultas, setConsultas] = useState<Consulta[]>([])

  useEffect(() => {
    const alCambiar = () => setVista(vistaDeHash(window.location.hash))
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  // Sin consultas no hay nada que mostrarle al propietario (por ejemplo, al recargar).
  useEffect(() => {
    if (vista === 'resumen' && consultas.length === 0) window.location.hash = '#consulta'
  }, [vista, consultas.length])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [vista])

  return (
    <div className="demo">
      <p className="demo-franja" role="note">
        <strong>Demo</strong> · propiedad ficticia · no se envía nada
      </p>

      {vista === 'propiedad' ? <VistaPropiedad /> : null}
      {vista === 'consulta' ? (
        <VistaConsulta
          datos={datos}
          onCambio={setDatos}
          onListo={() => {
            setConsultas((previas) => [...previas, { datos, fila: filaPlanilla(datos, new Date()) }])
            window.location.hash = '#resumen'
          }}
        />
      ) : null}
      {vista === 'resumen' && consultas.length ? (
        <VistaResumen
          consultas={consultas}
          onOtra={() => {
            setDatos(FORMULARIO_VACIO)
            window.location.hash = '#consulta'
          }}
        />
      ) : null}

      <footer className="demo-pie">
        Demo hecha por{' '}
        <a href="/software">
          Hito<span className="demo-marca-uno">.uno</span>
        </a>
      </footer>
    </div>
  )
}

/* --- La propiedad -------------------------------------------------------- */

function VistaPropiedad() {
  const p = PROPIEDAD
  return (
    <main className="demo-cuerpo">
      <Fotos />
      <h1 className="demo-titulo">{p.nombre}</h1>
      <p className="demo-ubicacion">{p.ubicacion}</p>
      <p className="demo-texto">{p.descripcion}</p>

      <section className="demo-bloque" aria-labelledby="demo-tiene">
        <h2 id="demo-tiene" className="demo-subtitulo">
          Lo que tiene
        </h2>
        <ul className="demo-lista">
          <li>Hasta {p.capacidad} personas</li>
          {p.ambientes.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <ul className="demo-lista demo-lista--servicios">
          {p.servicios.map((s) => (
            <li key={s}>{s}</li>
          ))}
          {p.aceptaMascotas ? <li>Se aceptan mascotas</li> : null}
        </ul>
      </section>

      <a className="demo-boton" href="#consulta">
        Consultar
      </a>
    </main>
  )
}

/** Una o dos fotos. Cada una ocupa su lugar con la misma proporcion haya o no
    imagen, asi la pagina no salta cuando lleguen.

    Una foto sin imagen se muestra como placeholder con la descripcion de lo
    que va a mostrar, y el aviso "Imagen pendiente" a la vista: nunca como si
    fuera una foto real. La marca de placeholder vive en el dato de cada foto
    (propiedad.ts), no aca: este componente sirve igual el dia que esten todas,
    y una marca aca frenaria el pase a produccion para siempre. */
function Fotos() {
  return (
    <div className="demo-fotos">
      {PROPIEDAD.fotos.slice(0, 2).map((f) =>
        f.src ? (
          <figure key={f.descripcion} className="demo-foto">
            <img src={f.src} alt={f.alt} loading="lazy" />
            <figcaption className="demo-foto-nota">Imagen ilustrativa</figcaption>
          </figure>
        ) : (
          <figure key={f.descripcion} className="demo-foto demo-foto--pendiente">
            <figcaption>
              <span className="demo-foto-pendiente-rotulo">Imagen pendiente</span>
              <span className="demo-foto-pendiente-texto">{f.descripcion}</span>
            </figcaption>
          </figure>
        ),
      )}
    </div>
  )
}

/* --- El formulario ------------------------------------------------------- */

function VistaConsulta({
  datos,
  onCambio,
  onListo,
}: {
  datos: FormularioReserva
  onCambio: (d: FormularioReserva) => void
  onListo: () => void
}) {
  const hoy = hoyLocal()
  const [errores, setErrores] = useState<Errores>({})
  /* Los errores se muestran recien despues del primer intento de enviar:
     marcar en rojo un campo que la persona todavia no llego a completar es
     retarla antes de tiempo. Desde ahi, se recalculan con cada cambio. */
  const [intentado, setIntentado] = useState(false)
  const formulario = useRef<HTMLFormElement>(null)

  const revisar = (d: FormularioReserva) =>
    validar(d, PROPIEDAD.capacidad, PROPIEDAD.aceptaMascotas, hoyLocal())

  const cambiar = <K extends Campo>(campo: K, valor: FormularioReserva[K]) => {
    const nuevos = { ...datos, [campo]: valor }
    onCambio(nuevos)
    if (intentado) setErrores(revisar(nuevos))
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const encontrados = revisar(datos)
    setErrores(encontrados)
    setIntentado(true)
    const primero = Object.keys(encontrados)[0]
    if (primero) {
      // Llevar a la persona al primer error, no dejarla buscando.
      formulario.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus()
      return
    }
    onListo()
  }

  // La salida arranca el dia despues de la llegada, si ya hay llegada.
  const salidaMinima = datos.entrada ? diaSiguiente(datos.entrada) : diaSiguiente(hoy)
  const n = noches(datos.entrada, datos.salida)

  return (
    <main className="demo-cuerpo">
      <a className="demo-volver" href="#">
        ← {PROPIEDAD.nombre}
      </a>
      <h1 className="demo-titulo">Consultá disponibilidad</h1>
      <p className="demo-texto">Contanos cuándo y cuántos vienen. Te responde el propietario.</p>

      <form ref={formulario} className="demo-form" onSubmit={enviar} noValidate>
        <fieldset className="demo-grupo">
          <legend className="demo-subtitulo">Quiénes viajan</legend>
          <div className="demo-fila">
            <Casilla campo="adultos" etiqueta="Adultos" error={errores.adultos}>
              <input
                id="adultos"
                name="adultos"
                type="number"
                inputMode="numeric"
                min={1}
                max={PROPIEDAD.capacidad}
                value={datos.adultos}
                onChange={(e) => cambiar('adultos', e.target.value)}
                {...conError('adultos', errores)}
              />
            </Casilla>
            <Casilla campo="menores" etiqueta="Menores" error={errores.menores}>
              <input
                id="menores"
                name="menores"
                type="number"
                inputMode="numeric"
                min={0}
                max={PROPIEDAD.capacidad - 1}
                value={datos.menores}
                onChange={(e) => cambiar('menores', e.target.value)}
                {...conError('menores', errores)}
              />
            </Casilla>
          </div>
          <p className="demo-ayuda">La casa es para {PROPIEDAD.capacidad} personas en total, contando a los menores.</p>
        </fieldset>

        <fieldset className="demo-grupo">
          <legend className="demo-subtitulo">Fechas</legend>
          <div className="demo-fila demo-fila--fechas">
            <Casilla campo="entrada" etiqueta="Llegada" error={errores.entrada}>
              <input
                id="entrada"
                name="entrada"
                type="date"
                min={hoy}
                value={datos.entrada}
                onChange={(e) => cambiar('entrada', e.target.value)}
                {...conError('entrada', errores)}
              />
            </Casilla>
            <Casilla campo="salida" etiqueta="Salida" error={errores.salida}>
              <input
                id="salida"
                name="salida"
                type="date"
                min={salidaMinima}
                value={datos.salida}
                onChange={(e) => cambiar('salida', e.target.value)}
                {...conError('salida', errores)}
              />
            </Casilla>
          </div>
          {n !== null && n > 0 ? (
            <p className="demo-ayuda">
              {n} {n === 1 ? 'noche' : 'noches'}
            </p>
          ) : null}
          <Casilla campo="llegada" etiqueta="Horario estimado de llegada (opcional)">
            <select
              id="llegada"
              name="llegada"
              value={datos.llegada}
              onChange={(e) => cambiar('llegada', e.target.value)}
            >
              <option value="">Todavía no sé</option>
              {LLEGADAS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Casilla>
        </fieldset>

        <fieldset className="demo-grupo">
          <legend className="demo-subtitulo">Lo que necesitan</legend>
          <label className="demo-tilde">
            <input
              name="mascota"
              type="checkbox"
              checked={datos.mascota}
              onChange={(e) => cambiar('mascota', e.target.checked)}
              {...conError('mascota', errores)}
            />
            Viajamos con mascota
          </label>
          {errores.mascota ? (
            <p id="error-mascota" className="demo-error">
              {errores.mascota}
            </p>
          ) : null}
          {datos.mascota ? (
            <Casilla campo="mascotaCual" etiqueta="¿Qué mascota?" error={errores.mascotaCual}>
              <input
                id="mascotaCual"
                name="mascotaCual"
                type="text"
                maxLength={LARGO_MAXIMO.mascotaCual}
                placeholder="Por ejemplo: un perro mediano"
                value={datos.mascotaCual}
                onChange={(e) => cambiar('mascotaCual', e.target.value)}
                {...conError('mascotaCual', errores)}
              />
            </Casilla>
          ) : null}
          <label className="demo-tilde">
            <input
              name="cochera"
              type="checkbox"
              checked={datos.cochera}
              onChange={(e) => cambiar('cochera', e.target.checked)}
            />
            Necesitamos cochera
          </label>
          <Casilla campo="comentario" etiqueta="Algo más que quieras contar (opcional)" error={errores.comentario}>
            <textarea
              id="comentario"
              name="comentario"
              rows={3}
              maxLength={LARGO_MAXIMO.comentario}
              value={datos.comentario}
              onChange={(e) => cambiar('comentario', e.target.value)}
              {...conError('comentario', errores)}
            />
          </Casilla>
        </fieldset>

        <fieldset className="demo-grupo">
          <legend className="demo-subtitulo">Tus datos</legend>
          <Casilla campo="nombre" etiqueta="Nombre" error={errores.nombre}>
            <input
              id="nombre"
              name="nombre"
              type="text"
              autoComplete="name"
              maxLength={LARGO_MAXIMO.nombre}
              value={datos.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
              {...conError('nombre', errores)}
            />
          </Casilla>
          <Casilla campo="contacto" etiqueta="Teléfono o email" error={errores.contacto}>
            <input
              id="contacto"
              name="contacto"
              type="text"
              autoComplete="tel"
              maxLength={LARGO_MAXIMO.contacto}
              value={datos.contacto}
              onChange={(e) => cambiar('contacto', e.target.value)}
              {...conError('contacto', errores)}
            />
          </Casilla>
        </fieldset>

        <button className="demo-boton" type="submit">
          Consultar
        </button>
        <p className="demo-ayuda demo-ayuda--centro">Es una demo: esta consulta no le llega a nadie.</p>
      </form>
    </main>
  )
}

/** Etiqueta, campo y error, siempre juntos y en ese orden. */
function Casilla({
  campo,
  etiqueta,
  error,
  children,
}: {
  campo: Campo
  etiqueta: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className={error ? 'demo-casilla demo-casilla--error' : 'demo-casilla'}>
      <label className="demo-etiqueta" htmlFor={campo}>
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p id={`error-${campo}`} className="demo-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Atributos para que un lector de pantalla anuncie el error del campo. */
function conError(campo: Campo, errores: Errores) {
  return errores[campo] ? { 'aria-invalid': true, 'aria-describedby': `error-${campo}` } : {}
}

/** "3 personas (2 adultos, 1 menor)". Sin menores, no se nombran. */
function quienesViajan(adultos: number, menores: number, total: number): string {
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
  const detalle = menores
    ? `${plural(adultos, 'adulto', 'adultos')}, ${plural(menores, 'menor', 'menores')}`
    : plural(adultos, 'adulto', 'adultos')
  return `${plural(total, 'persona', 'personas')} (${detalle})`
}

function diaSiguiente(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return hoyLocal(new Date(a, m - 1, d + 1))
}

/* --- Asi le llegaria al propietario -------------------------------------- */

/* Tres partes, en el orden en que el propietario las viviria: lo que pidio la
   persona, el renglon que le cae en su planilla (junto con los de las pruebas
   anteriores de esta visita) y el aviso. */
function VistaResumen({ consultas, onOtra }: { consultas: Consulta[]; onOtra: () => void }) {
  const ultima = consultas[consultas.length - 1]
  return (
    <main className="demo-cuerpo">
      <h1 className="demo-titulo">Así le llegaría al propietario</h1>
      <p className="demo-aviso">En esta demo no se envió nada: nadie la va a recibir.</p>

      <section className="demo-seccion" aria-labelledby="demo-pidio">
        <h2 id="demo-pidio" className="demo-subtitulo">
          Lo que pidió
        </h2>
        <Pedido datos={ultima.datos} />
      </section>

      <section className="demo-seccion" aria-labelledby="demo-planilla">
        <h2 id="demo-planilla" className="demo-subtitulo">
          Su planilla
        </h2>
        <p className="demo-ayuda">
          Cada consulta cae como un renglón nuevo, ya ordenada.
          {consultas.length > 1
            ? ` Esta visita lleva ${consultas.length} consultas de prueba.`
            : ' Probá otra y mirá cómo se suma.'}
        </p>
        <Planilla filas={consultas.map((c) => c.fila)} />
      </section>

      {/* PLACEHOLDER: el aviso al propietario. Stephano decidio (2026-09-21) no
          mostrar ningun canal (ni email ni WhatsApp) hasta definirlo: el bloque
          queda visible, atenuado y sin promesa. Con esta marca, la demo no sube
          a produccion. */}
      <section className="demo-seccion demo-placeholder" aria-label="Aviso al propietario, a definir">
        <p className="demo-placeholder-texto">Aviso al propietario · a definir</p>
      </section>

      <button className="demo-boton demo-boton--secundario" type="button" onClick={onOtra}>
        Probar otra consulta
      </button>
      <a className="demo-volver demo-volver--abajo" href="#">
        Volver a {PROPIEDAD.nombre}
      </a>
    </main>
  )
}

/** La consulta como la leeria una persona: fechas largas, sin abreviar. */
function Pedido({ datos }: { datos: FormularioReserva }) {
  const n = noches(datos.entrada, datos.salida)
  const personas = Number(datos.adultos) + Number(datos.menores)
  return (
    <dl className="demo-resumen">
      <dt>Quién</dt>
      <dd>
        {datos.nombre} · {datos.contacto}
      </dd>
      <dt>Cuándo</dt>
      <dd>
        Del {fechaLarga(datos.entrada)} al {fechaLarga(datos.salida)} ({n} {n === 1 ? 'noche' : 'noches'})
      </dd>
      <dt>Cuántos</dt>
      <dd>{quienesViajan(Number(datos.adultos), Number(datos.menores), personas)}</dd>
      {datos.llegada ? (
        <>
          <dt>Llegada</dt>
          <dd>{datos.llegada}</dd>
        </>
      ) : null}
      <dt>Mascota</dt>
      <dd>{datos.mascota ? datos.mascotaCual : 'No'}</dd>
      <dt>Cochera</dt>
      <dd>{datos.cochera ? 'Sí' : 'No'}</dd>
      {datos.comentario ? (
        <>
          <dt>Comentario</dt>
          <dd>{datos.comentario}</dd>
        </>
      ) : null}
    </dl>
  )
}

/** La planilla del propietario, con el renglon mas nuevo marcado.

    Es ancha a proposito: tiene las columnas que tendria su Google Sheet. En
    el celular se desliza de costado DENTRO de su caja, sin que la pagina entera
    se corra. */
function Planilla({ filas }: { filas: Fila[] }) {
  return (
    <div className="demo-planilla" role="region" aria-label="Planilla del propietario" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {COLUMNAS.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className={i === filas.length - 1 ? 'demo-planilla-nueva' : undefined}>
              {COLUMNAS.map((c) => (
                <td key={c}>{fila[c]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
