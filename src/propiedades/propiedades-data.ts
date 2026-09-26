/* Una pagina por propiedad.

   Para quien la abre parado frente a la casa (QR en el cartel) o porque le
   llego el link por WhatsApp. Tiene que contestar rapido: que es, donde,
   cuanto, si esta libre y como consulto.

   Dos modos sobre la misma ficha:
   - `temporario`: precio por noche o por semana, y la consulta pide fechas.
   - `venta`: precio de venta, y la consulta pregunta cuando quiere visitar.

   REGLA: la direccion exacta no se publica, solo la zona. Una casa vacia con
   la direccion puesta es un problema para el dueño, y es lo primero que mira
   una inmobiliaria para decidir si confia.

   Lo que no esta confirmado lleva la marca de pendiente y no sube a
   produccion. */

export type ModoPropiedad = 'temporario' | 'venta'

export type EstadoPropiedad = 'disponible' | 'reservada' | 'alquilada' | 'vendida'

export type FotoPropiedad = {
  /** Ruta dentro de public/. */
  src: string
  /** Que se ve. Es el texto que reemplaza a la foto y el que lee un buscador. */
  alt: string
}

export type Propiedad = {
  /** Ultimo tramo de la URL: /c/<slug>. Corto y legible en voz alta. */
  slug: string
  modo: ModoPropiedad
  estado: EstadoPropiedad
  nombre: string
  /** Zona, nunca la direccion exacta. */
  zona: string
  /** Dos o tres lineas: que es y para quien. */
  descripcion: string
  /** Precio ya escrito como se muestra. Vacio significa "consultar". */
  precio?: string
  /** Aclaracion abajo del precio: temporada, minimo de noches, expensas. */
  precioNota?: string
  /** Los numeros que todos preguntan. Se muestran como fichas. */
  datos: { etiqueta: string; valor: string }[]
  /** Lo que tiene, en lista corta. */
  servicios: string[]
  fotos: FotoPropiedad[]
  /** A donde van las consultas. */
  whatsapp: { telefono: string; mensaje: string }
  /** Quien la publica, como se muestra al pie. */
  publica: string
}

const TELEFONO = '+5492254590762'

export const PROPIEDADES: Propiedad[] = [
  {
    slug: 'valeria-1',
    modo: 'temporario',
    // PLACEHOLDER: estado real a confirmar con Stephano antes de publicar.
    estado: 'disponible',
    nombre: 'Valeria 1',
    // PLACEHOLDER: la zona dice lo que dice el inventario ("frente al mar"), falta confirmarla.
    zona: 'Valeria del Mar, frente al mar',
    /* Es un departamento con escalera al sotano (Stephano, 2026-09-26): arriba
       el estar con cocina, abajo el sotano con varias camas. */
    descripcion:
      'Departamento de playa en Valeria del Mar: arriba, cocina integrada, estar con sofá cama y ventanal al balcón. Por la escalera se baja al sótano, con varias camas para cuando viene más gente.',
    // PLACEHOLDER: falta el precio.
    precio: '',
    // PLACEHOLDER: faltan capacidad, ambientes y baños confirmados.
    datos: [
      { etiqueta: 'Personas', valor: 'A confirmar' },
      { etiqueta: 'Ambientes', valor: 'A confirmar' },
      { etiqueta: 'Baños', valor: '1' },
      { etiqueta: 'Sótano', valor: 'Con camas' },
    ],
    // PLACEHOLDER: los servicios salen de lo que se ve en las fotos, falta confirmarlos.
    servicios: ['Cocina equipada', 'Heladera con freezer', 'Horno eléctrico', 'TV', 'Ventilador'],
    fotos: [
      {
        src: '/images/propiedades/valeria-1/depto_estar-ventanal_01.webp',
        alt: 'El estar con el sofá cama contra el ventanal, con mucha luz natural',
      },
      {
        src: '/images/propiedades/valeria-1/depto_estar-cocina_01.webp',
        alt: 'Cocina integrada, mesa redonda con sillas azules y el sofá al fondo',
      },
      {
        src: '/images/propiedades/valeria-1/depto_cocina_01.webp',
        alt: 'La cocina con heladera, horno eléctrico y anafe, y la TV sobre la mesa de madera',
      },
      {
        src: '/images/propiedades/valeria-1/depto_bano_01.webp',
        alt: 'El baño con ducha y cortina con un faro y botes',
      },
      {
        src: '/images/propiedades/valeria-1/sotano_camas_02.webp',
        alt: 'El sótano: dos camas contra el revestimiento de junco, con mesitas de pino',
      },
      {
        src: '/images/propiedades/valeria-1/sotano_camas_03.webp',
        alt: 'El sótano: dos camas y un placar de pino abierto',
      },
      {
        src: '/images/propiedades/valeria-1/sotano_cama-escalera_01.webp',
        alt: 'El sótano: cama matrimonial junto a la escalera que baja del departamento',
      },
      {
        src: '/images/propiedades/valeria-1/sotano_estar_01.webp',
        alt: 'El sótano: mesa con dos sillas, espejo de pie y perchero',
      },
    ],
    whatsapp: {
      telefono: TELEFONO,
      mensaje: 'Hola, quiero consultar por Valeria 1.',
    },
    // PLACEHOLDER: falta confirmar como se nombra a quien la publica.
    publica: 'Myland S.A.',
  },
]

export function propiedadPorRuta(pathname: string): Propiedad | undefined {
  const slug = pathname.replace(/^\/c\//, '').replace(/\/+$/, '').toLowerCase()
  return PROPIEDADES.find((p) => p.slug === slug)
}
