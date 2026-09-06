import type { PartnerLinkKind } from './partners'

/* Iconos propios, dibujados con primitivas simples sobre una grilla de 24x24.
   No usamos los logos oficiales de las plataformas para no depender de sus
   marcas registradas: cada boton se identifica por su forma + la etiqueta. */
export default function PartnerIcon({ kind }: { kind: PartnerLinkKind }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 22,
    height: 22,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  switch (kind) {
    case 'whatsapp':
      // Burbuja de chat con la cola hacia abajo a la izquierda.
      return (
        <svg {...common}>
          <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.3A8.5 8.5 0 1 1 20.5 11.6Z" />
          <path d="M9.2 9.1c.3 1.9 2 3.9 4.1 4.6l1-1.2 1.9.9c-.3 1.2-1.6 1.7-2.8 1.4-2.7-.6-5-3-5.6-5.7-.2-1.1.3-2.3 1.5-2.6l.9 1.9-1 .7Z" />
        </svg>
      )
    case 'instagram':
      // Cuadrado redondeado con lente y flash.
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'facebook':
      // Circulo con una "f" trazada a mano.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M14.4 7.8h-1.3c-1 0-1.7.7-1.7 1.7v6.7" />
          <path d="M9.6 12h4" />
        </svg>
      )
    case 'email':
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m4 7 8 5.5L20 7" />
        </svg>
      )
    case 'web':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5s-1.2 6.2-3.4 8.5c-2.2-2.3-3.4-5.3-3.4-8.5S9.8 5.8 12 3.5Z" />
        </svg>
      )
  }
}
