import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorApi, cargarLugaresViaje } from './api';
import type { Ruta, Viaje } from './tipos';

/**
 * Viaje del planificador de turismocazorla.info (D27).
 *
 * El planificador arma el viaje por días y lo abre en Pío con un enlace:
 *   /viaje?d=12,45,78~33,91&t=Título   (días separados por «~», IDs de WordPress por comas)
 * La app guarda el viaje en el móvil (como los sellos, D5), resuelve los IDs con
 * GET /viaje?ids=… y convierte cada día en una ruta para el mapa (`viaje-1`, `viaje-2`…)
 * con las paradas que son puntos de Pío. Los demás lugares (alojamientos, empresas…) salen
 * en la lista del día con enlace a su ficha en la web.
 *
 * Apagado por defecto en producción: se enciende al construir con VITE_PIO_PLANIFICADOR=1
 * (y en el plugin, Ajustes → Pío). En desarrollo está siempre encendido para probarlo.
 */
export const PLANIFICADOR_ACTIVO = import.meta.env.DEV || import.meta.env.VITE_PIO_PLANIFICADOR === '1';

/** Página del planificador, para volver a editar el viaje. */
export const URL_PLANIFICADOR = import.meta.env.VITE_PIO_URL_PLANIFICADOR || 'https://turismocazorla.info/planifica-tu-viaje/';

const CLAVE = 'pio:viaje:v1';
const MAX_IDS = 80;
const PREFIJO_RUTA = 'viaje-';

/** «12,45~33» → [['12','45'],['33']]; IDs numéricos, sin días vacíos y como mucho 80 lugares. */
export function leerDias(d: string | null | undefined): string[][] {
  if (!d) return [];
  let total = 0;
  return d
    .split('~')
    .map((dia) =>
      dia
        .split(',')
        .map((x) => x.trim())
        .filter((x) => /^[1-9]\d{0,9}$/.test(x) && total++ < MAX_IDS),
    )
    .filter((dia) => dia.length > 0);
}

export const idsDelViaje = (dias: string[][]) => [...new Set(dias.flat())];
export const idRutaDia = (n: number) => `${PREFIJO_RUTA}${n}`;
export const esRutaViaje = (id: string | null | undefined) => Boolean(id?.startsWith(PREFIJO_RUTA));
export const diaDeRuta = (id: string) => Number(id.slice(PREFIJO_RUTA.length));

function leer(): Viaje | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Viaje) : null;
  } catch {
    return null;
  }
}

let viaje: Viaje | null = PLANIFICADOR_ACTIVO ? leer() : null;
const oyentes = new Set<() => void>();

function guardar(nuevo: Viaje | null) {
  viaje = nuevo;
  try {
    if (nuevo) localStorage.setItem(CLAVE, JSON.stringify(nuevo));
    else localStorage.removeItem(CLAVE);
  } catch {
    /* sin almacenamiento: el viaje se queda solo en memoria */
  }
  oyentes.forEach((o) => o());
}

export type EstadoViaje = 'listo' | 'cargando' | 'sin-conexion' | 'apagado';

/** Viaje guardado en el móvil, con funciones para abrir uno nuevo, actualizarlo y quitarlo. */
export function useViaje() {
  const [, refrescar] = useState(0);
  const [estado, setEstado] = useState<EstadoViaje>('listo');
  useEffect(() => {
    const oyente = () => refrescar((n) => n + 1);
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  }, []);

  /** Pide a la API los lugares del viaje guardado (nombres, coordenadas, si siguen publicados). */
  const actualizar = useCallback(async () => {
    const actual = viaje;
    if (!actual) return;
    setEstado('cargando');
    try {
      const { lugares, faltan } = await cargarLugaresViaje(idsDelViaje(actual.dias));
      // Si mientras tanto se abrió otro viaje, esta respuesta ya no vale
      if (viaje !== actual) return;
      guardar({ ...actual, lugares: Object.fromEntries(lugares.map((l) => [l.id, l])), faltan, actualizado: new Date().toISOString() });
      setEstado('listo');
    } catch (e) {
      setEstado(e instanceof ErrorApi && e.estado === 404 ? 'apagado' : 'sin-conexion');
    }
  }, []);

  /** Abre el viaje de un enlace del planificador. Si es el mismo que el guardado, lo conserva. */
  const abrir = useCallback((dias: string[][], titulo: string | null) => {
    if (!dias.length) return;
    const igual = viaje && JSON.stringify(viaje.dias) === JSON.stringify(dias);
    if (igual) {
      if (titulo && titulo !== viaje!.titulo) guardar({ ...viaje!, titulo });
      return;
    }
    guardar({ titulo, dias, lugares: {}, faltan: [], abierto: new Date().toISOString(), actualizado: null });
  }, []);

  const quitar = useCallback(() => guardar(null), []);

  return { viaje, estado, actualizar, abrir, quitar };
}

/**
 * Cada día del viaje como una ruta de Pío, para el mapa y el progreso de sellos.
 * Solo entran los puntos de Pío: los demás lugares no tienen pin ni sello.
 */
export function rutasDelViaje(v: Viaje | null, titulo: (n: number) => string): Ruta[] {
  if (!v) return [];
  return v.dias.map((ids, i) => {
    const paradas = ids.filter((id) => v.lugares[id]?.esPunto);
    return {
      id: idRutaDia(i + 1),
      nombre: titulo(i + 1),
      descripcion: v.titulo ?? '',
      color: null,
      icono: null,
      paradas,
      nombres: Object.fromEntries(paradas.map((id) => [id, v.lugares[id].nombre])),
      // Sin trazado de WordPress: la app lo pide al enrutador a pie y lo guarda (D25)
      trazado: null,
      distancia: null,
      duracion: null,
    };
  });
}

/** Rutas de los días del viaje guardado (vacío si el planificador está apagado). */
export function useRutasViaje(titulo: (n: number) => string): Ruta[] {
  const { viaje: v } = useViaje();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => rutasDelViaje(v, titulo), [v]);
}
