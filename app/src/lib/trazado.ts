/**
 * Trazado a pie de una ruta (D25).
 *
 * 1. El que calcula WordPress y llega en la API (lo normal).
 * 2. Si aún no lo hay, la app lo pide al mismo enrutador a pie y lo guarda en el móvil.
 * 3. Si tampoco se puede (sin cobertura), se unen las paradas en recto y se avisa.
 */
import { useEffect, useState } from 'react';
import { aTrazado } from './api';
import type { Coordenadas } from './geo';
import type { Ruta } from './tipos';

const ENRUTADOR_PIE = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/';
const CLAVE = 'pio.trazados.v1';

export interface Trazado {
  coords: [number, number][];
  /** Metros y segundos andando; null si el trazado es en recto. */
  distancia: number | null;
  duracion: number | null;
  /** Falso cuando son rectas entre paradas (no se pudo calcular el camino a pie). */
  aPie: boolean;
}

type Guardado = Record<string, { coords: [number, number][]; distancia: number; duracion: number }>;

const firma = (paradas: Coordenadas[]) => paradas.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');

function leer(): Guardado {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || '{}') as Guardado;
  } catch {
    return {};
  }
}
function guardar(clave: string, valor: Guardado[string]) {
  try {
    const todo = leer();
    todo[clave] = valor;
    // Solo los 20 últimos, para no llenar el almacenamiento
    const claves = Object.keys(todo);
    for (const k of claves.slice(0, Math.max(0, claves.length - 20))) delete todo[k];
    localStorage.setItem(CLAVE, JSON.stringify(todo));
  } catch {
    /* almacenamiento lleno o modo privado: se volverá a pedir */
  }
}

async function pedirAPie(paradas: Coordenadas[]): Promise<Guardado[string] | null> {
  try {
    const r = await fetch(`${ENRUTADOR_PIE}${firma(paradas)}?overview=full&geometries=geojson&steps=false`);
    if (!r.ok) return null;
    const d = await r.json();
    const ruta = d?.routes?.[0];
    const coords = aTrazado(ruta?.geometry?.coordinates);
    if (d?.code !== 'Ok' || !coords) return null;
    return { coords, distancia: Math.round(ruta.distance), duracion: Math.round(ruta.duration) };
  } catch {
    return null;
  }
}

/** Trazado de la ruta con sus paradas en orden (solo las que tienen coordenadas). */
export function useTrazado(ruta: Ruta | null | undefined, paradas: Coordenadas[]): Trazado | null {
  const clave = firma(paradas);
  const [pedido, setPedido] = useState<{ clave: string; valor: Guardado[string] | null } | null>(null);

  const deApi = ruta?.trazado ?? null;
  const necesitaPedir = Boolean(ruta) && !deApi && paradas.length >= 2;

  useEffect(() => {
    if (!necesitaPedir) return;
    const local = leer()[clave];
    if (local) {
      setPedido({ clave, valor: local });
      return;
    }
    let vivo = true;
    pedirAPie(paradas).then((valor) => {
      if (valor) guardar(clave, valor);
      if (vivo) setPedido({ clave, valor });
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [necesitaPedir, clave]);

  if (!ruta || paradas.length < 2) return null;
  if (deApi) return { coords: deApi, distancia: ruta.distancia, duracion: ruta.duracion, aPie: true };
  if (pedido?.clave === clave && pedido.valor) return { ...pedido.valor, aPie: true };
  return { coords: paradas.map((p) => [p.lng, p.lat]), distancia: null, duracion: null, aPie: false };
}

/** «25 min» / «1 h 10 min», redondeando a 5 minutos. */
export function formatearDuracion(segundos: number): string {
  const min = Math.max(5, Math.round(segundos / 300) * 5);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`;
}
