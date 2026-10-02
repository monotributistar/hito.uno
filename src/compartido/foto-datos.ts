/* Forma de una foto del sitio (o de su hueco mientras no exista).
   Vive aparte de Foto.tsx, sin React, para que la puedan importar los
   archivos de datos (paginas-data.ts, landing-data.ts) y, si hace falta,
   el Worker, sin arrastrar JSX. */

export type FotoDatos = {
  /** Que muestra la foto. Sin `src` es el pedido para generarla; con `src` es
      el texto alternativo. */
  descripcion: string
  /** Ruta dentro de `public/`, en webp. Ver docs/fotografia-soportes.md. */
  src?: string
}
