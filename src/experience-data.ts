export type ExperienceId =
  | 'bar'
  | 'inmobiliaria'
  | 'pizzeria'
  | 'alojamiento'
  | 'comercio'
  | 'estudio-juridico'

export type Experience = {
  id: ExperienceId
  shortLabel: string
  eyebrow: string
  title: string
  description: string
  focus: [number, number]
  zoom: number
  products: {
    label: string
    description: string
    marker: [number, number]
  }[]
}

export const experiences: Experience[] = [
  {
    id: 'bar',
    shortLabel: 'Bar',
    eyebrow: 'Hospitalidad / 01',
    title: 'Una ronda que vuelve.',
    description: 'Objetos cotidianos que abren la carta, activan beneficios y convierten una mesa en un punto de contacto.',
    focus: [370, -850],
    zoom: 9.2,
    products: [
      { label: 'Apoyavasos NFC', description: 'Carta, promos o playlist con un gesto.', marker: [357, -878] },
      { label: 'Placa de mesa', description: 'Pedido, Wi-Fi y llamado al personal.', marker: [385, -842] },
      { label: 'Tarjeta de fidelidad', description: 'Un acceso simple para volver.', marker: [411, -815] },
    ],
  },
  {
    id: 'inmobiliaria',
    shortLabel: 'Inmobiliaria',
    eyebrow: 'Propiedades / 02',
    title: 'La visita empieza antes.',
    description: 'Cada soporte conecta la propiedad, el asesor y la información útil sin obligar a instalar una app.',
    focus: [500, -205],
    zoom: 10,
    products: [
      { label: 'Placa de propiedad', description: 'Ficha, recorrido y consulta inmediata.', marker: [488, -209] },
      { label: 'Tarjeta del asesor', description: 'Contacto y agenda siempre actualizados.', marker: [509, -194] },
      { label: 'Llavero de visita', description: 'Documentación y próximos pasos.', marker: [493, -204] },
    ],
  },
  {
    id: 'pizzeria',
    shortLabel: 'Pizzería',
    eyebrow: 'Gastronomía / 03',
    title: 'La caja también conversa.',
    description: 'Del mostrador al delivery: piezas físicas que impulsan una próxima compra y hacen visible la historia de la marca.',
    focus: [350, 315],
    zoom: 9.8,
    products: [
      { label: 'Packaging interactivo', description: 'Recompra y contenido desde la caja.', marker: [379, 295] },
      { label: 'Apoyavasos NFC', description: 'Menú y promociones del día.', marker: [352, 311] },
      { label: 'Tarjeta de beneficios', description: 'Una porción más para quienes vuelven.', marker: [284, 339] },
    ],
  },
  {
    id: 'alojamiento',
    shortLabel: 'Alojamiento',
    eyebrow: 'Estadías / 04',
    title: 'Sentirse huésped, no usuario.',
    description: 'Información esencial en el objeto indicado: llegada, habitación, servicios y recomendaciones del entorno.',
    focus: [585, 350],
    zoom: 10.2,
    products: [
      { label: 'Llavero de habitación', description: 'Guía de estadía siempre a mano.', marker: [583, 348] },
      { label: 'Placa de bienvenida', description: 'Wi-Fi, servicios y asistencia.', marker: [593, 332] },
      { label: 'Tarjeta del huésped', description: 'Beneficios y recomendaciones locales.', marker: [577, 363] },
    ],
  },
  {
    id: 'comercio',
    shortLabel: 'Comercio',
    eyebrow: 'Retail / 05',
    title: 'El mostrador deja una señal.',
    description: 'Una experiencia breve en el momento justo para explicar, fidelizar o pedir una reseña sin fricción.',
    focus: [175, 525],
    zoom: 9.5,
    products: [
      { label: 'Tótem de reseñas', description: 'La opinión llega en dos segundos.', marker: [156, 533] },
      { label: 'Tarjeta de fidelidad', description: 'Beneficios sin formularios eternos.', marker: [188, 538] },
      { label: 'Packaging NFC', description: 'Origen, cuidados y recompra.', marker: [196, 488] },
    ],
  },
  {
    id: 'estudio-juridico',
    shortLabel: 'Estudio',
    eyebrow: 'Servicios / 06',
    title: 'Confianza que permanece.',
    description: 'Piezas sobrias para guardar el contacto, ordenar la documentación y facilitar una recomendación.',
    focus: [-235, 560],
    zoom: 9.4,
    products: [
      { label: 'Tarjeta personal', description: 'Contacto y especialidad actualizados.', marker: [-267, 554] },
      { label: 'Llavero de cliente', description: 'Acceso privado a documentos útiles.', marker: [-225, 575] },
      { label: 'Tótem de reseñas', description: 'Abre la ficha de Google Maps.', marker: [-194, 538] },
    ],
  },
]
