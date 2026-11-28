import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { CENTRO_CAZORLA, desplazar, distancia, type Coordenadas } from './geo';
import type { Punto } from './tipos';
import { useDatos } from './datos';
import { pedirPermisoBrujula, useBrujula, usePosicion, type Posicion } from './sensores';
import { useAlmacen } from './almacen';
import { corregirRumbo, useCalibracion } from './calibracion';

interface Sensores {
  /** Sensores en marcha (GPS siempre; brújula tras un toque del usuario en iPhone). */
  brujulaActiva: boolean;
  activarBrujula: () => Promise<boolean>;
  avisoBrujula: boolean;
  posicion: Posicion | null;
  errorGps: string | null;
  /** Hacia dónde mira la cámara, con la calibración aplicada (0–360). */
  orientacion: number | null;
  /** Lo que dice la brújula sin corregir (para calibrar). */
  orientacionBruta: number | null;
  /** Precisión de la brújula en grados (iPhone); -1 = no fiable; null = desconocida. */
  precisionBrujula: number | null;
  inclinacion: number | null;
  fuenteBrujula: string;
  /** Lugares con coordenadas de la API (recolocados alrededor en modo prueba). */
  puntos: Punto[];
  modoAlrededor: boolean;
}

const Contexto = createContext<Sensores | null>(null);

const SIN_PUNTOS: Punto[] = [];

/**
 * Modo prueba: los mismos lugares, recolocados en círculo alrededor de un origen
 * (entre 80 y 260 m), para probar la app en cualquier sitio.
 */
function recolocarAlrededor(puntos: Punto[], origen: Coordenadas): Punto[] {
  return puntos.map((p, i) => {
    const angulo = (i * 360) / puntos.length;
    const metros = 80 + ((i * 37) % 180);
    return { ...p, ...desplazar(origen, angulo, metros) };
  });
}

export function ProveedorSensores({ children }: { children: ReactNode }) {
  const [brujulaActiva, setBrujulaActiva] = useState(false);
  const [avisoBrujula, setAvisoBrujula] = useState(false);
  const { posicion, error: errorGps } = usePosicion(true);
  const { rumbo, inclinacion, fuente, precision } = useBrujula(brujulaActiva);
  const { desfase } = useCalibracion();
  const { alrededor } = useAlmacen();
  const reales = useDatos().datos?.puntos ?? SIN_PUNTOS;

  // El origen del modo prueba se fija con la primera posición, para que los lugares no se muevan contigo
  const [origen, setOrigen] = useState<Coordenadas | null>(null);
  if (posicion && !origen) setOrigen({ lat: posicion.lat, lng: posicion.lng });

  // Si no se ha elegido, modo prueba automático cuando estás a más de 3 km de Cazorla
  const modoAlrededor = alrededor ?? (origen ? distancia(origen, CENTRO_CAZORLA) > 3000 : false);

  const puntos = useMemo(
    () => (modoAlrededor && origen ? recolocarAlrededor(reales, origen) : reales),
    [modoAlrededor, origen, reales],
  );

  const activarBrujula = async () => {
    const ok = await pedirPermisoBrujula();
    setAvisoBrujula(!ok);
    setBrujulaActiva(true);
    return ok;
  };

  return (
    <Contexto.Provider
      value={{
        brujulaActiva,
        activarBrujula,
        avisoBrujula,
        posicion,
        errorGps,
        orientacion: corregirRumbo(rumbo, desfase),
        orientacionBruta: rumbo,
        precisionBrujula: precision,
        inclinacion,
        fuenteBrujula: fuente,
        puntos,
        modoAlrededor,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useSensores() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useSensores fuera de ProveedorSensores');
  return c;
}
