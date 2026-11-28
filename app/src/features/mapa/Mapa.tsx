import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// El motor del mapa trabaja en un «worker» aparte: Vite lo copia como archivo y le decimos dónde está
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { useAlmacen } from '../../lib/almacen';
import { CENTRO_CAZORLA, distancia, formatearDistancia } from '../../lib/geo';
import { buscarPunto, buscarRuta, useDatos } from '../../lib/datos';
import { estiloMapa, FUENTE_NUMEROS, type Estilo } from '../../lib/estiloMapa';
import { formatearDuracion, useTrazado } from '../../lib/trazado';
import { diaDeRuta, esRutaViaje, useRutasViaje } from '../../lib/viaje';
import { BarraNavegacion, FotoHueco, LogoPastilla, SelectorModo } from '../../components/Comunes';
import { Icono, iconoRuta } from '../../components/Icono';
import { progresoRuta } from '../pasaporte/Pasaporte';

const RADIOS = [500, 2000, 10000];

maplibregl.setWorkerUrl(urlWorker);

// Mientras llega el estilo de Pío, solo el fondo crema (sin parpadeo de otro mapa)
const ESTILO_VACIO: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#F6F4EE' } }],
};

const COLECCION_VACIA = { type: 'FeatureCollection' as const, features: [] };

/** Pantalla 2 · Mapa. Estilo con los colores de Pío (D26), «Cerca de ti» plegable y ruta a pie seleccionable (D25). */
export default function Mapa() {
  const s = useSensores();
  const { sellos } = useAlmacen();
  const { datos, cargando, error } = useDatos();
  const categorias = datos?.categorias ?? [];
  const rutas = useMemo(() => datos?.rutas ?? [], [datos]);
  // Días del viaje del planificador (D27): se pueden abrir como ruta (/mapa?ruta=viaje-1), sin píldora propia
  const rutasViaje = useRutasViaje((n) => t('viaje.dia', { n }));
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const marcadores = useRef<maplibregl.Marker[]>([]);
  const marcaYo = useRef<maplibregl.Marker | null>(null);
  const [estilo, setEstilo] = useState<Estilo>('calles');
  const [verCapas, setVerCapas] = useState(false);
  const [categoria, setCategoria] = useState<string>('todo');
  const [texto, setTexto] = useState('');
  const [radio, setRadio] = useState(1);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [estiloListo, setEstiloListo] = useState(0);
  const estiloCargado = useRef(false);

  // Ruta seleccionada: va en la dirección (/mapa?ruta=ID) para poder enlazarla desde la pantalla de la ruta
  const idRuta = params.get('ruta');
  const ruta = idRuta ? buscarRuta(rutas, idRuta) ?? buscarRuta(rutasViaje, idRuta) ?? null : null;
  const elegirRuta = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set('ruta', id);
    else p.delete('ruta');
    setParams(p, { replace: true });
  };

  const paradas = useMemo(
    () =>
      (ruta?.paradas ?? [])
        .map((id, i) => ({ punto: buscarPunto(s.puntos, id), n: i + 1 }))
        .filter((x): x is { punto: NonNullable<typeof x.punto>; n: number } => x.punto !== undefined),
    [ruta, s.puntos],
  );
  const coordsParadas = useMemo(() => paradas.map((x) => ({ lat: x.punto.lat, lng: x.punto.lng })), [paradas]);
  const trazado = useTrazado(ruta, coordsParadas);

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return s.puntos
      .map((p) => ({ ...p, d: s.posicion ? distancia(s.posicion, p) : null }))
      .filter((p) => categoria === 'todo' || p.categoria.slug === categoria)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q))
      .filter((p) => p.d === null || p.d <= RADIOS[radio])
      .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
  }, [s.puntos, s.posicion, categoria, texto, radio]);
  const rutasBuscadas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return q ? rutas.filter((r) => r.nombre.toLowerCase().includes(q)) : [];
  }, [rutas, texto]);

  // Crear el mapa una vez
  useEffect(() => {
    if (!contenedor.current) return;
    const centro = CENTRO_CAZORLA;
    const m = new maplibregl.Map({
      container: contenedor.current,
      style: ESTILO_VACIO,
      center: [centro.lng, centro.lat],
      zoom: 15.5,
      attributionControl: { compact: true },
    });
    mapa.current = m;
    // Cada vez que cambia el estilo hay que volver a poner las capas de la ruta
    // (isStyleLoaded() espera también a las teselas: no sirve para saber si se pueden añadir capas)
    m.on('style.load', () => {
      estiloCargado.current = true;
      setEstiloListo((n) => n + 1);
    });
    m.on('styledata', () => {
      if (estiloCargado.current && !m.getLayer('ruta-linea')) setEstiloListo((n) => n + 1);
    });
    // Tocar una parada numerada abre su ficha
    m.on('click', 'ruta-paradas', (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) navegar(`/lugar/${id}`);
    });
    m.on('mouseenter', 'ruta-paradas', () => (m.getCanvas().style.cursor = 'pointer'));
    m.on('mouseleave', 'ruta-paradas', () => (m.getCanvas().style.cursor = ''));
    return () => {
      m.remove();
      mapa.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Estilo de Pío (calles / noche) o relieve
  useEffect(() => {
    let vivo = true;
    estiloMapa(estilo).then((st) => {
      if (!vivo || !mapa.current) return;
      estiloCargado.current = false;
      mapa.current.setStyle(st, { diff: false });
    });
    return () => {
      vivo = false;
    };
  }, [estilo]);

  // Capas de la ruta: trazado a pie, borde blanco y paradas numeradas (la siguiente en amarillo)
  const oscuro = estilo === 'noche';
  useEffect(() => {
    const m = mapa.current;
    if (!m || !estiloCargado.current || !estiloListo) return;
    const azul = oscuro ? '#5FB3D1' : ruta?.color || '#1B6E8A';
    const siguiente = ruta ? progresoRuta(ruta.paradas, sellos).siguiente : null;
    const linea = trazado
      ? { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: trazado.coords } }
      : COLECCION_VACIA;
    const puntos = {
      type: 'FeatureCollection' as const,
      features: paradas.map(({ punto, n }) => ({
        type: 'Feature' as const,
        properties: { id: punto.id, n: String(n), estado: sellos[punto.id] ? 'hecha' : punto.id === siguiente ? 'siguiente' : 'pendiente' },
        geometry: { type: 'Point' as const, coordinates: [punto.lng, punto.lat] },
      })),
    };
    if (!m.getSource('ruta')) {
      m.addSource('ruta', { type: 'geojson', data: linea });
      m.addSource('ruta-p', { type: 'geojson', data: puntos });
      m.addLayer({ id: 'ruta-borde', type: 'line', source: 'ruta', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': oscuro ? '#111A20' : '#FFFFFF', 'line-width': 9 } });
      m.addLayer({ id: 'ruta-linea', type: 'line', source: 'ruta', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': azul, 'line-width': 5 } });
      m.addLayer({
        id: 'ruta-paradas',
        type: 'circle',
        source: 'ruta-p',
        paint: {
          'circle-radius': ['match', ['get', 'estado'], 'siguiente', 15, 13],
          'circle-color': ['match', ['get', 'estado'], 'hecha', azul, 'siguiente', '#F2B705', '#FFFFFF'],
          'circle-stroke-color': ['match', ['get', 'estado'], 'hecha', '#FFFFFF', azul],
          'circle-stroke-width': 3,
        },
      });
      m.addLayer({
        id: 'ruta-numeros',
        type: 'symbol',
        source: 'ruta-p',
        layout: { 'text-field': ['get', 'n'], 'text-font': FUENTE_NUMEROS, 'text-size': 14, 'text-allow-overlap': true, 'text-ignore-placement': true },
        paint: { 'text-color': ['match', ['get', 'estado'], 'hecha', '#FFFFFF', '#22313A'] },
      });
    } else {
      (m.getSource('ruta') as GeoJSONSource).setData(linea);
      (m.getSource('ruta-p') as GeoJSONSource).setData(puntos);
      m.setPaintProperty('ruta-linea', 'line-color', azul);
    }
    // En recto (sin camino a pie) la línea va a trazos, para que no parezca un camino
    m.setPaintProperty('ruta-linea', 'line-dasharray', trazado && !trazado.aPie ? [1, 1.6] : [1, 0]);
  }, [estiloListo, trazado, paradas, ruta, sellos, oscuro]);

  // Encuadrar la ruta entera entre la cabecera y la tarjeta de abajo
  const encuadrar = useCallback(() => {
    const m = mapa.current;
    const coords = trazado?.coords;
    if (!m || !coords || coords.length < 2) return;
    const limites = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    const alto = m.getContainer().clientHeight;
    const cabecera = document.querySelector('.pantalla-mapa .cabecera-flotante')?.getBoundingClientRect().bottom ?? 200;
    const hoja = document.querySelector('.pantalla-mapa .hoja-inferior')?.getBoundingClientRect().top ?? alto - 300;
    m.fitBounds(limites, { padding: { top: cabecera + 24, bottom: Math.max(40, alto - hoja + 24), left: 40, right: 80 }, maxZoom: 17.5, duration: 600 });
  }, [trazado]);
  const encuadrado = useRef<string | null>(null);
  useEffect(() => {
    if (!ruta || !trazado) {
      encuadrado.current = null;
      return;
    }
    // Una vez por ruta, y otra cuando llega el camino a pie (cambia un poco el encuadre)
    const clave = `${ruta.id}-${trazado.aPie}`;
    if (encuadrado.current === clave) return;
    encuadrado.current = clave;
    requestAnimationFrame(encuadrar);
  }, [ruta, trazado, encuadrar]);

  // Pines de los lugares: azul con punto amarillo (manual) si la ubicación está verificada;
  // blanco con borde azul si es aproximada (D18). Con una ruta elegida solo se ven sus paradas.
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    marcadores.current.forEach((mk) => mk.remove());
    marcadores.current = (ruta ? [] : visibles).map((p) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = p.verificado ? 'pin-mapa' : 'pin-mapa aprox';
      boton.setAttribute('aria-label', p.verificado ? p.nombre : `${p.nombre} (${t('comun.aprox')})`);
      boton.innerHTML = `<img src="/brand/${p.verificado ? 'pio-pin-azul' : 'pio-pin-aprox'}.svg" alt="" width="30" height="40">`;
      boton.addEventListener('click', () => navegar(`/lugar/${p.id}`));
      return new maplibregl.Marker({ element: boton, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(m);
    });
  }, [visibles, navegar, ruta]);

  // Tu posición
  useEffect(() => {
    const m = mapa.current;
    if (!m || !s.posicion) return;
    if (!marcaYo.current) {
      const el = document.createElement('div');
      el.className = 'marca-yo';
      el.setAttribute('aria-label', t('mapa.tuPosicion'));
      marcaYo.current = new maplibregl.Marker({ element: el }).setLngLat([s.posicion.lng, s.posicion.lat]).addTo(m);
      if (s.modoAlrededor && !idRuta) m.jumpTo({ center: [s.posicion.lng, s.posicion.lat], zoom: 16 });
    } else {
      marcaYo.current.setLngLat([s.posicion.lng, s.posicion.lat]);
    }
  }, [s.posicion, s.modoAlrededor, idRuta]);

  const irAMiPosicion = () => {
    const p = s.posicion ?? CENTRO_CAZORLA;
    mapa.current?.easeTo({ center: [p.lng, p.lat], zoom: Math.max(mapa.current.getZoom(), 16) });
  };

  // Datos de la tarjeta de la ruta
  const progreso = ruta ? progresoRuta(ruta.paradas, sellos) : null;
  const sig = progreso?.siguiente ? paradas.find((x) => x.punto.id === progreso.siguiente) : undefined;
  const nSig = progreso?.siguiente && ruta ? ruta.paradas.indexOf(progreso.siguiente) + 1 : 0;
  const dSig = sig && s.posicion ? distancia(s.posicion, sig.punto) : null;
  const nombreSig = progreso?.siguiente ? (sig?.punto.nombre ?? ruta?.nombres[progreso.siguiente] ?? '') : '';

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
          <input
            type="search"
            placeholder={t('mapa.buscar')}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              if (e.target.value.trim()) setListaAbierta(true);
            }}
          />
        </label>
        <div className="fila-pildoras">
          {ruta ? (
            <button type="button" className="pildora" aria-pressed="true" aria-label={t('mapa.quitarRuta', { nombre: ruta.nombre })} onClick={() => elegirRuta(null)}>
              {ruta.nombre}
              <Icono nombre="cerrar" tamano={16} />
            </button>
          ) : (
            <button type="button" className="pildora" aria-pressed={categoria === 'todo'} onClick={() => setCategoria('todo')}>
              {t('mapa.todo')}
            </button>
          )}
          {!ruta &&
            rutas.map((r) => (
              <button key={`r${r.id}`} type="button" className="pildora" aria-pressed="false" onClick={() => elegirRuta(r.id)}>
                <Icono nombre={iconoRuta(r.icono)} tamano={16} />
                {r.nombre}
              </button>
            ))}
          {!ruta &&
            categorias.map((c) => (
              <button key={c.slug} type="button" className="pildora" aria-pressed={categoria === c.slug} onClick={() => setCategoria(c.slug)}>
                {c.nombre}
              </button>
            ))}
        </div>
      </header>

      <div className="botones-mapa">
        <button type="button" className="boton-mapa" aria-label={t('mapa.capas')} aria-expanded={verCapas} onClick={() => setVerCapas((v) => !v)}>
          <Icono nombre="capas" tamano={22} />
        </button>
        {verCapas && (
          <div className="selector-estilo" role="group" aria-label={t('mapa.estilo')}>
            {(['calles', 'relieve', 'noche'] as Estilo[]).map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={estilo === e}
                onClick={() => {
                  setEstilo(e);
                  setVerCapas(false);
                }}
              >
                {t(`mapa.${e}`)}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="boton-mapa" aria-label={t('mapa.centrar')} onClick={irAMiPosicion}>
          <Icono nombre="gps" tamano={22} />
        </button>
      </div>

      {ruta && progreso ? (
        <section className="hoja-inferior hoja-ruta" aria-label={ruta.nombre}>
          <span className="asa" aria-hidden="true" />
          <span className="etiqueta-azul">
            {[
              t('ruta.paradas', { n: progreso.total }),
              trazado?.aPie && trazado.distancia ? formatearDistancia(trazado.distancia) : null,
              trazado?.aPie && trazado.duracion ? t('ruta.aPie', { tiempo: formatearDuracion(trazado.duracion) }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <h2 className="titulo-3">{ruta.nombre}</h2>
          <div className="fila-progreso">
            <span className="barra-progreso">
              <span style={{ width: `${progreso.total ? (progreso.hechos / progreso.total) * 100 : 0}%` }} />
            </span>
            <strong className="pequeno">{t('ruta.progreso', { hechos: progreso.hechos, total: progreso.total })}</strong>
          </div>
          {trazado && !trazado.aPie && <p className="nota">{t('ruta.enRecto')}</p>}
          {progreso.siguiente && (
            <Link to={`/lugar/${progreso.siguiente}`} className="parada-siguiente">
              <span className="num-parada siguiente">{nSig}</span>
              <span className="fila-lista-texto">
                <strong>{nombreSig}</strong>
                <span className="nota">
                  {[progreso.hechos ? t('ruta.siguienteCorta') : t('ruta.primera'), dSig !== null ? formatearDistancia(dSig) : null].filter(Boolean).join(' · ')}
                </span>
              </span>
            </Link>
          )}
          <div className="fila-botones">
            <Link to={esRutaViaje(ruta.id) ? `/viaje?dia=${diaDeRuta(ruta.id)}` : `/ruta/${ruta.id}`} className="boton-secundario">
              {t('ruta.verParadas')}
            </Link>
            {progreso.completa ? (
              <span className="boton-principal ancho desactivado">{t('ruta.terminada')}</span>
            ) : (
              <Link to={`/guia/${progreso.siguiente}`} className="boton-principal ancho">
                <Icono nombre="flecha" tamano={18} />
                {t('ruta.irParada', { n: nSig })}
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className={listaAbierta ? 'hoja-inferior' : 'hoja-inferior recogida'}>
          <button
            type="button"
            className="asa-boton"
            aria-label={listaAbierta ? t('mapa.ocultarLista') : t('mapa.verLista')}
            aria-expanded={listaAbierta}
            onClick={() => setListaAbierta((a) => !a)}
          >
            <span className="asa" aria-hidden="true" />
          </button>
          <div className="fila-titulo">
            <h2 className="titulo-3">{t('mapa.cercaDeTi')}</h2>
            <button type="button" className="pildora" onClick={() => setRadio((r) => (r + 1) % RADIOS.length)}>
              <Icono nombre="filtro" tamano={16} />
              {t('mapa.hasta', { distancia: formatearDistancia(RADIOS[radio]) })}
            </button>
          </div>
          {!listaAbierta && (
            <div className="resumen-hoja">
              <span className="texto-suave">
                {visibles.length === 1
                  ? t('mapa.resumenUno', { distancia: formatearDistancia(RADIOS[radio]) })
                  : t('mapa.resumen', { n: visibles.length, distancia: formatearDistancia(RADIOS[radio]) })}
              </span>
              <button type="button" className="boton-ver-lista" aria-expanded="false" onClick={() => setListaAbierta(true)}>
                {t('mapa.verLista')}
                <Icono nombre="arriba" tamano={16} />
              </button>
            </div>
          )}
          {listaAbierta && (
            <div className="lista-lugares">
              {rutasBuscadas.map((r) => (
                <button key={`r${r.id}`} type="button" className="fila-lista" onClick={() => elegirRuta(r.id)}>
                  <span className="foto-hueco icono-ruta-lista" aria-hidden="true">
                    <Icono nombre={iconoRuta(r.icono)} tamano={22} />
                  </span>
                  <span className="fila-lista-texto">
                    <strong>{r.nombre}</strong>
                    <span className="texto-suave">{t('ruta.paradas', { n: r.paradas.length })}</span>
                  </span>
                  <Icono nombre="derecha" tamano={20} />
                </button>
              ))}
              {/* Si la API falla sin nada guardado, el aviso con «Reintentar» sale encima de la barra */}
              {visibles.length === 0 && rutasBuscadas.length === 0 && !(!datos && error) && (
                <p className="texto-suave">{!datos && cargando ? t('comun.cargando') : t('mapa.sinResultados')}</p>
              )}
              {visibles.slice(0, 20).map((p) => (
                <Link key={p.id} to={`/lugar/${p.id}`} className="fila-lista">
                  <FotoHueco slug={p.categoria.slug} tamano={48} foto={p.foto} />
                  <span className="fila-lista-texto">
                    <strong>{p.nombre}</strong>
                    <span className={p.categoria.slug === 'senderos' ? 'texto-verde' : 'texto-suave'}>
                      {[p.categoria.nombre, p.d !== null ? formatearDistancia(p.d) : null, p.verificado ? null : t('comun.aprox')]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <Icono nombre="derecha" tamano={20} />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <BarraNavegacion />
    </main>
  );
}
