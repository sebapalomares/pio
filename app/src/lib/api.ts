import { idioma, t } from '../i18n';
import type { Categoria, Datos, FichaPunto, Punto, PuntoQr, Ruta } from './tipos';

/**
 * Cliente de la API del plugin `pio` (D2, D19): https://turismocazorla.info/wp-json/pio/v1
 *
 * - Siempre con `?lang=` (D11), aunque de momento solo haya español.
 * - Peticiones GET «simples» (sin cabeceras propias), para que el navegador no haga
 *   petición previa de CORS desde pio.turismocazorla.info (D9).
 * - `cache: 'no-cache'`: el navegador revalida con el servidor, así un cambio en
 *   WordPress se ve al volver a abrir la app.
 */
export const URL_API = (import.meta.env.VITE_PIO_API || 'https://turismocazorla.info/wp-json/pio/v1').replace(/\/+$/, '');

export class ErrorApi extends Error {
  estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

async function pedir<T>(ruta: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(URL_API + ruta);
  url.searchParams.set('lang', idioma);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const r = await fetch(url, { cache: 'no-cache', credentials: 'omit' });
  if (!r.ok) throw new ErrorApi(r.status, `${ruta}: ${r.status}`);
  return (await r.json()) as T;
}

// ---------- Forma cruda de la API ----------

interface CategoriaApi {
  id: number;
  nombre: string;
  slug: string;
}
interface ResumenApi {
  id: number;
  nombre: string;
  categoria: CategoriaApi | null;
  lat: number | null;
  lng: number | null;
  altitud: number | null;
  foto: string | null;
  verificado?: boolean;
}
interface FichaApi extends ResumenApi {
  descripcion?: string;
  galeria?: string[];
  direccion?: string | null;
  horario?: string | null;
  precio?: string | null;
  telefono?: string | null;
  web?: string | null;
  reserva_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  enlace?: string | null;
}
interface RutaApi {
  id: number;
  nombre: string;
  descripcion?: string;
  color: string | null;
  icono: string | null;
  num_paradas: number;
  paradas?: ResumenApi[];
}

// ---------- Limpieza ----------

const analizador = typeof DOMParser !== 'undefined' ? new DOMParser() : null;

/** Resuelve entidades HTML (&#8220;, &amp;…) que a veces deja WordPress en los títulos. */
export function textoPlano(html: string | null | undefined): string {
  if (!html) return '';
  if (!analizador) return html;
  return (analizador.parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

const ETIQUETAS_FUERA = 'script,style,iframe,object,embed,form,input,button,textarea,select,link,meta,base,noscript';

/** Deja el HTML de la descripción sin scripts, estilos ni atributos peligrosos. */
export function sanearHtml(html: string | null | undefined): string {
  if (!html) return '';
  if (!analizador) return '';
  const doc = analizador.parseFromString(html, 'text/html');
  doc.body.querySelectorAll(ETIQUETAS_FUERA).forEach((el) => el.remove());
  doc.body.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) {
      const nombre = a.name.toLowerCase();
      const valor = a.value.trim().toLowerCase();
      if (nombre.startsWith('on') || nombre === 'style' || nombre === 'class' || nombre === 'id') el.removeAttribute(a.name);
      else if ((nombre === 'href' || nombre === 'src' || nombre === 'srcset') && valor.startsWith('javascript:')) el.removeAttribute(a.name);
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    }
    if (el.tagName === 'IMG') el.setAttribute('loading', 'lazy');
  });
  return doc.body.innerHTML.trim();
}

const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const textoONulo = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? textoPlano(v) : null);
const urlONula = (v: unknown): string | null => (typeof v === 'string' && /^https?:\/\//i.test(v.trim()) ? v.trim() : null);

function aCategoria(c: CategoriaApi | null): Categoria {
  if (!c) return { nombre: t('comun.lugar'), slug: '' };
  return { id: c.id, nombre: textoPlano(c.nombre), slug: c.slug };
}

function aResumen(r: ResumenApi) {
  return {
    id: String(r.id),
    nombre: textoPlano(r.nombre),
    categoria: aCategoria(r.categoria),
    lat: numero(r.lat),
    lng: numero(r.lng),
    altitud: numero(r.altitud),
    foto: urlONula(r.foto),
    verificado: r.verificado === true,
  };
}

/** Punto para mapa y RA, o null si no tiene coordenadas (D19: 1 de los 42 de la web). */
export function aPunto(r: ResumenApi): Punto | null {
  const p = aResumen(r);
  return p.lat !== null && p.lng !== null ? { ...p, lat: p.lat, lng: p.lng } : null;
}

export function aFicha(r: FichaApi): FichaPunto {
  const descripcion = sanearHtml(r.descripcion);
  return {
    ...aResumen(r),
    descripcion,
    texto: textoPlano(descripcion),
    galeria: (r.galeria ?? []).map(urlONula).filter((u): u is string => u !== null),
    direccion: textoONulo(r.direccion),
    horario: textoONulo(r.horario),
    precio: textoONulo(r.precio),
    telefono: textoONulo(r.telefono),
    web: urlONula(r.web),
    reserva_url: urlONula(r.reserva_url),
    video_url: urlONula(r.video_url),
    audio_url: urlONula(r.audio_url),
    enlace: urlONula(r.enlace),
  };
}

function aRuta(r: RutaApi): Ruta {
  const paradas = r.paradas ?? [];
  return {
    id: String(r.id),
    nombre: textoPlano(r.nombre),
    descripcion: textoPlano(r.descripcion),
    color: r.color || null,
    icono: r.icono || null,
    paradas: paradas.map((p) => String(p.id)),
    nombres: Object.fromEntries(paradas.map((p) => [String(p.id), textoPlano(p.nombre)])),
  };
}

// ---------- Llamadas ----------

/** Puntos, categorías y rutas (con sus paradas) de una vez. */
export async function cargarDatos(): Promise<Datos> {
  const [puntos, categorias, rutas] = await Promise.all([
    pedir<ResumenApi[]>('/puntos'),
    pedir<CategoriaApi[]>('/categorias'),
    pedir<RutaApi[]>('/rutas'),
  ]);
  // /rutas solo da el número de paradas: el detalle de cada una trae las paradas en orden
  const detalles = await Promise.all(rutas.map((r) => pedir<RutaApi>(`/rutas/${r.id}`)));
  return {
    puntos: puntos.map(aPunto).filter((p): p is Punto => p !== null),
    categorias: categorias.map((c) => aCategoria(c)),
    rutas: detalles.map(aRuta),
  };
}

export async function cargarFicha(id: string): Promise<FichaPunto> {
  return aFicha(await pedir<FichaApi>(`/puntos/${encodeURIComponent(id)}`));
}

/** Punto al que pertenece un QR. Lanza ErrorApi 404 si el código no es de Pío. */
export async function cargarQr(codigo: string): Promise<PuntoQr> {
  const r = await pedir<ResumenApi>(`/qr/${encodeURIComponent(codigo)}`);
  return { id: String(r.id), nombre: textoPlano(r.nombre) };
}
