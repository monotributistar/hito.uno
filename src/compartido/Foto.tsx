/* Una foto del sitio, o el hueco donde va a ir.

   Stephano decidio el 2026-09-21 que las imagenes se generan al final. Hasta
   entonces, donde va una foto va un recuadro con la proporcion final y la
   descripcion de lo que va a ir adentro: el diseño ya tiene su forma y el texto
   es el pedido para generarla. Cuando llega la foto se pone `src` y el mismo
   componente la muestra, sin tocar nada mas.

   Vive fuera de src/paginas/ para que lo usen el molde de las paginas, las
   puertas de la home y cualquier otro hueco de foto del sitio.

   Regla: el renglon del DATO que no tiene `src` lleva la marca de pendiente
   (ver scripts/placeholders.mjs), asi no sube a produccion. Este archivo no la
   lleva: el componente esta terminado, lo pendiente es cada foto. */

import type { CSSProperties } from 'react'
import type { FotoDatos } from './foto-datos'
import './foto.css'

export type { FotoDatos }

type Props = FotoDatos & {
  /** Proporcion del recuadro, como en CSS: '3 / 2' (la de las fotos de
      soporte), '4 / 5', '1 / 1'. El hueco ocupa lo mismo que la foto final,
      asi el diseño no salta cuando llega. */
  proporcion?: string
  /** Clase extra para ubicarla en su contexto (la pone quien la usa). */
  className?: string
}

export default function Foto({ descripcion, src, proporcion = '3 / 2', className }: Props) {
  const style = { '--foto-proporcion': proporcion } as CSSProperties
  const clases = (base: string) => (className ? `${base} ${className}` : base)

  if (src) {
    return (
      <figure className={clases('foto')} style={style}>
        <img src={src} alt={descripcion} decoding="async" loading="lazy" />
      </figure>
    )
  }

  return (
    <figure
      className={clases('foto foto--pendiente')}
      style={style}
      role="img"
      aria-label={`Foto pendiente: ${descripcion}`}
    >
      <span className="foto-etiqueta">Foto pendiente</span>
      <span className="foto-descripcion">{descripcion}</span>
    </figure>
  )
}
