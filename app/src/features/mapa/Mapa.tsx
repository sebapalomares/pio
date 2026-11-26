import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// El motor del mapa trabaja en un «worker» aparte: Vite lo copia como archivo y le decimos dónde está
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { distancia, formatearDistancia } from '../../lib/geo';
import { CATEGORIAS, RUTAS, buscarPunto } from '../../data/demo';
import { BarraNavegacion, FotoHueco, LogoPastilla, SelectorModo } from '../../components/Comunes';
import { Icono } from '../../components/Icono';

type Estilo = 'calles' | 'relieve' | 'noche';

// Teselas gratuitas para la demostración. En producción conviene un proveedor propio o con contrato.
const TESELAS: Record<Estilo, { urls: string[]; atribucion: string }> = {
  calles: {
    urls: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    atribucion: '© OpenStreetMap',
  },
  relieve: {
    urls: ['a', 'b', 'c'].map((s) => `https://${s}.tile.opentopomap.org/{z}/{x}/{y}.png`),
    atribucion: '© OpenStreetMap · SRTM · © OpenTopoMap (CC-BY-SA)',
  },
  noche: {
    urls: ['a', 'b', 'c', 'd'].map((s) => `https://${s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`),
    atribucion: '© OpenStreetMap · © CARTO',
  },
};

const estiloMapa = (e: Estilo): StyleSpecification => ({
  version: 8,
  sources: { base: { type: 'raster', tiles: TESELAS[e].urls, tileSize: 256, attribution: TESELAS[e].atribucion, maxzoom: e === 'relieve' ? 17 : 19 } },
  layers: [{ id: 'base', type: 'raster', source: 'base' }],
});

const RADIOS = [500, 2000, 10000];

maplibregl.setWorkerUrl(urlWorker);

/** Pantalla 2 · Mapa. Tema claro con calles y relieve, oscuro con el mapa de noche (D17). */
export default function Mapa() {
  const s = useSensores();
  const navegar = useNavigate();
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const marcadores = useRef<maplibregl.Marker[]>([]);
  const marcaYo = useRef<maplibregl.Marker | null>(null);
  const [estilo, setEstilo] = useState<Estilo>('calles');
  const [categoria, setCategoria] = useState<string>('todo');
  const [texto, setTexto] = useState('');
  const [radio, setRadio] = useState(1);

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return s.puntos
      .map((p) => ({ ...p, d: s.posicion ? distancia(s.posicion, p) : null }))
      .filter((p) => categoria === 'todo' || p.categoria.slug === categoria)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q))
      .filter((p) => p.d === null || p.d <= RADIOS[radio])
      .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
  }, [s.puntos, s.posicion, categoria, texto, radio]);

  // Crear el mapa una vez
  useEffect(() => {
    if (!contenedor.current) return;
    const centro = s.puntos[0];
    const m = new maplibregl.Map({
      container: contenedor.current,
      style: estiloMapa('calles'),
      center: [centro.lng, centro.lat],
      zoom: 15.5,
      attributionControl: { compact: true },
    });
    mapa.current = m;
    return () => {
      m.remove();
      mapa.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambiar de estilo y dibujar la ruta monumental
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    m.setStyle(estiloMapa(estilo));
    const dibujarRuta = () => {
      const ruta = RUTAS[0];
      const coords = ruta.paradas
        .map((id) => buscarPunto(id, s.puntos))
        .filter((p) => p !== undefined)
        .map((p) => [p.lng, p.lat]);
      if (m.getSource('ruta')) return;
      m.addSource('ruta', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } } });
      m.addLayer({
        id: 'ruta',
        type: 'line',
        source: 'ruta',
        paint: { 'line-color': estilo === 'noche' ? '#5FB3D1' : '#1B6E8A', 'line-width': 5, 'line-opacity': 0.85 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
    };
    m.once('style.load', dibujarRuta);
  }, [estilo, s.puntos]);

  // Pines de los lugares (pin azul con punto amarillo, del manual)
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    marcadores.current.forEach((mk) => mk.remove());
    marcadores.current = visibles.map((p) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'pin-mapa';
      boton.setAttribute('aria-label', p.nombre);
      boton.innerHTML = '<img src="/brand/pio-pin-azul.svg" alt="" width="30" height="40">';
      boton.addEventListener('click', () => navegar(`/lugar/${p.id}`));
      return new maplibregl.Marker({ element: boton, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(m);
    });
  }, [visibles, navegar]);

  // Tu posición
  useEffect(() => {
    const m = mapa.current;
    if (!m || !s.posicion) return;
    if (!marcaYo.current) {
      const el = document.createElement('div');
      el.className = 'marca-yo';
      el.setAttribute('aria-label', t('mapa.tuPosicion'));
      marcaYo.current = new maplibregl.Marker({ element: el }).setLngLat([s.posicion.lng, s.posicion.lat]).addTo(m);
      if (s.modoAlrededor) m.jumpTo({ center: [s.posicion.lng, s.posicion.lat], zoom: 16 });
    } else {
      marcaYo.current.setLngLat([s.posicion.lng, s.posicion.lat]);
    }
  }, [s.posicion, s.modoAlrededor]);

  const oscuro = estilo === 'noche';

  return (
    <main className="pantalla pantalla-mapa" data-tema={oscuro ? 'oscuro' : undefined}>
      <div ref={contenedor} className="mapa-lienzo" />

      <header className="cabecera-flotante columna">
        <div className="fila-cabecera">
          <LogoPastilla oscuro={oscuro} />
          <SelectorModo actual="mapa" />
        </div>
        <label className="campo-busqueda">
          <Icono nombre="buscar" tamano={20} />
          <span className="solo-lector">{t('mapa.buscar')}</span>
          <input type="search" placeholder={t('mapa.buscar')} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <div className="fila-pildoras">
          <button type="button" className="pildora" aria-pressed={categoria === 'todo'} onClick={() => setCategoria('todo')}>
            {t('mapa.todo')}
          </button>
          {CATEGORIAS.map((c) => (
            <button key={c.slug} type="button" className="pildora" aria-pressed={categoria === c.slug} onClick={() => setCategoria(c.slug)}>
              {t(`mapa.${c.slug}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="selector-estilo" role="group" aria-label={t('mapa.estilo')}>
        {(['calles', 'relieve', 'noche'] as Estilo[]).map((e) => (
          <button key={e} type="button" aria-pressed={estilo === e} onClick={() => setEstilo(e)}>
            {t(`mapa.${e}`)}
          </button>
        ))}
      </div>

      <section className="hoja-inferior">
        <span className="asa" aria-hidden="true" />
        <div className="fila-titulo">
          <h2 className="titulo-3">{t('mapa.cercaDeTi')}</h2>
          <button type="button" className="pildora" onClick={() => setRadio((r) => (r + 1) % RADIOS.length)}>
            <Icono nombre="filtro" tamano={16} />
            {t('mapa.hasta', { distancia: formatearDistancia(RADIOS[radio]) })}
          </button>
        </div>
        <div className="lista-lugares">
          {visibles.length === 0 && <p className="texto-suave">{t('mapa.sinResultados')}</p>}
          {visibles.slice(0, 6).map((p) => (
            <Link key={p.id} to={`/lugar/${p.id}`} className="fila-lista">
              <FotoHueco slug={p.categoria.slug} tamano={48} />
              <span className="fila-lista-texto">
                <strong>{p.nombre}</strong>
                <span className={p.categoria.slug === 'senderos' ? 'texto-verde' : 'texto-suave'}>
                  {p.categoria.nombre}
                  {p.d !== null && ` · ${formatearDistancia(p.d)}`}
                </span>
              </span>
              <Icono nombre="derecha" tamano={20} />
            </Link>
          ))}
        </div>
      </section>

      <BarraNavegacion />
    </main>
  );
}
