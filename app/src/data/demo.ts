import { desplazar, type Coordenadas } from '../lib/geo';

/**
 * Datos de DEMOSTRACIÓN con la misma forma que devolverá la API del plugin
 * (/wp-json/pio/v1, ver 03-modelo-datos-api.md).
 *
 * - Coordenadas aproximadas: verificarlas antes de sacar conclusiones de precisión.
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
    lat: 37.9099,
    lng: -3.0001,
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
  },
  {
    id: 'santa-maria',
    nombre: 'Ruinas de Santa María',
    categoria: MONUMENTO,
    lat: 37.911,
    lng: -3.0026,
    descripcion: 'Restos de la iglesia de Santa María, junto a la plaza del mismo nombre. [Texto ampliado que redacta el gestor del lugar.]',
    horario: '[Horario]',
    precio: '[Precio]',
    telefono: null,
    web: 'https://turismocazorla.info',
    reserva_url: 'https://turismocazorla.info',
    audio_url: null,
    num_fotos: 4,
    qr_codigo: 'demo-santa-maria',
  },
  {
    id: 'corredera',
    nombre: 'Plaza de la Corredera',
    categoria: MONUMENTO,
    lat: 37.9142,
    lng: -3.0035,
    descripcion: 'Plaza principal del casco urbano. [Texto ampliado que redacta el gestor del lugar.]',
    horario: null,
    precio: null,
    telefono: null,
    web: null,
    reserva_url: null,
    audio_url: null,
    num_fotos: 3,
    qr_codigo: 'demo-corredera',
  },
  {
    id: 'san-jose',
    nombre: 'Iglesia de San José',
    categoria: MONUMENTO,
    lat: 37.9134,
    lng: -3.0044,
    descripcion: '[Texto que redacta el gestor del lugar.]',
    horario: '[Horario]',
    precio: null,
    telefono: null,
    web: null,
    reserva_url: null,
    audio_url: null,
    num_fotos: 2,
    qr_codigo: 'demo-san-jose',
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

/** Centro aproximado de Cazorla, para decidir si el usuario está allí. */
export const CENTRO_CAZORLA: Coordenadas = { lat: 37.9125, lng: -3.0025 };

/**
 * Modo prueba: los mismos lugares, recolocados en círculo alrededor de un origen
 * (entre 80 y 260 m), para probar la app en cualquier sitio.
 */
export function recolocarAlrededor(puntos: Punto[], origen: Coordenadas): Punto[] {
  return puntos.map((p, i) => {
    const angulo = (i * 360) / puntos.length;
    const metros = 80 + ((i * 37) % 180);
    return { ...p, ...desplazar(origen, angulo, metros) };
  });
}

export const buscarPunto = (id: string, lista: Punto[] = PUNTOS) => lista.find((p) => p.id === id);
export const buscarRuta = (id: string) => RUTAS.find((r) => r.id === id);
export const buscarPorQr = (codigo: string, lista: Punto[] = PUNTOS) => lista.find((p) => p.qr_codigo === codigo);
export const rutasDePunto = (id: string) => RUTAS.filter((r) => r.paradas.includes(id));
