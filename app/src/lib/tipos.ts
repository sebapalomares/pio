import type { Coordenadas } from './geo';

/**
 * Tipos con los que trabaja la app. Salen de la API del plugin (/wp-json/pio/v1,
 * ver 03-modelo-datos-api.md) ya convertidos por `lib/api.ts`: ids como texto,
 * entidades HTML resueltas y descripciones saneadas.
 */

export interface Categoria {
  id?: number;
  nombre: string;
  slug: string;
}

/** Punto para el mapa, la lista y la RA. Siempre tiene coordenadas (D19: los que no, no entran). */
export interface Punto extends Coordenadas {
  id: string;
  nombre: string;
  categoria: Categoria;
  altitud: number | null;
  /** Foto principal (tamaño medio) o null. */
  foto: string | null;
  /** true si la ubicación está confirmada en «Verificar en el mapa» del plugin (D18). */
  verificado: boolean;
}

/** Ficha completa (/puntos/{id}). Puede no tener coordenadas. */
export interface FichaPunto extends Omit<Punto, 'lat' | 'lng'> {
  lat: number | null;
  lng: number | null;
  /** HTML saneado, listo para pintar. */
  descripcion: string;
  /** La descripción en texto plano, para leerla en voz alta. */
  texto: string;
  galeria: string[];
  direccion: string | null;
  horario: string | null;
  precio: string | null;
  telefono: string | null;
  web: string | null;
  reserva_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  /** Ficha del punto en la web. */
  enlace: string | null;
}

export interface Ruta {
  id: string;
  nombre: string;
  descripcion: string;
  color: string | null;
  icono: string | null;
  /** Ids de los puntos, en orden. */
  paradas: string[];
  /** Nombre de cada parada, para las que no salen en el mapa (sin coordenadas). */
  nombres: Record<string, string>;
  /** Recorrido a pie entre paradas, [lng, lat], calculado en WordPress (D25). Null si aún no lo hay. */
  trazado: [number, number][] | null;
  /** Metros y segundos andando de toda la ruta, si hay trazado. */
  distancia: number | null;
  duracion: number | null;
}

export interface Datos {
  puntos: Punto[];
  categorias: Categoria[];
  rutas: Ruta[];
}

/** Lo que devuelve /qr/{codigo}, reducido a lo que usa la app. */
export interface PuntoQr {
  id: string;
  nombre: string;
}

export const tieneCoordenadas = <T extends { lat: number | null; lng: number | null }>(p: T): p is T & Coordenadas =>
  typeof p.lat === 'number' && typeof p.lng === 'number';
