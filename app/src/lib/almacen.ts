import { useCallback, useEffect, useState } from 'react';

/**
 * Datos guardados en el propio móvil (D5): sellos del pasaporte, mochila y ajustes.
 * localStorage puede fallar (modo privado, memoria llena): siempre con try/catch.
 * Más adelante pasará a IndexedDB junto con la mochila sin conexión (D12).
 */

const CLAVE = 'pio:v1';

interface Estado {
  sellos: Record<string, string>; // idPunto → fecha ISO
  mochila: string[]; // ids de puntos o rutas
  alrededor: boolean | null; // modo prueba; null = decidir según la distancia a Cazorla
}

const VACIO: Estado = { sellos: {}, mochila: [], alrededor: null };

function leer(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? { ...VACIO, ...JSON.parse(crudo) } : VACIO;
  } catch {
    return VACIO;
  }
}

let estado: Estado = leer();
const oyentes = new Set<() => void>();

function guardar(nuevo: Estado) {
  estado = nuevo;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(nuevo));
  } catch {
    /* sin almacenamiento: se mantiene solo en memoria */
  }
  oyentes.forEach((o) => o());
}

/** Estado compartido entre pantallas, con funciones para cambiarlo. */
export function useAlmacen() {
  const [, refrescar] = useState(0);
  useEffect(() => {
    const oyente = () => refrescar((n) => n + 1);
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  }, []);

  const sellar = useCallback((id: string) => {
    if (estado.sellos[id]) return;
    guardar({ ...estado, sellos: { ...estado.sellos, [id]: new Date().toISOString() } });
  }, []);
  const alternarMochila = useCallback((id: string) => {
    const mochila = estado.mochila.includes(id) ? estado.mochila.filter((m) => m !== id) : [...estado.mochila, id];
    guardar({ ...estado, mochila });
  }, []);
  const ponerAlrededor = useCallback((valor: boolean) => guardar({ ...estado, alrededor: valor }), []);
  const borrarSellos = useCallback(() => guardar({ ...estado, sellos: {} }), []);

  return { ...estado, sellar, alternarMochila, ponerAlrededor, borrarSellos };
}
