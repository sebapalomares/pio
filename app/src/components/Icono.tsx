// Iconos de trazo de 24 px y 2 px, un solo color (manual, sección 7).
// El pin relleno es de la marca: no está aquí, se usa /brand/pio-pin-azul.svg.

const TRAZOS = {
  camara: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  mapa: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M17 21h4v-4" /></>,
  pasaporte: <><circle cx="12" cy="9" r="6" /><path d="M8.5 14 7 22l5-3 5 3-1.5-8" /></>,
  gps: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" /></>,
  brujula: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  flecha: <path d="M12 3 5 20l7-4 7 4z" />,
  atras: <path d="m15 18-6-6 6-6" />,
  derecha: <path d="m9 18 6-6-6-6" />,
  arriba: <path d="m6 15 6-6 6 6" />,
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  buscar: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  filtro: <path d="M4 6h16M7 12h10M10 18h4" />,
  auriculares: <><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="7" rx="1.5" /><rect x="17" y="14" width="4" height="7" rx="1.5" /></>,
  marcador: <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  compartir: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  entrada: <><path d="M3 9h18v10H3zM3 9l3-5h12l3 5" /><path d="M12 13v2" /></>,
  telefono: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  mochila: <><path d="M5 8h14l-1 13H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  play: <path d="M7 4v16l13-8z" />,
  pausa: <path d="M8 5v14M16 5v14" />,
  castillo: <><path d="M4 21V9l3-2V4h3v2h4V4h3v3l3 2v12z" /><path d="M10 21v-5h4v5" /></>,
  gota: <><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" /><path d="M9 15a3 3 0 0 0 3 3" /></>,
  montana: <path d="m3 20 6-10 4 6 3-4 5 8z" />,
  capas: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  enlace: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v6H4V6h6" /></>,
  ubicacion: <><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
  lista: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tamano = 24, etiqueta }: { nombre: NombreIcono; tamano?: number; etiqueta?: string }) {
  const relleno = nombre === 'play';
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill={relleno ? 'currentColor' : 'none'}
      stroke={relleno ? 'none' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={etiqueta ? undefined : true}
      role={etiqueta ? 'img' : undefined}
      aria-label={etiqueta}
    >
      {TRAZOS[nombre]}
    </svg>
  );
}

export function iconoCategoria(slug: string): NombreIcono {
  if (slug === 'fuentes') return 'gota';
  if (slug === 'senderos') return 'montana';
  return 'castillo';
}

/** Icono de una ruta: el que se elige en WordPress (campo `icono`) si existe aquí; si no, el castillo. */
export function iconoRuta(icono: string | null): NombreIcono {
  return icono && Object.hasOwn(TRAZOS, icono) ? (icono as NombreIcono) : 'castillo';
}
