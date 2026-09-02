import type { ExperienceId } from '../experience-data'

export type UseCaseKey = 'networking' | 'ventas' | 'identificacion' | 'producto' | 'evento'
export type TapActionKey = 'guardar-contacto' | 'abrir-pagina' | 'mostrar-informacion' | 'iniciar-conversacion'
export type ObjectKey = 'tarjeta' | 'llavero' | 'apoyavasos' | 'placa' | 'packaging' | 'totem'

type UseCase = { label: string; description: string; sceneId: ExperienceId }
type TapAction = { label: string; promise: string }
type HitoObject = { label: string; moment: string; result: string; sceneId: ExperienceId; images?: string[] }

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
    sceneId: 'estudio-juridico',
    images: Array.from(
      { length: 12 },
      (_, index) => `/images/products/tarjeta/tarjeta-${String(index + 1).padStart(2, '0')}.webp`,
    ),
  },
  llavero: {
    label: 'Llavero',
    moment: 'En la visita a la propiedad.',
    result: 'Ficha, planos y contacto del asesor.',
    sceneId: 'inmobiliaria',
  },
  apoyavasos: {
    label: 'Apoyavasos',
    moment: 'Al sentarse en la mesa.',
    result: 'Carta, promo del día y playlist.',
    sceneId: 'bar',
  },
  placa: {
    label: 'Placa',
    moment: 'Al llegar al lugar.',
    result: 'Wi-Fi, servicios y asistencia.',
    sceneId: 'alojamiento',
  },
  packaging: {
    label: 'Packaging',
    moment: 'Al abrir el producto.',
    result: 'Recompra, cuidados y origen.',
    sceneId: 'pizzeria',
  },
  totem: {
    label: 'Tótem',
    moment: 'Al terminar la compra.',
    result: 'Reseña en dos segundos.',
    sceneId: 'comercio',
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
