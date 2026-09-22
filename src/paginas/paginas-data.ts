/* Las paginas comerciales: una por conversacion.
   Hoy la landing habla de todo, asi que cuando Stephano le escribe a alguien le
   manda un link que dice de mas. Cada pagina de aca es un link que habla de una
   sola cosa: /software para quien necesita un sistema, /comercios para un local
   antes del verano, /personal para quien se presenta o vende, /objetos para
   quien ya entendio y quiere ver las piezas.

   ESTE ARCHIVO ES EL CONTRATO, no el contenido. Los tipos de abajo dicen que
   campos tiene una pagina; el texto que esta cargado es PROVISORIO, lo minimo
   para que la pagina se pueda abrir y probar. El copy y el diseño los terminan
   UX 1 y PAG 1: se escriben aca, en `PAGINAS`, y en el componente `Pagina.tsx`.
   Agregar una pagina es sumar una entrada aca, un HTML de entrada y una linea en
   vite.config.ts; no hay que tocar nada mas.

   Regla de la oferta que no se rompe: no mezclar segmentos. Lo de personas no
   muestra objetos de local (apoyavasos, placas) y al reves tampoco. */

import type { FotoDatos } from '../compartido/foto-datos'

/** Prueba de que la cosa existe: una foto real o algo que se puede abrir. */
export type PaginaPrueba = {
  /** `foto` espera `src` (una ruta de `public/`); `enlace` espera `href`. */
  tipo: 'foto' | 'enlace'
  texto: string
  src?: string
  href?: string
}

/** La foto principal de la pagina: una foto, o su hueco con la descripcion
    de lo que va a ir mientras no este generada (Stephano, 2026-09-21: las
    imagenes van al final). Se dibuja con src/compartido/Foto.tsx, el mismo
    componente que usan las puertas de la home. Una imagen sin `src` lleva la
    marca de pendiente en el renglon, para que no suba a produccion. Campo
    agregado por UX 1. */
export type PaginaImagen = FotoDatos

export type Pagina = {
  /** Ruta servida, sin barra final: `/software`. Es la que va en el HTML de
      entrada, en vite.config.ts y en el destino del puerto. */
  ruta: string
  /** Como se la nombra entre nosotros (paneles, medicion, conversaciones). */
  nombre: string
  /** El problema de esa persona, no la tecnologia. */
  titulo: string
  /** Un parrafo corto abajo del titulo. Opcional. */
  entrada?: string
  /** La foto principal, abajo de la entrada. Opcional. */
  imagen?: PaginaImagen
  /** Que incluye, en lista corta. */
  incluye: string[]
  /** Una prueba concreta. Sin esto la pagina no se abre (regla de la hoja de
      planteo: si no hay foto propia ni algo concreto que ofrecer, no se abre). */
  prueba?: PaginaPrueba
  /** Precio o rango ya definido. Vacio significa "consultá". */
  precio?: string
  /** El unico boton de la pagina. */
  whatsapp: { telefono: string; mensaje: string }
}

/** Telefono de Hito. El mismo que ya usa el perfil de Stephano. */
const TELEFONO = '+5492254590762'

/* PROVISORIO: estructura con lo minimo. El copy es de UX 1 y PAG 1. */
export const PAGINAS: Pagina[] = [
  {
    ruta: '/software',
    nombre: 'Software a medida',
    titulo: 'Un sistema hecho para cómo trabajás',
    entrada: 'Desarrollo y servidores propios, con mantenimiento por abono.',
    incluye: ['Desarrollo a medida', 'Servidores propios', 'Mantenimiento con abono'],
    precio: '',
    whatsapp: { telefono: TELEFONO, mensaje: 'Hola, quiero contarte un proyecto de software.' },
  },
  {
    ruta: '/comercios',
    nombre: 'Comercios · puesta a punto',
    titulo: 'Tu local listo antes del verano',
    entrada: 'Visita, fotos, ficha de Google, carta digital y el objeto instalado.',
    incluye: [
      'Visita al local',
      'Fotos del lugar',
      'Ficha de Google al día',
      'Carta digital',
      'Objeto instalado y capacitación',
    ],
    precio: '',
    whatsapp: { telefono: TELEFONO, mensaje: 'Hola, quiero reservar la visita para mi local.' },
  },
  {
    /* Copy de UX 1 (2026-09-21). Le habla a quien se presenta o vende por su
       cuenta: nada de objetos de local (apoyavasos, placas), por la regla de
       segmentos. Parte del problema, que es el momento incomodo de dictar el
       numero, y la tecnologia aparece solo como "como" en la lista. */
    ruta: '/personal',
    nombre: 'Personal',
    // PLACEHOLDER: titulo y entrada esperan el OK de Stephano (tienen que sonar a el).
    titulo: 'Que te agenden sin dictar tu número',
    entrada:
      'Una tarjeta que se apoya en el celular del otro y abre tu página: tu WhatsApp, tus redes y, si vendés, lo que ofrecés. La diseñamos, la imprimimos y la dejamos configurada.',
    imagen: {
      /* Criterio de Stephano: la imagen de Personal es una captura real del
         perfil, no una escena armada. ORQ 1 la saca para la puerta de la home
         y la deja en public/images/puertas/; va la misma. */
      src: '/images/puertas/personal-perfil.webp',
      descripcion:
        'Captura real de la página hito.uno/p/stephano vista en un celular: la foto, el nombre, el botón de WhatsApp y Guardar contacto.',
    },
    incluye: [
      'Tarjeta con NFC y QR, impresa por nosotros',
      'Tu página con tus canales',
      'Guardar tu contacto con un toque',
      'Catálogo, si vendés',
      'Tu panel para cambiar a dónde lleva la tarjeta',
    ],
    /* La prueba es el perfil de muestra: una pagina real y limpia, que es
       justo como va a quedar la de quien pregunta (DISENO.md, 2026-09-15). */
    prueba: {
      tipo: 'enlace',
      texto: 'Así queda una página: la de Stephano, uno de los que hace Hito.',
      href: '/p/stephano',
    },
    // Vacio a proposito: el precio de la Lite esta "a confirmar" en OFERTA.md.
    // "Consultá" es la decision tomada mientras tanto, no un dato pendiente.
    precio: '',
    whatsapp: {
      telefono: TELEFONO,
      mensaje: 'Hola, vi la página Personal. Quiero mi tarjeta y mi página.',
    },
  },
  {
    ruta: '/objetos',
    nombre: 'Objetos',
    titulo: 'Las piezas, una por una',
    entrada: 'Tarjeta, llavero, porta tarjetas, apoyavasos, placa y recibidor.',
    incluye: ['Tarjeta', 'Llavero', 'Porta tarjetas', 'Apoyavasos', 'Placa', 'Recibidor'],
    precio: '',
    whatsapp: { telefono: TELEFONO, mensaje: 'Hola, quiero consultar por un objeto.' },
  },
]

/** La pagina que corresponde a una ruta. Tolera la barra final y las
    mayusculas, porque la ruta puede venir de un QR impreso. */
export function paginaDe(pathname: string): Pagina | undefined {
  const ruta = '/' + pathname.toLowerCase().split('/').filter(Boolean)[0]
  return PAGINAS.find((p) => p.ruta === ruta)
}
