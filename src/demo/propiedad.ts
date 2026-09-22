/* La propiedad de la demo. ES INVENTADA.

   La demo existe para que un propietario de alquiler temporario vea como le
   quedaria su propia pagina de reservas. Por eso esta propiedad no puede
   parecerse a ninguna real: nombre inventado, sin direccion, sin precio y sin
   telefono. Si alguien del equipo conoce un alojamiento real con este nombre,
   se cambia aca y en ningun otro lado.

   Las fotos no existen todavia: las genera Stephano, y es lo ultimo que se
   hace. Mientras tanto cada una es un placeholder con la descripcion de lo que
   tiene que mostrar. Cuando lleguen, se muestran marcadas como ilustrativas. */

export type Foto = {
  /** Ruta en `public/`. Sin esto, la foto todavia no existe. */
  src?: string
  /** Texto alternativo para lectores de pantalla, cuando haya imagen. */
  alt: string
  /** Que tiene que mostrar la foto. Se ve en el placeholder mientras falte. */
  descripcion: string
}

export type Propiedad = {
  nombre: string
  /** Una o dos frases. */
  descripcion: string
  /** Zona general, nunca una direccion. */
  ubicacion: string
  /** Personas en total, contando adultos y menores. */
  capacidad: number
  ambientes: string[]
  servicios: string[]
  aceptaMascotas: boolean
  /** Una o dos fotos. Mientras no exista la imagen, va sin `src` y la pagina
      muestra un placeholder con la descripcion: es tambien la indicacion para
      generarla. Cuando llegue, se le pone `src` (ruta en `public/`) y se borra
      el comentario de placeholder que tiene arriba. */
  fotos: Foto[]
}

export const PROPIEDAD: Propiedad = {
  // PLACEHOLDER: nombre inventado, sin confirmar que no coincida con una casa
  // real de la zona. Lo confirma Stephano. Hasta entonces la demo no sube a
  // produccion (regla del 2026-09-21: un placeholder no va a main).
  nombre: 'Casa Viento Norte',
  descripcion:
    'Una casa entre pinos, a pocas cuadras del mar. Pensada para una familia o un grupo chico que quiere descansar.',
  ubicacion: 'Cariló, a pocas cuadras del mar',
  capacidad: 6,
  ambientes: ['3 dormitorios', '2 baños', 'Living comedor con hogar', 'Cocina equipada'],
  servicios: ['Wi-Fi', 'Parrilla', 'Cochera para un auto', 'Ropa de cama y toallas'],
  aceptaMascotas: true,
  fotos: [
    // PLACEHOLDER: foto sin generar (la genera Stephano con GPT).
    {
      alt: 'Frente de una casa entre pinos',
      descripcion: 'Frente de la casa entre pinos, con la entrada y el camino de arena. Luz de tarde.',
    },
    // PLACEHOLDER: foto sin generar (la genera Stephano con GPT).
    {
      alt: 'Living con hogar',
      descripcion: 'Living comedor con el hogar encendido y la mesa para seis. Interior cálido.',
    },
  ],
}
