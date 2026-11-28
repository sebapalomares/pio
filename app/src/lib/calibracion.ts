import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';

/**
 * Calibración de la RA guardada en el propio móvil (cada móvil tiene su brújula y su cámara).
 *
 * - desfase: grados que se suman a la brújula para que apunte bien (se mide apuntando
 *   a un lugar verificado, como el Castillo de la Yedra).
 * - campo: campo de visión horizontal de lo que se ve en pantalla, en grados. Si no se ha
 *   medido, se estima con el tamaño del vídeo de la cámara (ver estimarCampo).
 */
export interface Calibracion {
  desfase: number;
  campo: number | null;
  referencia: string | null; // nombre del lugar usado para calibrar
  fecha: string | null; // ISO
}

const CLAVE = 'pio:calibracion:v1';
const VACIA: Calibracion = { desfase: 0, campo: null, referencia: null, fecha: null };

/** Si no se puede medir ni estimar, el valor de siempre. */
export const CAMPO_POR_DEFECTO = 50;
/** Límites razonables para el campo de visión. */
export const CAMPO_MIN = 15;
export const CAMPO_MAX = 100;

function leer(): Calibracion {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? { ...VACIA, ...JSON.parse(crudo) } : VACIA;
  } catch {
    return VACIA;
  }
}

let estado = leer();
const oyentes = new Set<() => void>();

function guardar(cambios: Partial<Calibracion>) {
  estado = { ...estado, ...cambios };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    /* sin almacenamiento: se mantiene mientras la app esté abierta */
  }
  oyentes.forEach((o) => o());
}

const suscribir = (o: () => void) => {
  oyentes.add(o);
  return () => {
    oyentes.delete(o);
  };
};

/** Calibración compartida entre pantallas. */
export function useCalibracion() {
  return useSyncExternalStore(suscribir, () => estado);
}

export const calibracion = {
  ponerDesfase(desfase: number, referencia: string | null) {
    guardar({ desfase: normalizar(desfase), referencia, fecha: new Date().toISOString() });
  },
  ajustarDesfase(delta: number) {
    guardar({ desfase: normalizar(estado.desfase + delta), fecha: new Date().toISOString() });
  },
  ponerCampo(campo: number | null) {
    guardar({ campo: campo === null ? null : limitar(campo, CAMPO_MIN, CAMPO_MAX), fecha: new Date().toISOString() });
  },
  reiniciar() {
    guardar(VACIA);
  },
};

/** Ángulo a −180…180. */
export function normalizar(a: number) {
  return ((((a + 180) % 360) + 360) % 360) - 180;
}

/** Rumbo de la brújula con el desfase aplicado (0–360). */
export function corregirRumbo(rumbo: number | null, desfase: number) {
  return rumbo === null ? null : (((rumbo + desfase) % 360) + 360) % 360;
}

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Media de varios rumbos (media circular: 359° y 1° dan 0°, no 180°).
 * Se usa al calibrar para no depender de una sola lectura.
 */
export function mediaCircular(rumbos: number[]) {
  if (!rumbos.length) return null;
  let x = 0;
  let y = 0;
  for (const r of rumbos) {
    x += Math.cos((r * Math.PI) / 180);
    y += Math.sin((r * Math.PI) / 180);
  }
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Campo de visión de la cámara principal a lo largo del lado largo del sensor (≈ 26 mm equivalentes).
 * Es una aproximación: la calibración lo afina para cada móvil.
 */
const CAMPO_LADO_LARGO = 68;

/**
 * Estima el campo de visión horizontal de lo que se ve en pantalla: el vídeo se recorta
 * para llenarla (object-fit: cover), así que se ve menos de lo que capta la cámara.
 */
export function estimarCampo(video: HTMLVideoElement | null): number | null {
  if (!video || !video.videoWidth || !video.videoHeight || !video.clientWidth || !video.clientHeight) return null;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const focal = Math.max(vw, vh) / 2 / Math.tan(((CAMPO_LADO_LARGO / 2) * Math.PI) / 180); // en píxeles del vídeo
  const escala = Math.max(video.clientWidth / vw, video.clientHeight / vh);
  const medioAnchoVisible = video.clientWidth / 2 / escala;
  const campo = (2 * Math.atan(medioAnchoVisible / focal) * 180) / Math.PI;
  return limitar(Math.round(campo), CAMPO_MIN, CAMPO_MAX);
}

/**
 * Campo de visión que usan las pantallas de cámara: el medido al calibrar o, si no,
 * el estimado con el vídeo (se recalcula al girar el móvil o cambiar el tamaño).
 */
export function useCampoVision(video: RefObject<HTMLVideoElement | null>) {
  const { campo } = useCalibracion();
  const [estimado, setEstimado] = useState<number | null>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const medir = () => setEstimado(estimarCampo(v));
    medir();
    v.addEventListener('loadedmetadata', medir);
    v.addEventListener('resize', medir);
    window.addEventListener('resize', medir);
    return () => {
      v.removeEventListener('loadedmetadata', medir);
      v.removeEventListener('resize', medir);
      window.removeEventListener('resize', medir);
    };
  }, [video]);

  return { campo: campo ?? estimado ?? CAMPO_POR_DEFECTO, medido: campo !== null, estimado };
}

/** Campo de visión vertical a partir del horizontal y de la forma de la pantalla. */
export function campoVertical(campoHorizontal: number, ancho = window.innerWidth, alto = window.innerHeight) {
  return (2 * Math.atan(Math.tan(((campoHorizontal / 2) * Math.PI) / 180) * (alto / ancho)) * 180) / Math.PI;
}
