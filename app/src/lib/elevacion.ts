import { useEffect, useRef, useState } from 'react';
import { distancia, type Coordenadas } from './geo';

/**
 * Altitud del terreno (modelo digital de elevaciones Copernicus, 90 m) para colocar
 * las marcas de RA a su altura: el Castillo de la Yedra está muy por encima del casco.
 *
 * Fuente: API de elevación de Open-Meteo (gratuita, sin clave). Solo se envían coordenadas
 * redondeadas a 4 decimales (≈ 10 m), sin ningún dato del usuario. Si falla, las marcas
 * vuelven al horizonte, como antes.
 */

const API = 'https://api.open-meteo.com/v1/elevation';
const CLAVE = 'pio:elevaciones:v1';

/** Altura sobre el suelo a la que apuntar en un monumento (m): ni el pie ni el tejado. */
export const ALTURA_OBJETIVO = 6;
/** Altura de los ojos / del móvil sobre el suelo (m). */
export const ALTURA_OJOS = 1.5;

const clave = (c: Coordenadas) => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;

function leerCache(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '{}');
  } catch {
    return {};
  }
}
const cache: Record<string, number> = leerCache();

function guardarCache() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(cache));
  } catch {
    /* sin almacenamiento: solo en memoria */
  }
}

/** Pide las altitudes que falten (de 100 en 100). */
async function pedir(coords: Coordenadas[]) {
  const faltan = [...new Map(coords.filter((c) => !(clave(c) in cache)).map((c) => [clave(c), c])).values()];
  for (let i = 0; i < faltan.length; i += 100) {
    const lote = faltan.slice(i, i + 100);
    const url = `${API}?latitude=${lote.map((c) => c.lat.toFixed(4)).join(',')}&longitude=${lote
      .map((c) => c.lng.toFixed(4))
      .join(',')}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    const { elevation } = (await r.json()) as { elevation: number[] };
    lote.forEach((c, j) => {
      if (typeof elevation[j] === 'number') cache[clave(c)] = elevation[j];
    });
  }
  guardarCache();
}

export const altitudDe = (c: Coordenadas): number | null => cache[clave(c)] ?? null;

/**
 * Altitudes de los lugares y la tuya. La tuya se vuelve a pedir cuando te mueves más de 25 m.
 * Devuelve un número que cambia cada vez que llegan datos nuevos, para recalcular.
 */
export function useElevaciones(puntos: Coordenadas[], posicion: Coordenadas | null) {
  const [version, setVersion] = useState(0);
  const ultima = useRef<Coordenadas | null>(null);

  useEffect(() => {
    let vivo = true;
    pedir(puntos)
      .then(() => vivo && setVersion((v) => v + 1))
      .catch(() => {
        /* sin conexión o sin servicio: las marcas quedan en el horizonte */
      });
    return () => {
      vivo = false;
    };
  }, [puntos]);

  useEffect(() => {
    if (!posicion) return;
    if (ultima.current && distancia(ultima.current, posicion) < 25) return;
    ultima.current = { lat: posicion.lat, lng: posicion.lng };
    let vivo = true;
    pedir([posicion])
      .then(() => vivo && setVersion((v) => v + 1))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [posicion]);

  return version;
}

/**
 * Ángulo de elevación (grados) desde tus ojos hasta el lugar: positivo si está más alto.
 * null si falta alguna altitud.
 */
export function anguloElevacion(desde: Coordenadas, hasta: Coordenadas, d: number): number | null {
  const yo = altitudDe(desde);
  const el = altitudDe(hasta);
  if (yo === null || el === null || d < 1) return null;
  return (Math.atan2(el + ALTURA_OBJETIVO - (yo + ALTURA_OJOS), d) * 180) / Math.PI;
}
