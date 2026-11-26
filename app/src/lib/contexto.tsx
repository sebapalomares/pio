import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { CENTRO_CAZORLA, PUNTOS, recolocarAlrededor, type Punto } from '../data/demo';
import { distancia, type Coordenadas } from './geo';
import { pedirPermisoBrujula, useBrujula, usePosicion, type Posicion } from './sensores';
import { useAlmacen } from './almacen';

interface Sensores {
  /** Sensores en marcha (GPS siempre; brújula tras un toque del usuario en iPhone). */
  brujulaActiva: boolean;
  activarBrujula: () => Promise<boolean>;
  avisoBrujula: boolean;
  posicion: Posicion | null;
  errorGps: string | null;
  orientacion: number | null;
  inclinacion: number | null;
  fuenteBrujula: string;
  /** Lugares con los que trabaja la app (recolocados alrededor en modo prueba). */
  puntos: Punto[];
  modoAlrededor: boolean;
}

const Contexto = createContext<Sensores | null>(null);

export function ProveedorSensores({ children }: { children: ReactNode }) {
  const [brujulaActiva, setBrujulaActiva] = useState(false);
  const [avisoBrujula, setAvisoBrujula] = useState(false);
  const { posicion, error: errorGps } = usePosicion(true);
  const { rumbo, inclinacion, fuente } = useBrujula(brujulaActiva);
  const { alrededor } = useAlmacen();

  // El origen del modo prueba se fija con la primera posición, para que los lugares no se muevan contigo
  const [origen, setOrigen] = useState<Coordenadas | null>(null);
  if (posicion && !origen) setOrigen({ lat: posicion.lat, lng: posicion.lng });

  // Si no se ha elegido, modo prueba automático cuando estás a más de 3 km de Cazorla
  const modoAlrededor = alrededor ?? (origen ? distancia(origen, CENTRO_CAZORLA) > 3000 : false);

  const puntos = useMemo(
    () => (modoAlrededor && origen ? recolocarAlrededor(PUNTOS, origen) : PUNTOS),
    [modoAlrededor, origen],
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
        orientacion: rumbo,
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
