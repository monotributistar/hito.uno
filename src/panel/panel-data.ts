/* Datos fijos del panel: como se ve cada tipo de objeto.
   El `kind` lo manda la API (viene del id impreso: `t-` tarjeta, `pt-` porta
   tarjetas, `ll-` llavero...). Las fotos son las mismas que ya usa la landing:
   el cliente reconoce el objeto que tiene en la mano. */

export type ObjectKindInfo = { label: string; photo?: string; monogram: string }

export const objectKinds: Record<string, ObjectKindInfo> = {
  tarjeta: {
    label: 'Tarjeta',
    photo: '/images/products/tarjeta/tarjeta-06.webp',
    monogram: 'T',
  },
  porta: {
    label: 'Porta tarjetas',
    photo: '/images/products/tarjeta/tarjeta-07.webp',
    monogram: 'PT',
  },
  llavero: {
    label: 'Llavero',
    photo: '/images/products/llavero/llavero-01.webp',
    monogram: 'LL',
  },
  apoyavasos: {
    label: 'Apoyavasos',
    photo: '/images/products/apoyavasos/apoyavasos-01.webp',
    monogram: 'AP',
  },
  placa: {
    label: 'Placa',
    photo: '/images/products/placa/placa-01.webp',
    monogram: 'PL',
  },
  recibidor: {
    label: 'Recibidor',
    photo: '/images/products/recibidor/recibidor-01.webp',
    monogram: 'RE',
  },
}

export function kindInfo(kind: string): ObjectKindInfo {
  return objectKinds[kind] ?? { label: 'Hito', monogram: 'H' }
}
