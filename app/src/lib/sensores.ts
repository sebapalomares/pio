import { useEffect, useRef, useState } from 'react';
import type { Coordenadas } from './geo';

export interface Posicion extends Coordenadas {
  precision: number; // metros
}

/** Posición GPS continua. */
export function usePosicion(activo: boolean) {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return;
    if (!('geolocation' in navigator)) {
      setError('Este dispositivo no tiene geolocalización.');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setError(null);
        setPosicion({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy });
      },
      (e) => setError(e.message || 'No se pudo obtener la ubicación.'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [activo]);

  return { posicion, error };
}

type OrientacionIOS = DeviceOrientationEvent & { webkitCompassHeading?: number };
type ConstructorConPermiso = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/** En iPhone hay que pedir permiso a la brújula desde un toque del usuario. */
export async function pedirPermisoBrujula(): Promise<boolean> {
  const C = DeviceOrientationEvent as ConstructorConPermiso;
  if (typeof C.requestPermission === 'function') {
    try {
      return (await C.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  return true; // Android y escritorio no lo piden
}

/**
 * Orientación de la brújula en grados desde el norte (0–360), suavizada.
 * iPhone: webkitCompassHeading. Android: deviceorientationabsolute (alpha).
 */
export function useBrujula(activo: boolean, suavizado = 0.2) {
  const [rumbo, setRumbo] = useState<number | null>(null);
  const [inclinacion, setInclinacion] = useState<number | null>(null);
  const [fuente, setFuente] = useState<string>('—');
  const ultimo = useRef<number | null>(null);
  const ultimaInclinacion = useRef<number | null>(null);

  useEffect(() => {
    if (!activo) return;

    /**
     * Inclinación de la cámara respecto al horizonte, en grados:
     * 0 = móvil vertical mirando al frente, positivo = mirando hacia arriba.
     * Sale de beta (90° con el móvil vertical en retrato).
     */
    const aplicarInclinacion = (beta: number | null) => {
      if (beta === null) return;
      const valor = Math.max(-90, Math.min(90, beta - 90));
      const previo = ultimaInclinacion.current;
      const nuevo = previo === null ? valor : previo + (valor - previo) * suavizado;
      ultimaInclinacion.current = nuevo;
      setInclinacion(nuevo);
    };

    const aplicar = (valor: number) => {
      const previo = ultimo.current;
      let nuevo = valor;
      if (previo !== null) {
        // Suavizado circular para evitar saltos 359° → 0°
        const delta = ((valor - previo + 540) % 360) - 180;
        nuevo = (previo + delta * suavizado + 360) % 360;
      }
      ultimo.current = nuevo;
      setRumbo(nuevo);
    };

    const manejarIOS = (e: Event) => {
      const ev = e as OrientacionIOS;
      if (typeof ev.webkitCompassHeading === 'number') {
        setFuente('iOS webkitCompassHeading');
        aplicar(ev.webkitCompassHeading);
      }
      aplicarInclinacion(ev.beta);
    };
    const manejarAbsoluto = (e: Event) => {
      const ev = e as DeviceOrientationEvent;
      if (ev.alpha !== null) {
        setFuente('Android deviceorientationabsolute');
        aplicar((360 - ev.alpha) % 360);
      }
      aplicarInclinacion(ev.beta);
    };

    const tieneAbsoluto = 'ondeviceorientationabsolute' in window;
    if (tieneAbsoluto) window.addEventListener('deviceorientationabsolute', manejarAbsoluto);
    else window.addEventListener('deviceorientation', manejarIOS);

    return () => {
      window.removeEventListener('deviceorientationabsolute', manejarAbsoluto);
      window.removeEventListener('deviceorientation', manejarIOS);
    };
  }, [activo, suavizado]);

  return { rumbo, inclinacion, fuente };
}

/** Cámara trasera en un <video>. */
export function useCamara(activo: boolean) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      })
      .catch((e: Error) => setError(e.message || 'No se pudo abrir la cámara.'));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [activo]);

  return { video, error };
}
