// Cálculos geográficos básicos para Pío.

export interface Coordenadas {
  lat: number;
  lng: number;
}

const RADIO_TIERRA_M = 6371000;
const aRad = (g: number) => (g * Math.PI) / 180;
const aGrados = (r: number) => (r * 180) / Math.PI;

/** Distancia en metros entre dos puntos (fórmula del haversine). */
export function distancia(a: Coordenadas, b: Coordenadas): number {
  const dLat = aRad(b.lat - a.lat);
  const dLng = aRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRad(a.lat)) * Math.cos(aRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/** Rumbo inicial de a hacia b, en grados desde el norte (0–360). */
export function rumbo(a: Coordenadas, b: Coordenadas): number {
  const φ1 = aRad(a.lat);
  const φ2 = aRad(b.lat);
  const Δλ = aRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (aGrados(Math.atan2(y, x)) + 360) % 360;
}

/** Diferencia de ángulo en el rango -180..180 (negativo = a la izquierda). */
export function anguloRelativo(rumboPunto: number, orientacion: number): number {
  return ((rumboPunto - orientacion + 540) % 360) - 180;
}

/** Punto situado a `metros` en la dirección `grados` desde el origen. */
export function desplazar(origen: Coordenadas, grados: number, metros: number): Coordenadas {
  const δ = metros / RADIO_TIERRA_M;
  const θ = aRad(grados);
  const φ1 = aRad(origen.lat);
  const λ1 = aRad(origen.lng);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: aGrados(φ2), lng: aGrados(λ2) };
}

export function formatearDistancia(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Centro aproximado de Cazorla, para decidir si el usuario está allí y centrar el mapa. */
export const CENTRO_CAZORLA: Coordenadas = { lat: 37.9125, lng: -3.0025 };
