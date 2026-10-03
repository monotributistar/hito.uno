/* El recorrido de un Hito, dibujado: el objeto, el toque, la pagina.

   Por que un dibujo y no una foto: la puerta Personal mostraba una captura del
   perfil de Stephano, con su cara. La home no tiene por que presentar a una
   persona para explicar el servicio (Stephano, 2026-10-03). Un diagrama dice lo
   mismo y no envejece cuando cambia el perfil que se use de muestra.

   Va inline y no como archivo .svg: asi hereda las fuentes del sitio (DM Sans y
   Space Mono vienen de Google Fonts, y un <img src="*.svg"> no las carga) y los
   colores se leen de la misma paleta que el resto.

   Es decorativo: el texto de la puerta ya dice lo mismo en palabras, asi que
   lleva aria-hidden y no se anuncia dos veces. */

const VERDE = '#17383a'
const CORAL = '#ed8068'
const SUAVE = 'rgba(23, 56, 58, 0.18)'

export default function DiagramaRecorrido({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 640 400"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="640" height="400" fill="#e6ebe2" />

      {/* 1 · El objeto: una tarjeta con su codigo */}
      <g>
        <rect x="46" y="150" width="132" height="86" rx="12" fill="#fdfdfb" stroke={VERDE} strokeWidth="2.5" />
        <rect x="62" y="166" width="34" height="34" rx="4" fill="none" stroke={VERDE} strokeWidth="2.5" />
        <rect x="70" y="174" width="18" height="18" rx="2" fill={VERDE} />
        <path d="M62 214h100M62 226h72" stroke={SUAVE} strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* 2 · El toque: las ondas que salen del objeto */}
      <g stroke={CORAL} strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M232 170a44 44 0 0 1 0 46" />
        <path d="M258 156a72 72 0 0 1 0 74" />
        <path d="M284 142a100 100 0 0 1 0 102" />
      </g>

      {/* 3 · La pagina: el celular que se abrio */}
      <g>
        <rect x="412" y="92" width="150" height="202" rx="18" fill="#fdfdfb" stroke={VERDE} strokeWidth="2.5" />
        <rect x="468" y="104" width="38" height="6" rx="3" fill={SUAVE} />
        <circle cx="487" cy="146" r="20" fill={CORAL} opacity="0.9" />
        <path d="M444 184h86M460 200h54" stroke={VERDE} strokeWidth="5" strokeLinecap="round" />
        <rect x="438" y="222" width="98" height="24" rx="12" fill={VERDE} />
        <rect x="438" y="256" width="98" height="24" rx="12" fill="none" stroke={SUAVE} strokeWidth="2.5" />
      </g>

      {/* Los tres rotulos, en la mono del sitio */}
      <g fill={VERDE} fontFamily="'Space Mono', ui-monospace, monospace" fontSize="19" letterSpacing="1">
        <text x="112" y="294" textAnchor="middle">
          EL OBJETO
        </text>
        <text x="282" y="294" textAnchor="middle" fill={CORAL}>
          UN TOQUE
        </text>
        <text x="487" y="330" textAnchor="middle">
          TU PÁGINA
        </text>
      </g>
    </svg>
  )
}
