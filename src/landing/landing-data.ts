import type { ExperienceId } from '../experience-data'
import { whatsappHref } from '../partner/links'

/* El llamado a la accion unico del sitio. Vive aca porque dos puertas todavia
   no tienen pagina publicada y abren esto en su lugar. */
export const CTA = 'Agendemos una reunión'
export const CTA_HREF = whatsappHref('+5492254590762', 'Hola, quiero agendar una reunión.')

/* Configurador "Pedí tu Hito": dos preguntas, y las opciones de la segunda
   dependen de la primera. Asi quien quiere presentarse no ve "Wi-Fi del local"
   y cada opcion ilustra un Hito real de la oferta (ver docs/OFERTA.md):
   la tarjeta Lite, la Vitrina con catalogo, el Local, el llavero de una
   propiedad. No mezclar segmentos en una misma lista (DISENO.md). */
export type UseCaseKey = 'presentarme' | 'vender' | 'local' | 'propiedad'
export type TapActionKey =
  | 'guardar-contacto'
  | 'abrir-whatsapp'
  | 'mi-perfil'
  | 'mi-catalogo'
  | 'menu'
  | 'wifi'
  | 'resena'
  | 'ficha'
  | 'asesor'
export type ObjectKey = 'tarjeta' | 'llavero' | 'placa' | 'recibidor'

type UseCase = {
  label: string
  description: string
  sceneId: ExperienceId
  /** El Hito que le proponemos para ese uso. Se lee en la vista previa. */
  object: string
  /** Acciones que tienen sentido para este uso, en orden de relevancia. */
  actions: TapActionKey[]
}
type TapAction = { label: string; promise: string }

/** El alt describe la escena (es el texto que reemplaza a la foto), el caption
 *  es el pie corto que se lee bajo el riel del carrusel. */
type Photo = {
  src: string
  alt: string
  caption: string
  /** Calibracion del encuadre, por foto. `focus` es el object-position: el
   *  punto de la foto que tiene que quedar visible cuando el recorte corta
   *  (en desktop el stage es mas ancho que la foto y corta arriba/abajo; en
   *  mobile es 4:5 y corta a los lados). `zoom` y `nudge` empujan el objeto
   *  hacia la derecha en desktop, fuera de la veladura del texto: se usan
   *  cuando el objeto quedo en el tercio izquierdo. */
  focus?: string
  zoom?: number
  nudge?: string
}

type HitoObject = {
  label: string
  moment: string
  result: string
  /** Bajada larga del soporte, se lee sobre la foto en el carrusel */
  blurb: string
  sceneId: ExperienceId
  photos: Photo[]
  /** Misma escena que las de contexto, pero con la pantalla ya resuelta.
   *  Al tocar, el carrusel cruza a esta foto. Sin ella solo cambia el texto. */
  resultPhoto?: Photo
}

export const useCases: Record<UseCaseKey, UseCase> = {
  presentarme: {
    label: 'Presentarme',
    description: 'Una presentación que no depende de recordar tu nombre ni de tipear un número.',
    sceneId: 'estudio-juridico',
    object: 'Tarjeta Lite',
    actions: ['guardar-contacto', 'abrir-whatsapp', 'mi-perfil'],
  },
  vender: {
    label: 'Vender por Instagram',
    description: 'Tus productos con precio y un botón para pedirlos, sin contestar "precio?" por mensaje.',
    sceneId: 'comercio',
    object: 'Tarjeta con catálogo',
    actions: ['mi-catalogo', 'abrir-whatsapp', 'mi-perfil'],
  },
  local: {
    label: 'Mi local',
    description: 'Un objeto en la mesa o en la pared que resuelve lo que todos preguntan al llegar.',
    sceneId: 'bar',
    object: 'Placa',
    actions: ['menu', 'wifi', 'resena'],
  },
  propiedad: {
    label: 'Una propiedad',
    description: 'La ficha, las fotos y el contacto del asesor, viajando con la llave.',
    sceneId: 'inmobiliaria',
    object: 'Llavero',
    actions: ['ficha', 'asesor'],
  },
}

export const tapActions: Record<TapActionKey, TapAction> = {
  'guardar-contacto': { label: 'Guardar mi contacto', promise: 'Tu contacto guardado, sin tipear.' },
  'abrir-whatsapp': { label: 'Abrir mi WhatsApp', promise: 'La conversación empieza en el objeto.' },
  'mi-perfil': { label: 'Mostrar mi perfil', promise: 'Todo lo tuyo, en un toque.' },
  'mi-catalogo': { label: 'Mostrar mi catálogo', promise: 'Tus productos, listos para pedir.' },
  menu: { label: 'Abrir el menú', promise: 'La carta en la mesa, sin pedirla.' },
  wifi: { label: 'Conectar al Wi-Fi', promise: 'Nadie vuelve a preguntar la clave.' },
  resena: { label: 'Pedir una reseña', promise: 'La opinión, en el momento justo.' },
  ficha: { label: 'Mostrar la ficha', promise: 'Fotos y datos de la propiedad, en la visita.' },
  asesor: { label: 'Contactar al asesor', promise: 'El asesor, a un toque de distancia.' },
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
        focus: '45% 55%',
        zoom: 1.12,
        nudge: '10%',
      },
      {
        src: '/images/products/tarjeta/tarjeta-02.webp',
        alt: 'Tarjeta Hito parada sobre la barra de un bar, al lado de la carta de cócteles',
        caption: 'Barra · bar',
        focus: '45% 60%',
        zoom: 1.1,
        nudge: '8%',
      },
      {
        src: '/images/products/tarjeta/tarjeta-03.webp',
        alt: 'Tarjeta Hito en un soporte sobre el mostrador de un local, junto a la terminal de pago y su caja',
        caption: 'Mostrador · comercio',
        focus: '50% 52%',
      },
      {
        src: '/images/products/tarjeta/tarjeta-04.webp',
        alt: 'Una persona sostiene la tarjeta Hito frente a un teléfono apoyado en la mesa, listo para conectar',
        caption: 'En mano · reunión',
        focus: '55% 50%',
        zoom: 1.08,
        nudge: '6%',
      },
    ],
  },
  llavero: {
    label: 'Llavero',
    moment: 'En la visita a la propiedad.',
    result: 'Ficha, planos y contacto del asesor.',
    blurb: 'Viaja con la llave. Abre la ficha de la propiedad, los planos y el contacto del asesor en el momento de la visita.',
    sceneId: 'inmobiliaria',
    photos: [
      // Primera a proposito: es la unica que tiene su par de resultado en la
      // misma escena, asi el cruce por defecto al tocar es el que mejor lee.
      {
        src: '/images/products/llavero/llavero-auto.webp',
        alt: 'Llavero Hito.uno colgado de la llave de un auto, sobre una mesa de travertino con luz natural',
        caption: 'Con la llave del auto',
        focus: '55% 58%',
        nudge: '4%',
      },
      {
        src: '/images/products/llavero/llavero-01.webp',
        alt: 'Llavero Hito.uno azul colgado de una llave, sobre una superficie de piedra con luz cálida',
        caption: 'Con la llave · casa',
        focus: '60% 55%',
      },
      {
        src: '/images/products/llavero/llavero-02.webp',
        alt: 'Llavero Hito redondo con una llave dorada, apoyado en el mostrador de la recepción de un hotel junto a una campanilla de bronce',
        caption: 'Recepción · hotel',
        focus: '55% 62%',
      },
      {
        src: '/images/products/llavero/llavero-03.webp',
        alt: 'Llavero Hito redondo parado sobre el mármol de una recepción, junto a la campanilla y el libro de registro',
        caption: 'Mostrador · check-in',
        focus: '45% 62%',
        zoom: 1.1,
        nudge: '10%',
      },
      {
        src: '/images/products/llavero/llavero-04.webp',
        alt: 'Llavero Hito.uno cuadrado sobre una mesa de entrada de mármol, junto a un libro y un portavelas encendido',
        caption: 'Mesa de entrada · estadía',
        focus: '60% 58%',
      },
    ],
    resultPhoto: {
      src: '/images/products/llavero/llavero-auto-resultado.webp',
      alt: 'La misma mesa de travertino con la llave y el llavero, ahora con un teléfono que muestra la información del auto: seguro, documentación, asistencia, contacto y mantenimiento',
      caption: 'Después del toque',
      focus: '65% 55%',
    },
  },
  placa: {
    label: 'Placa',
    moment: 'Al llegar al lugar.',
    result: 'Wi-Fi, servicios y asistencia.',
    blurb: 'Fija en la pared o el mostrador. Resuelve lo que todos preguntan al llegar: Wi-Fi, servicios y a quién buscar.',
    sceneId: 'alojamiento',
    photos: [
      {
        src: '/images/products/placa/placa-01.webp',
        alt: 'Placa Hito.uno color crema montada en una pared de revoque junto a la puerta de madera de un hotel boutique, con un olivo en maceta al fondo y luz cálida de tarde',
        caption: 'Entrada · alojamiento',
        focus: '55% 45%',
      },
    ],
    resultPhoto: {
      src: '/images/products/placa/placa-resultado.webp',
      alt: 'La misma placa Hito.uno en la pared del hotel, ahora con una mano que acerca un celular cuya pantalla muestra la página de bienvenida con los botones Wi-Fi, Servicios y Escribinos',
      caption: 'Después del toque',
      focus: '60% 50%',
    },
  },
  recibidor: {
    label: 'Recibidor',
    moment: 'Al apoyarte en el mostrador.',
    result: 'Visita activada, equipo avisado.',
    blurb: 'Espera en el mostrador y ofrece las tres puertas de entrada: acercar la tarjeta, escanear el código o escribirle al equipo.',
    sceneId: 'comercio',
    photos: [
      {
        src: '/images/products/recibidor/recibidor-01.webp',
        alt: 'Cartel Hito.uno de bienvenida parado en el mostrador de la recepción de un hotel, con las opciones de acercar la tarjeta, escanear el código o escribir al equipo',
        caption: 'Mostrador · bienvenida',
        focus: '55% 40%',
        nudge: '6%',
      },
    ],
  },
}


/* --- Que pasos queres reducir ---
   La seccion arranca con una pregunta y la persona elige su caso. Cada caso
   muestra la cadena de hoy contra el toque: la gracia es que se vea a si misma
   en la lista larga.

   Todos los casos son cosas que Hito entrega hoy. Si algo esta a construir, no
   entra aca.

   No confundir con el configurador: aca se muestra el PROBLEMA; el
   configurador arma la propuesta y pide el contacto. */
export type CasoKey = 'agendar' | 'vender' | 'reservar' | 'resenas'

export type Caso = {
  key: CasoKey
  /** Texto de la pastilla. Corto: entra en una fila en el celular. */
  label: string
  /** La cadena de hoy, un renglon por paso. */
  hoy: string[]
  /** Lo que pasa con el objeto, en un paso. */
  conHito: { titulo: string; detalle: string }
}

/* Los cuatro casos y su orden los aprobo Stephano el 2026-10-02. */
export const casos: Caso[] = [
  {
    key: 'agendar',
    label: 'Que me agenden',
    hoy: [
      'Le dictás tu número',
      'Lo escribe mal',
      'Te guarda como "Juan el de las tarjetas"',
      'No te encuentra cuando te necesita',
    ],
    conHito: {
      titulo: 'Un toque y quedás agendado',
      detalle: 'Con tu nombre, tu foto y tus redes. Sin dictar nada.',
    },
  },
  {
    key: 'vender',
    label: 'Que vean lo que vendo',
    hoy: [
      '"¿Tenés más fotos?"',
      'Mandás una por una',
      '"¿Cuánto el segundo?"',
      'Repetís lo mismo diez veces por día',
    ],
    conHito: {
      titulo: 'Un toque y ve todo, con precio',
      detalle: 'Y te escribe por el que quiere, sin que expliques nada.',
    },
  },
  {
    key: 'reservar',
    label: 'Que reserven mi casa',
    hoy: [
      'Te escriben por WhatsApp, Instagram y teléfono',
      'Anotás en un papel',
      'Dos personas preguntan por la misma semana',
      'Una se te pierde',
    ],
    conHito: {
      titulo: 'Un toque y la consulta cae ordenada',
      detalle: 'Fechas, cuántos son y contacto, en la planilla que ya usás.',
    },
  },
  {
    key: 'resenas',
    label: 'Que me dejen una reseña',
    hoy: [
      'Se lo pedís',
      'Busca tu local en el mapa',
      'Aparecen tres con nombre parecido',
      'Lo deja para después',
    ],
    conHito: {
      titulo: 'Un toque y está escribiendo la reseña',
      detalle: 'En tu ficha, la correcta, mientras todavía está en la mesa.',
    },
  },
]

/* --- Que hacemos ---
   Es lo primero que se lee. La pregunta va adelante porque es la que trae todo
   el mundo cuando abre la pagina, y la respuesta son los cuatro trabajos que
   Hito hace hoy, incluido el de las tomas aereas, que no estaba en el sitio.
   Si algo no se puede entregar hoy, no entra en esta lista. */
export type Servicio = { titulo: string; detalle: string }

export const servicios: Servicio[] = [
  {
    titulo: 'Objetos que abren lo tuyo',
    detalle: 'Tarjetas, llaveros y piezas impresas en 3D con chip y código: se apoyan en el celular y abren tu página.',
  },
  {
    titulo: 'Tu página, al día',
    detalle: 'Tu perfil, tu catálogo o la ficha de una propiedad. Cambia lo que muestra sin cambiar el objeto.',
  },
  {
    titulo: 'Sistemas a medida',
    detalle: 'Lo que hoy llevás en planillas y cuadernos, hecho a tu forma de trabajar y alojado por nosotros.',
  },
  {
    titulo: 'Tomas aéreas y contenido',
    detalle: 'Vuelos privados en 4K y 8K sobre tu casa, tu local o tu obra. Con ese material armamos el contenido para tus publicaciones.',
  },
]

/* --- Cuatro puertas ---
   Una por tipo de conversacion. Cada puerta lleva a su pagina (/personal,
   /comercios, /objetos, /software), que es el link que Stephano manda por
   WhatsApp: la home las presenta y la pagina cuenta el resto.

   Imagenes, con el criterio que decidio Stephano (2026-09-21): solo capturas
   reales de lo que existe (el perfil de muestra y la demo de reservas). Donde
   no hay nada real que mostrar, un recuadro con la descripcion de lo que va a
   ir, nunca una foto que haga parecer impresa una pieza que no existe. */
export type DoorKey = 'personal' | 'comercio' | 'objetos' | 'software'

export type Door = {
  key: DoorKey
  label: string
  title: string
  description: string
  /** Que hay para ese contexto, en pocas palabras. */
  examples: string
  /** Pagina a la que lleva. Tiene que ser una de las rutas del build. */
  href: string
  /** Estado honesto de lo que se ofrece en esa puerta. */
  status: string
  /** Captura real. Si no hay, va `placeholder` con la descripcion de la imagen. */
  photo?: Photo
  placeholder?: string
  /** Dibuja el recorrido (objeto, toque, pagina) en lugar de una foto. Lo usa
      Personal, que antes mostraba la cara de Stephano en una captura. */
  diagrama?: boolean
  /** Un texto en el lugar de la foto, cuando todavia no hay foto que valga la
      pena. No es una descripcion de la imagen que falta (eso es `placeholder`):
      es contenido que se lee. */
  nota?: string
}

export const doors: Door[] = [
  /* El orden importa: primero las dos que llevan a una pagina, despues las dos
     que todavia no se publican. Software va primera porque es lo que hoy se
     puede mostrar funcionando (la demo), y Personal bajo de prioridad por
     pedido de Stephano (2026-10-03). */
  {
    key: 'software',
    label: 'Software a medida',
    title: 'Tus reservas, ordenadas.',
    description: 'Una página para tu alojamiento con un formulario que deja cada consulta en una planilla que ya sabés usar.',
    examples: 'Reservas · formularios · planillas',
    href: '/software',
    status: 'A medida',
    photo: {
      src: '/images/puertas/software-demo.webp',
      alt: 'Primer plano de la demo de reservas: "Así le llegaría al propietario", con el aviso de que en la demo no se envía nada',
      caption: 'Demo de reservas · captura real',
    },
  },
  {
    key: 'personal',
    label: 'Personal',
    title: 'Tu información, siempre a mano.',
    description: 'Una tarjeta que deja tu contacto guardado y una página tuya que vive en Hito.uno.',
    examples: 'Tarjeta · llavero · página personal',
    href: '/personal',
    /* Decia "Disponible hoy" y no hay ninguna pieza impresa: la pagina si
       existe, la pieza todavia no. */
    status: 'Página disponible',
    /* Mostraba una captura del perfil de Stephano, con su cara. La home no
       necesita presentar a una persona para explicar el servicio. */
    diagrama: true,
  },
  {
    key: 'comercio',
    label: 'Comercio',
    title: 'Tu local, listo para la temporada.',
    description: 'Ficha de Google, reseñas y tu carta o catálogo digital, al día y sin reimprimir.',
    examples: 'Ficha de Google · carta digital · reseñas',
    // Pendiente de publicar: hasta entonces la puerta abre el llamado a la accion.
    href: CTA_HREF,
    // Pendiente: la pagina /comercios no se publica todavia (sin prueba).
    status: 'Pronto',
    /* Texto de muestra, hasta que haya la foto de un local real trabajando con
       esto (sale del cafe de Carilo). Antes habia una foto de producto, que
       mostraba una pieza suelta sobre un fondo y no decia nada del local. */
    nota: 'Un toque sobre la mesa y el cliente ya está mirando la carta, dejando la reseña o guardando tu contacto. Sin app, sin pedirle que escriba nada.',
  },
  {
    key: 'objetos',
    label: 'Objetos',
    title: 'Dale una capa digital a las cosas.',
    // Igual que /objetos: solo piezas personales (regla de segmentos).
    description: 'Tarjeta, porta tarjetas y llavero: se apoyan en el celular y abren tu página.',
    examples: 'Tarjeta · porta tarjetas · llavero',
    // Pendiente de publicar: hasta entonces la puerta abre el llamado a la accion.
    href: CTA_HREF,
    status: 'Pronto',
    /* Foto de producto que ya estaba en el sitio. Se cambia por el render
       cuando exista. */
    photo: {
      src: '/images/products/tarjeta/tarjeta-06.webp',
      alt: 'Dos tarjetas Hito.uno sobre fondo crema: el frente con el logo y el dorso con el código QR',
      caption: 'Tarjeta · frente y dorso',
      focus: '50% 55%',
    },
  },
]

/* --- ¿Que queres simplificar? ---
   Explica el valor por necesidad, no por tecnologia. */
export type Need = { label: string; description: string }

export const needs: Need[] = [
  { label: 'Contacto', description: 'Tu número y tus redes guardados sin tipear.' },
  { label: 'Wi-Fi', description: 'Conectarse sin pedir la clave.' },
  { label: 'Reseñas', description: 'La opinión, en el momento en que la persona quiere darla.' },
  { label: 'Información', description: 'Horarios, servicios, instrucciones: lo que todos preguntan.' },
  { label: 'Catálogo', description: 'Tus productos con precio y un botón para pedirlos.' },
  { label: 'Ficha', description: 'Una propiedad, un producto o un equipo, con todo lo suyo.' },
]

/* --- Que incluye Hito ---
   Las tres capas del sistema y la escalera de la oferta. Sin precios hasta
   que esten definidos; el dashboard aparece como proximamente a proposito. */
export type Layer = { label: string; title: string; description: string; note?: string }

export const layers: Layer[] = [
  {
    label: 'Objeto',
    title: 'La pieza física.',
    description: 'Tarjeta, llavero, placa o recibidor. Impresos en 3D, con NFC y código QR. Se paga una vez.',
  },
  {
    label: 'Destino',
    title: 'Lo que se abre al tocar.',
    description: 'Tu página en hito.uno con tus canales, tu catálogo o tu ficha. Vive mientras tu membresía esté activa.',
  },
  {
    label: 'Servicio',
    title: 'Nosotros lo configuramos.',
    description: 'Cargamos tu contenido, lo mantenemos y lo cambiamos cuando pedís. Sin app, sin cuenta, sin instalar nada.',
    note: 'Próximamente: panel con métricas de toques por objeto.',
  },
]

export type Tier = { label: string; object: string; destination: string; status: 'Disponible hoy' | 'Próximamente' | 'A medida' }

export const tiers: Tier[] = [
  { label: 'Lite', object: 'Tarjeta plana con QR', destination: 'Página personal con tus canales', status: 'Disponible hoy' },
  { label: 'Hito', object: 'Porta tarjetas con NFC', destination: 'Página personal + cambios incluidos', status: 'Próximamente' },
  { label: 'Hito +', object: 'Tarjeta + llavero', destination: 'Página con catálogo, propiedades o servicios', status: 'Próximamente' },
  { label: 'A medida', object: 'Los objetos que el caso pida', destination: 'Web, catálogo o base de datos propia', status: 'A medida' },
]
