/* Las paginas comerciales: una por conversacion.
   Hoy la landing habla de todo, asi que cuando Stephano le escribe a alguien le
   manda un link que dice de mas. Cada pagina de aca es un link que habla de una
   sola cosa: /software para quien necesita un sistema, /comercios para un local
   antes del verano, /personal para quien se presenta o vende, /objetos para
   quien ya entendio y quiere ver las piezas.

   ESTE ARCHIVO ES EL CONTRATO, no el contenido. Los tipos de abajo dicen que
   campos tiene una pagina; el texto provisorio lleva la marca de pendiente que busca ORQ, lo minimo
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

/* Lo que lleva la marca de pendiente no esta confirmado y no pasa a main.
   El copy es de UX 1 y PAG 1. */
export const PAGINAS: Pagina[] = [
  {
    ruta: '/software',
    nombre: 'Software a medida',
    /* Arranca por un caso concreto: la landing de reservas para alojamientos.
       Foco en propietarios de alquiler temporario; hoteles chicos, segundo.
       No decir que "ya se hizo uno para un hotel": se construyo la base (el
       codigo es de Stephano) pero nunca se vendio ni tuvo cliente.
       La puesta a punto del local es de /comercios: aca solo las reservas. */
    titulo: 'Las reservas te llegan por todos lados y alguna se pierde',
    entrada:
      'Si alquilás tu casa o tus cabañas por temporada, o tenés un hotel chico, los pedidos llegan por WhatsApp, por Instagram y por teléfono, y cuesta tenerlos a la vista. Armamos una página para tu alojamiento con un formulario de reserva, y cada pedido entra ordenado a una planilla de Google que ya sabés usar.',
    imagen: {
      /* Criterio de Stephano: captura real de la demo, nada generado. */
      src: '/images/paginas/software-demo-doble.webp',
      descripcion:
        'Dos capturas reales de hito.uno/demo/reservas en un celular, lado a lado. Izquierda: el formulario de Casa Viento Norte completo (fechas, 4 personas, con mascota). Derecha: la vista "Así le llegaría al propietario" con esa misma consulta. Arriba de las dos se lee el aviso "Demo · propiedad ficticia".',
    },
    incluye: [
      'Una página propia para tu alojamiento',
      'Un formulario de reserva con lo que necesitás saber: fechas, cuántas personas, cómo contactarlas',
      'Cada pedido entra a tu planilla de Google, en orden y con fecha',
      'Nada nuevo que aprender: la planilla es tu panel',
      'Cambios y mantenimiento con abono mensual',
      'Hablás siempre con quien lo programa, no con un soporte',
    ],
    /* La prueba es la demo /demo/reservas (propiedad inventada, marcada como
       demo, la construyo PLAT 1): muestra el formulario del huesped y, al
       enviar, lo que le llegaria al propietario. */
    prueba: {
      tipo: 'enlace',
      texto: 'Probala: así ve la consulta tu huésped, y así te llega a vos. Es una demo.',
      href: '/demo/reservas',
    },
    precio: '',
    whatsapp: {
      telefono: TELEFONO,
      mensaje: 'Hola, tengo un alojamiento y quiero ordenar las reservas.',
    },
  },
  {
    // PLACEHOLDER: copy provisorio de PLAT 1, falta el de PAG 1.
    ruta: '/comercios',
    nombre: 'Comercios · puesta a punto',
    titulo: 'Tu local listo antes del verano',
    entrada: 'Visita, fotos, ficha de Google, carta digital y el objeto instalado.',
    imagen: {
      /* Criterio de Stephano: foto de ambiente, sin piezas nuestras (ninguna
         esta impresa todavia). */
      // PLACEHOLDER: foto a generar; cuando exista, poner su ruta en `src`.
      descripcion:
        'Foto de ambiente: el salón de un café chico de Pinamar a media mañana, antes de la temporada. Mesas de madera vacías, luz natural por el ventanal, el dueño acomodando sillas al fondo. Sin tarjetas, placas ni objetos Hito a la vista. Formato 3:2, tercio izquierdo despejado.',
    },
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
    // PLACEHOLDER: copy provisorio de PLAT 1, falta el de PAG 1.
    ruta: '/objetos',
    nombre: 'Objetos',
    titulo: 'Las piezas, una por una',
    entrada: 'Tarjeta, llavero, porta tarjetas, apoyavasos, placa y recibidor.',
    imagen: {
      /* Criterio de Stephano: render, no foto, y solo de las dos piezas con
         diseño 3D. La descripcion lo dice para que nadie la genere como foto. */
      // PLACEHOLDER: render a generar; cuando exista, poner su ruta en `src`.
      descripcion:
        'Render 3D, no foto: la tarjeta Lite con su código QR y el porta tarjetas con NFC, lado a lado sobre fondo crema #eef1e8, luz suave de estudio. Logo "Hito.uno" completo en las dos piezas. Nada de apoyavasos, placas ni llaveros: todavía no tienen diseño.',
    },
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
