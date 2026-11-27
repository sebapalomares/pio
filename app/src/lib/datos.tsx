import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { idioma } from '../i18n';
import { ErrorApi, cargarDatos, cargarFicha, cargarQr } from './api';
import type { Datos, FichaPunto, Punto, PuntoQr, Ruta } from './tipos';
import type { RespaldoDemo } from '../data/respaldo-demo';

/**
 * Datos de la app: los de la API del plugin, con la última respuesta guardada en el móvil
 * para que la app abra sin cobertura.
 *
 * - Al abrir se pinta lo guardado (si hay) y a la vez se pide la API; al volver a la app
 *   o recuperar la conexión se vuelve a pedir. Así un cambio en WordPress se nota.
 * - Datos de demostración SOLO en desarrollo (`npm run dev`): si la API falla y no hay nada
 *   guardado, o con VITE_PIO_DATOS=demo. En producción nunca: el import va dentro de
 *   `import.meta.env.DEV` y desaparece del paquete.
 * - localStorage puede fallar (modo privado, memoria llena): siempre con try/catch.
 *   Pasará a IndexedDB con la mochila sin conexión (D12).
 */

export type OrigenDatos = 'red' | 'cache' | 'demo';

interface EstadoDatos {
  datos: Datos | null;
  /** Cuándo se descargaron los datos que se ven (ISO). */
  fecha: string | null;
  origen: OrigenDatos | null;
  cargando: boolean;
  /** La última petición a la API falló (sin conexión o error del servidor). */
  error: boolean;
  demo: RespaldoDemo | null;
}

interface ContextoDatos extends EstadoDatos {
  recargar: () => void;
}

const CLAVE_DATOS = `pio:datos:v1:${idioma}`;
const CLAVE_FICHAS = `pio:fichas:v1:${idioma}`;
const CLAVE_QR = 'pio:qr:v1';
const REFRESCO_MIN_MS = 30_000;
const FORZAR_DEMO = import.meta.env.DEV && import.meta.env.VITE_PIO_DATOS === 'demo';

function leer<T>(clave: string): T | null {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}
function escribir(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: los datos se quedan solo en memoria */
  }
}

interface CacheDatos {
  fecha: string;
  datos: Datos;
}
type CacheFichas = Record<string, { fecha: string; ficha: FichaPunto }>;
type CacheQr = Record<string, PuntoQr>;

function estadoInicial(): EstadoDatos {
  const c = FORZAR_DEMO ? null : leer<CacheDatos>(CLAVE_DATOS);
  return { datos: c?.datos ?? null, fecha: c?.fecha ?? null, origen: c ? 'cache' : null, cargando: true, error: false, demo: null };
}

const Contexto = createContext<ContextoDatos | null>(null);

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoDatos>(estadoInicial);
  const ultimaCarga = useRef(0);
  const enCurso = useRef(false);

  const cargar = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    ultimaCarga.current = Date.now();
    setEstado((e) => ({ ...e, cargando: true }));
    try {
      if (FORZAR_DEMO) throw new Error('VITE_PIO_DATOS=demo');
      const datos = await cargarDatos();
      const fecha = new Date().toISOString();
      escribir(CLAVE_DATOS, { fecha, datos } satisfies CacheDatos);
      setEstado({ datos, fecha, origen: 'red', cargando: false, error: false, demo: null });
    } catch (e) {
      console.warn('[pio] No se pudo cargar la API:', e);
      let demo: RespaldoDemo | null = null;
      if (import.meta.env.DEV) {
        const guardados = leer<CacheDatos>(CLAVE_DATOS);
        if (FORZAR_DEMO || !guardados) {
          const { respaldoDemo } = await import('../data/respaldo-demo');
          demo = respaldoDemo();
        }
      }
      setEstado((prev) =>
        demo
          ? { datos: demo.datos, fecha: null, origen: 'demo', cargando: false, error: !FORZAR_DEMO, demo }
          : prev.datos && prev.origen !== 'demo'
            ? { ...prev, origen: 'cache', cargando: false, error: true }
            : { ...prev, cargando: false, error: true },
      );
    } finally {
      enCurso.current = false;
    }
  }, []);

  useEffect(() => {
    void cargar();
    const alVolver = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultimaCarga.current > REFRESCO_MIN_MS) void cargar();
    };
    const alConectar = () => void cargar();
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', alConectar);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', alConectar);
    };
  }, [cargar]);

  return <Contexto.Provider value={{ ...estado, recargar: () => void cargar() }}>{children}</Contexto.Provider>;
}

export function useDatos() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useDatos fuera de ProveedorDatos');
  return c;
}

export const buscarPunto = (puntos: Punto[], id: string) => puntos.find((p) => p.id === id);
export const buscarRuta = (rutas: Ruta[], id: string) => rutas.find((r) => r.id === id);
export const rutasDePunto = (rutas: Ruta[], id: string) => rutas.filter((r) => r.paradas.includes(id));

export type EstadoPeticion = 'cargando' | 'listo' | 'no-encontrado' | 'sin-conexion';

/** Ficha completa de un punto: la guardada al momento y la de la API en cuanto llega. */
export function useFicha(id: string | null | undefined) {
  const { demo, fecha } = useDatos();
  const [ficha, setFicha] = useState<FichaPunto | null>(null);
  const [estado, setEstado] = useState<EstadoPeticion>('cargando');

  useEffect(() => {
    if (!id) return;
    if (demo) {
      setFicha(demo.fichas[id] ?? null);
      setEstado(demo.fichas[id] ? 'listo' : 'no-encontrado');
      return;
    }
    let vivo = true;
    const guardada = leer<CacheFichas>(CLAVE_FICHAS)?.[id]?.ficha ?? null;
    setFicha(guardada);
    setEstado(guardada ? 'listo' : 'cargando');
    cargarFicha(id)
      .then((f) => {
        if (!vivo) return;
        setFicha(f);
        setEstado('listo');
        escribir(CLAVE_FICHAS, { ...leer<CacheFichas>(CLAVE_FICHAS), [id]: { fecha: new Date().toISOString(), ficha: f } });
      })
      .catch((e) => {
        if (!vivo) return;
        if (e instanceof ErrorApi && e.estado === 404) {
          // Ya no está publicado en WordPress
          setFicha(null);
          setEstado('no-encontrado');
          const fichas = leer<CacheFichas>(CLAVE_FICHAS);
          if (fichas?.[id]) {
            delete fichas[id];
            escribir(CLAVE_FICHAS, fichas);
          }
        } else if (!guardada) {
          setEstado('sin-conexion');
        }
      });
    return () => {
      vivo = false;
    };
    // `fecha` cambia cuando se recargan los datos: la ficha abierta se pide otra vez
  }, [id, demo, fecha]);

  return { ficha, estado };
}

/**
 * Punto al que pertenece un código QR. La respuesta se guarda para poder leer sin
 * cobertura los códigos ya escaneados; un código nuevo necesita conexión, porque la API
 * pública no publica los códigos (no se pueden adivinar, 03-modelo-datos-api.md).
 */
export function useQr(codigo: string | null) {
  const { demo } = useDatos();
  const [punto, setPunto] = useState<PuntoQr | null>(null);
  const [estado, setEstado] = useState<EstadoPeticion>('cargando');

  useEffect(() => {
    if (!codigo) {
      setPunto(null);
      return;
    }
    if (demo) {
      const id = demo.qr[codigo];
      const p = id ? demo.datos.puntos.find((x) => x.id === id) : undefined;
      setPunto(p ? { id: p.id, nombre: p.nombre } : null);
      setEstado(p ? 'listo' : 'no-encontrado');
      return;
    }
    let vivo = true;
    const guardado = leer<CacheQr>(CLAVE_QR)?.[codigo] ?? null;
    setPunto(guardado);
    setEstado(guardado ? 'listo' : 'cargando');
    cargarQr(codigo)
      .then((p) => {
        if (!vivo) return;
        setPunto(p);
        setEstado('listo');
        escribir(CLAVE_QR, { ...leer<CacheQr>(CLAVE_QR), [codigo]: p });
      })
      .catch((e) => {
        if (!vivo) return;
        if (e instanceof ErrorApi && e.estado === 404) {
          setPunto(null);
          setEstado('no-encontrado');
        } else if (!guardado) {
          setEstado('sin-conexion');
        }
      });
    return () => {
      vivo = false;
    };
  }, [codigo, demo]);

  return { punto, estado };
}
