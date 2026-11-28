import { useMemo } from 'react';
import type { Punto } from './tipos';
import { anguloRelativo, distancia, rumbo, type Coordenadas } from './geo';

export const CAMPO_VISION = 50; // campo de visión horizontal de la cámara en vertical (grados)

export interface PuntoEnVista extends Punto {
  d: number; // metros
  rel: number; // grados respecto a donde miras (-180..180)
}

/** Puntos con su distancia y su ángulo respecto a la dirección en la que apunta la cámara. */
export function usePuntosEnVista(puntos: Punto[], posicion: Coordenadas | null, orientacion: number | null) {
  return useMemo(() => {
    if (!posicion) return [] as PuntoEnVista[];
    return puntos
      .map((p) => ({
        ...p,
        d: distancia(posicion, p),
        rel: orientacion === null ? 0 : anguloRelativo(rumbo(posicion, p), orientacion),
      }))
      .sort((a, b) => a.d - b.d);
  }, [puntos, posicion, orientacion]);
}

/** Altura del horizonte en pantalla (en %), que sube y baja al inclinar el móvil. */
export function alturaHorizonte(inclinacion: number | null, campo = CAMPO_VISION) {
  const campoVertical =
    (2 * Math.atan(Math.tan(((campo / 2) * Math.PI) / 180) * (window.innerHeight / window.innerWidth)) * 180) / Math.PI;
  return 50 + ((inclinacion ?? 0) / (campoVertical / 2)) * 50;
}

/** Minutos a pie (unos 4,5 km/h por el casco antiguo, con cuestas). */
export const minutosAPie = (metros: number) => Math.max(1, Math.round(metros / 75));

/**
 * El lugar más centrado, con histéresis: el anterior sigue mientras esté a menos de un 25 %
 * del ancho del centro y ningún otro esté claramente más centrado (8° más).
 */
export function elegirCentrado<T extends { id: string; rel: number }>(visibles: T[], anterior: string | null, campo: number): string | null {
  const mejor = visibles.reduce<T | null>((m, p) => (!m || Math.abs(p.rel) < Math.abs(m.rel) ? p : m), null);
  const previo = anterior ? visibles.find((p) => p.id === anterior) : undefined;
  if (previo && Math.abs(previo.rel) < campo * 0.25 && (!mejor || Math.abs(previo.rel) - Math.abs(mejor.rel) < 8)) return previo.id;
  return mejor && Math.abs(mejor.rel) < campo * 0.15 ? mejor.id : null;
}
