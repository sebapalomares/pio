import type { Coordenadas } from '../lib/geo';

/**
 * Datos de DEMOSTRACIÓN. La app ya usa la API del plugin (lib/datos.tsx); estos datos solo se
 * usan como respaldo en desarrollo (data/respaldo-demo.ts) y para el importador del plugin
 * en webs sin puntos propios (`npm run exportar-demo-wp`). Nunca en producción.
 *
 * - Coordenadas: los 4 monumentos están verificados sobre el terreno; las fuentes son huecos de prueba.
 * - Lo que va entre [corchetes] lo rellenará cada gestor en WordPress: no se inventa.
 * - Los nombres de las fuentes son huecos hasta tener los reales.
 */

export interface Categoria {
  nombre: string;
  slug: 'monumentos' | 'fuentes' | 'senderos' | 'comer';
}

export interface Punto extends Coordenadas {
  id: string;
  nombre: string;
  categoria: Categoria;
  descripcion: string;
  horario: string | null;
  precio: string | null;
  telefono: string | null;
  web: string | null;
  reserva_url: string | null;
  audio_url: string | null;
  num_fotos: number;
  qr_codigo: string;
  /** Solo en /puntos/{id}: dirección legible (en turismocazorla.info, el campo «detalles-direccion» de Toolset). */
  direccion?: string | null;
  /** Solo en /puntos/{id}: ficha del punto en la web. */
  enlace?: string;
  /** true si las coordenadas están confirmadas en la pantalla «Verificar en el mapa» del plugin (D18). */
  verificado: boolean;
}

export interface Ruta {
  id: string;
  nombre: string;
  tipo: 'urbana' | 'sendero';
  descripcion: string;
  paradas: string[]; // ids de puntos, en orden
}

const MONUMENTO: Categoria = { nombre: 'Monumento', slug: 'monumentos' };
const FUENTE: Categoria = { nombre: 'Fuente', slug: 'fuentes' };

export const PUNTOS: Punto[] = [
  {
    id: 'yedra',
    nombre: 'Castillo de la Yedra',
    categoria: MONUMENTO,
    lat: 37.90743593295055, // Verificada por Sebastián (26/11/2026)
    lng: -3.0014442711889884,
    descripcion:
      'Fortaleza que domina Cazorla desde lo alto del casco antiguo. Alberga el Museo de Artes y Costumbres Populares del Alto Guadalquivir. [Texto ampliado que redacta el gestor del lugar.]',
    horario: '[Horario]',
    precio: '[Precio]',
    telefono: '[Teléfono]',
    web: 'https://turismocazorla.info',
    reserva_url: 'https://turismocazorla.info',
    audio_url: null,
    num_fotos: 6,
    qr_codigo: 'demo-yedra',
    verificado: true,
  },
  {
    id: 'santa-maria',
    nombre: 'Ruinas de Santa María',
    categoria: MONUMENTO,
    lat: 37.90839513968401, // Verificada por Sebastián (26/11/2026)
    lng: -2.9997676695709248,
    descripcion: 'Restos de la iglesia de Santa María, junto a la plaza del mismo nombre. [Texto ampliado que redacta el gestor del lugar.]',
    horario: '[Horario]',
    precio: '[Precio]',
    telefono: null,
    web: 'https://turismocazorla.info',
    reserva_url: 'https://turismocazorla.info',
    audio_url: null,
    num_fotos: 4,
    qr_codigo: 'demo-santa-maria',
    verificado: true,
  },
  {
    id: 'corredera',
    nombre: 'Plaza de la Corredera',
    categoria: MONUMENTO,
    lat: 37.91095938644883, // Verificada por Sebastián (26/11/2026)
    lng: -3.0025005515625707,
    descripcion: 'Plaza principal del casco urbano. [Texto ampliado que redacta el gestor del lugar.]',
    horario: null,
    precio: null,
    telefono: null,
    web: null,
    reserva_url: null,
    audio_url: null,
    num_fotos: 3,
    qr_codigo: 'demo-corredera',
    verificado: true,
  },
  {
    id: 'san-jose',
    nombre: 'Iglesia de San José',
    categoria: MONUMENTO,
    lat: 37.91138646100681, // Verificada por Sebastián (26/11/2026)
    lng: -3.00256821536116,
    descripcion: '[Texto que redacta el gestor del lugar.]',
    horario: '[Horario]',
    precio: null,
    telefono: null,
    web: null,
    reserva_url: null,
    audio_url: null,
    num_fotos: 2,
    qr_codigo: 'demo-san-jose',
    verificado: true,
  },
  ...[1, 2, 3].map(
    (n): Punto => ({
      id: `fuente-${n}`,
      nombre: `Fuente [nombre ${n}]`,
      categoria: FUENTE,
      lat: 37.9118 + n * 0.0006,
      lng: -3.0016 - n * 0.0005,
      descripcion: '[Texto que redacta el gestor del lugar.]',
      horario: null,
      precio: null,
      telefono: null,
      web: null,
      reserva_url: null,
      audio_url: null,
      num_fotos: 1,
      qr_codigo: `demo-fuente-${n}`,
      verificado: false,
    }),
  ),
];

export const RUTAS: Ruta[] = [
  {
    id: 'monumental',
    nombre: 'Ruta monumental',
    tipo: 'urbana',
    descripcion: 'Los monumentos principales del casco antiguo.',
    paradas: ['yedra', 'santa-maria', 'corredera', 'san-jose'],
  },
  {
    id: 'fuentes',
    nombre: 'Ruta de las fuentes',
    tipo: 'urbana',
    descripcion: 'Fuentes y caños del casco urbano.',
    paradas: ['fuente-1', 'fuente-2', 'fuente-3'],
  },
];

export const CATEGORIAS: Categoria[] = [MONUMENTO, FUENTE];

/**
 * Quién y cuándo verificó los puntos con `verificado: true`. Solo lo usa el importador
 * de demostración del plugin (`npm run exportar-demo-wp`); la API pública no lo expone.
 */
export const VERIFICACION_DEMO = { por: 'Sebastián', fecha: '2026-11-26', metodo: 'terreno' } as const;
