import type { ExperienceId } from '../experience-data'

export type UseCaseKey = 'networking' | 'ventas' | 'identificacion' | 'producto' | 'evento'
export type TapActionKey = 'guardar-contacto' | 'abrir-pagina' | 'mostrar-informacion' | 'iniciar-conversacion'
export type ObjectKey = 'tarjeta' | 'llavero' | 'apoyavasos' | 'placa' | 'recibidor'

type UseCase = { label: string; description: string; sceneId: ExperienceId }
type TapAction = { label: string; promise: string }

/** El alt describe la escena (es el texto que reemplaza a la foto), el caption
 *  es el pie corto que se lee bajo el riel del carrusel. */
type Photo = { src: string; alt: string; caption: string }

type HitoObject = {
  label: string
  moment: string
  result: string
  /** Bajada larga del soporte, se lee sobre la foto en el carrusel */
  blurb: string
  sceneId: ExperienceId
  photos: Photo[]
}

export const useCases: Record<UseCaseKey, UseCase> = {
  networking: {
    label: 'Networking',
    description: 'Una presentación que no depende de recordar el nombre ni de tipear un mail.',
    sceneId: 'estudio-juridico',
  },
  ventas: {
    label: 'Ventas',
    description: 'El contacto queda guardado en el momento exacto en que hay interés.',
    sceneId: 'comercio',
  },
  identificacion: {
    label: 'Identificación',
    description: 'Acceso y perfil validados sin planillas ni credenciales de un día.',
    sceneId: 'alojamiento',
  },
  producto: {
    label: 'Producto',
    description: 'La pieza física acompaña la postventa: origen, cuidados y recompra.',
    sceneId: 'pizzeria',
  },
  evento: {
    label: 'Evento',
    description: 'Un objeto por invitado que abre programa, beneficios y contacto.',
    sceneId: 'bar',
  },
}

export const tapActions: Record<TapActionKey, TapAction> = {
  'guardar-contacto': { label: 'Guardar contacto', promise: 'Contacto guardado, sin tipear.' },
  'abrir-pagina': { label: 'Abrir una página', promise: 'La página correcta, sin buscar.' },
  'mostrar-informacion': { label: 'Mostrar información', promise: 'La información justa, en el momento justo.' },
  'iniciar-conversacion': { label: 'Iniciar conversación', promise: 'Una conversación que empieza en el objeto.' },
}

export const objects: Record<ObjectKey, HitoObject> = {
  tarjeta: {
    label: 'Tarjeta',
    moment: 'Al presentarte.',
    result: 'Contacto guardado, sin tipear.',
    blurb: 'La primera pieza del sistema. Se entrega en la mano y deja el contacto guardado antes de que termine la conversación.',
    sceneId: 'estudio-juridico',
    photos: [
      {
        src: '/images/products/tarjeta/tarjeta-01.webp',
        alt: 'Tarjeta Hito apoyada sobre el mostrador de mármol de la recepción de un hotel, junto a una campanilla de bronce',
        caption: 'Recepción · hotel',
      },
      {
        src: '/images/products/tarjeta/tarjeta-02.webp',
        alt: 'Tarjeta Hito parada sobre la barra de un bar, al lado de la carta de cócteles',
        caption: 'Barra · bar',
      },
      {
        src: '/images/products/tarjeta/tarjeta-03.webp',
        alt: 'Tarjeta Hito en un soporte sobre el mostrador de un local, junto a la terminal de pago y su caja',
        caption: 'Mostrador · comercio',
      },
      {
        src: '/images/products/tarjeta/tarjeta-04.webp',
        alt: 'Una persona sostiene la tarjeta Hito frente a un teléfono apoyado en la mesa, listo para conectar',
        caption: 'En mano · reunión',
      },
    ],
  },
  llavero: {
    label: 'Llavero',
    moment: 'En la visita a la propiedad.',
    result: 'Ficha, planos y contacto del asesor.',
    blurb: 'Viaja con la llave. Abre la ficha de la propiedad, los planos y el contacto del asesor en el momento de la visita.',
    sceneId: 'inmobiliaria',
    photos: [],
  },
  apoyavasos: {
    label: 'Apoyavasos',
    moment: 'Al sentarse en la mesa.',
    result: 'Carta, promo del día y playlist.',
    blurb: 'Ya está en la mesa cuando llega el pedido. La carta, la promo del día y la playlist, sin llamar a nadie.',
    sceneId: 'bar',
    photos: [],
  },
  placa: {
    label: 'Placa',
    moment: 'Al llegar al lugar.',
    result: 'Wi-Fi, servicios y asistencia.',
    blurb: 'Fija en la pared o el mostrador. Resuelve lo que todos preguntan al llegar: Wi-Fi, servicios y a quién buscar.',
    sceneId: 'alojamiento',
    photos: [],
  },
  recibidor: {
    label: 'Recibidor',
    moment: 'Al terminar la compra.',
    result: 'Reseña en dos segundos.',
    blurb: 'Espera en el mostrador el momento exacto en que la compra terminó bien. La reseña llega en dos segundos.',
    sceneId: 'comercio',
    photos: [],
  },
}

export const shapes = ['Rectangular', 'Esquinas redondeadas', 'Troquelada']
export const sizes = ['85 × 54 mm', '90 × 50 mm', 'Mini 65 × 40 mm']
export const finishes = ['Mate', 'Soft touch', 'Metal', 'Madera']

export const stepsWithout = [
  'Buscar información',
  'Abrir el navegador',
  'Buscar la empresa',
  'Encontrar la sección',
  'Hacer la acción',
]
