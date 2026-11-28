/**
 * Estilos del mapa con la identidad de Pío (D26).
 *
 * «Calles» y «Noche» son mapas vectoriales de OpenFreeMap (OpenStreetMap, sin clave) recoloreados
 * con la paleta del manual: fondo crema, calles blancas, agua azul río, zonas verdes en verde pino
 * suave y sin iconos de comercios, para que destaquen los pines de Pío.
 * «Relieve» sigue siendo OpenTopoMap (curvas de nivel para senderos).
 * Si OpenFreeMap no responde, se vuelve a las teselas de OpenStreetMap de siempre.
 */
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';

export type Estilo = 'calles' | 'relieve' | 'noche';

const URL_BASE = 'https://tiles.openfreemap.org/styles/positron';
const CLAVE = 'pio.estilo-base.v1';

interface Paleta {
  fondo: string;
  residencial: string;
  parque: string;
  bosque: string;
  agua: string;
  rio: string;
  edificio: string;
  edificioBorde: string;
  calle: string;
  calleBorde: string;
  senda: string;
  texto: string;
  textoSuave: string;
  textoAgua: string;
  halo: string;
}

const CLARO: Paleta = {
  fondo: '#F6F4EE', // crema
  residencial: '#EFEAE0',
  parque: '#DCE7D4',
  bosque: '#D2E0C8',
  agua: '#BCDCE7',
  rio: '#8FC3D6',
  edificio: '#E7E0D1',
  edificioBorde: '#D8CFBC',
  calle: '#FFFFFF',
  calleBorde: '#DDD6C7',
  senda: '#8DB3A2',
  texto: '#22313A', // tinta
  textoSuave: '#4A5861', // tinta suave
  textoAgua: '#1B6E8A', // azul río
  halo: '#F6F4EE',
};

const NOCHE: Paleta = {
  fondo: '#111A20',
  residencial: '#15212A',
  parque: '#16302A',
  bosque: '#152B25',
  agua: '#17323D',
  rio: '#2E6F86',
  edificio: '#1F2C34',
  edificioBorde: '#2C3A42',
  calle: '#2C3A42',
  calleBorde: '#1A262D',
  senda: '#4C7F6E',
  texto: '#F2F4F5',
  textoSuave: '#B9C6CE',
  textoAgua: '#5FB3D1',
  halo: '#111A20',
};

const ancho = (z13: number, z16: number, z18: number) => ['interpolate', ['linear'], ['zoom'], 13, z13, 16, z16, 18, z18];

function recolorear(base: StyleSpecification, c: Paleta): StyleSpecification {
  const st = structuredClone(base);
  const capas: LayerSpecification[] = [];
  for (const capa of st.layers) {
    const l = capa as LayerSpecification & { paint?: Record<string, unknown> };
    const p = (l.paint = { ...(l.paint ?? {}) });
    const id = l.id;
    if (id === 'background') p['background-color'] = c.fondo;
    else if (id === 'park') Object.assign(p, { 'fill-color': c.parque, 'fill-opacity': 1 });
    else if (id === 'landcover_wood') Object.assign(p, { 'fill-color': c.bosque, 'fill-opacity': 0.9 });
    else if (id === 'landuse_residential') Object.assign(p, { 'fill-color': c.residencial, 'fill-opacity': 1 });
    else if (id === 'water') p['fill-color'] = c.agua;
    else if (id === 'waterway') p['line-color'] = c.rio;
    else if (id === 'building') Object.assign(p, { 'fill-color': c.edificio, 'fill-outline-color': c.edificioBorde, 'fill-opacity': 1 });
    else if (id === 'highway_path')
      Object.assign(p, { 'line-color': c.senda, 'line-dasharray': [2, 1.5], 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.6, 18, 1.6] });
    else if (id === 'highway_minor') {
      // Calles pequeñas con un borde suave debajo, como en la maqueta
      capas.push({ ...structuredClone(l), id: 'highway_minor_borde', paint: { 'line-color': c.calleBorde, 'line-width': ancho(2.5, 7, 15) } } as LayerSpecification);
      Object.assign(p, { 'line-color': c.calle, 'line-width': ancho(1.5, 5, 12) });
    } else if (id.includes('casing')) p['line-color'] = c.calleBorde;
    else if (id.includes('inner') || id.includes('subtle')) p['line-color'] = c.calle;
    else if (l.type === 'symbol') {
      p['text-color'] = id.startsWith('water') ? c.textoAgua : id.startsWith('label') ? c.texto : c.textoSuave;
      p['text-halo-color'] = c.halo;
      p['text-halo-width'] = 1.5;
    }
    capas.push(l);
  }
  st.layers = capas;
  return st;
}

let base: Promise<StyleSpecification | null> | null = null;

/** Estilo base de OpenFreeMap: de la red y, si no hay, el último guardado en el móvil. */
function estiloBase(): Promise<StyleSpecification | null> {
  base ??= fetch(URL_BASE)
    .then((r) => (r.ok ? (r.json() as Promise<StyleSpecification>) : Promise.reject(r.status)))
    .then((st) => {
      try {
        localStorage.setItem(CLAVE, JSON.stringify(st));
      } catch {
        /* sin espacio: no pasa nada */
      }
      return st;
    })
    .catch(() => {
      try {
        const g = localStorage.getItem(CLAVE);
        return g ? (JSON.parse(g) as StyleSpecification) : null;
      } catch {
        return null;
      }
    });
  return base;
}

const RASTER: Record<Estilo, { urls: string[]; atribucion: string; maxzoom: number }> = {
  calles: { urls: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], atribucion: '© OpenStreetMap', maxzoom: 19 },
  relieve: {
    urls: ['a', 'b', 'c'].map((s) => `https://${s}.tile.opentopomap.org/{z}/{x}/{y}.png`),
    atribucion: '© OpenStreetMap · SRTM · © OpenTopoMap (CC-BY-SA)',
    maxzoom: 17,
  },
  noche: {
    urls: ['a', 'b', 'c', 'd'].map((s) => `https://${s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`),
    atribucion: '© OpenStreetMap · © CARTO',
    maxzoom: 19,
  },
};

/** Estilo de teselas de imagen (relieve, o respaldo si falla el vectorial). */
export function estiloRaster(e: Estilo): StyleSpecification {
  const t = RASTER[e];
  return {
    version: 8,
    // Letras para los números de las paradas
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: { base: { type: 'raster', tiles: t.urls, tileSize: 256, attribution: t.atribucion, maxzoom: t.maxzoom } },
    layers: [{ id: 'base', type: 'raster', source: 'base' }],
  };
}

/** Estilo completo para el mapa. */
export async function estiloMapa(e: Estilo): Promise<StyleSpecification> {
  if (e === 'relieve') return estiloRaster(e);
  const b = await estiloBase();
  return b ? recolorear(b, e === 'noche' ? NOCHE : CLARO) : estiloRaster(e);
}

/** Fuente para los números de las paradas (existe en OpenFreeMap). */
export const FUENTE_NUMEROS = ['Noto Sans Bold'];
