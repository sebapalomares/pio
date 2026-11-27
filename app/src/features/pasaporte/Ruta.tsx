import { Link, useParams } from 'react-router-dom';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { useAlmacen } from '../../lib/almacen';
import { distancia, formatearDistancia } from '../../lib/geo';
import { buscarPunto, buscarRuta, useDatos } from '../../lib/datos';
import { Icono } from '../../components/Icono';
import { progresoRuta } from './Pasaporte';

/** Pantalla 7 · Detalle de una ruta. */
export default function Ruta() {
  const { id = '' } = useParams();
  const s = useSensores();
  const { sellos, mochila, alternarMochila } = useAlmacen();
  const { datos, cargando } = useDatos();
  const ruta = buscarRuta(datos?.rutas ?? [], id);
  if (!ruta) {
    return (
      <main className="pantalla pantalla-texto">
        <Link to="/pasaporte" className="enlace-volver">
          <Icono nombre="atras" />
          {t('nav.pasaporte')}
        </Link>
        <p>{!datos && cargando ? t('comun.cargando') : t('ruta.noEncontrada')}</p>
      </main>
    );
  }

  // Las paradas sin coordenadas (D19) salen en la lista, pero no en el mini mapa
  const paradas = ruta.paradas.map((pid) => buscarPunto(s.puntos, pid) ?? { id: pid, nombre: ruta.nombres[pid] ?? pid, lat: null, lng: null });
  const conCoords = paradas.filter((p): p is typeof p & { lat: number; lng: number } => p.lat !== null && p.lng !== null);
  const { hechos, total, siguiente, completa } = progresoRuta(ruta.paradas, sellos);
  const nSiguiente = siguiente ? ruta.paradas.indexOf(siguiente) + 1 : 0;

  // Mini mapa esquemático: paradas colocadas por sus coordenadas
  const lats = conCoords.map((p) => p.lat);
  const lngs = conCoords.map((p) => p.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const xy = (p: { lat: number; lng: number }) => ({
    x: 24 + ((p.lng - minLng) / (maxLng - minLng || 1)) * 310,
    y: 116 - ((p.lat - minLat) / (maxLat - minLat || 1)) * 92,
  });

  return (
    <main className="pantalla pantalla-clara">
      <div className="contenido-desplazable con-barra-accion">
        <Link to="/pasaporte" className="enlace-volver">
          <Icono nombre="atras" />
          {t('nav.pasaporte')}
        </Link>
        <div>
          <span className="etiqueta-azul">{t('ruta.paradas', { n: total })}</span>
          <h1 className="titulo-1">{ruta.nombre}</h1>
        </div>
        <div className="fila-progreso">
          <span className="barra-progreso">
            <span style={{ width: `${total ? (hechos / total) * 100 : 0}%` }} />
          </span>
          <strong className="pequeno">{t('ruta.progreso', { hechos, total })}</strong>
        </div>

        <svg className="mini-mapa" viewBox="0 0 358 140" role="img" aria-label={ruta.nombre}>
          <polyline
            points={conCoords.map((p) => `${xy(p).x},${xy(p).y}`).join(' ')}
            fill="none"
            stroke="#1B6E8A"
            strokeWidth="3"
            strokeDasharray="6 6"
            strokeLinecap="round"
          />
          {conCoords.map((p) => {
            const i = ruta.paradas.indexOf(p.id);
            const { x, y } = xy(p);
            const hecha = Boolean(sellos[p.id]);
            const esSiguiente = p.id === siguiente;
            return (
              <g key={p.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={esSiguiente ? 12 : 9}
                  fill={hecha ? '#1B6E8A' : esSiguiente ? '#F2B705' : '#FFFFFF'}
                  stroke={hecha || esSiguiente ? '#FFFFFF' : '#8A949C'}
                  strokeWidth={esSiguiente ? 3 : 2}
                />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={hecha ? '#FFFFFF' : '#22313A'}>
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>

        <ol className="lista-paradas">
          {paradas.map((p, i) => {
            const hecha = Boolean(sellos[p.id]);
            const esSiguiente = p.id === siguiente;
            const d = s.posicion && p.lat !== null && p.lng !== null ? distancia(s.posicion, { lat: p.lat, lng: p.lng }) : null;
            return (
              <li key={p.id}>
                <Link to={`/lugar/${p.id}`} className="fila-parada">
                  <span className={hecha ? 'num-parada hecha' : esSiguiente ? 'num-parada siguiente' : 'num-parada'}>
                    {hecha ? <Icono nombre="check" tamano={16} /> : i + 1}
                  </span>
                  <span className="fila-lista-texto">
                    <strong>{p.nombre}</strong>
                    <span className="nota">
                      {hecha
                        ? t('ruta.sellada')
                        : esSiguiente
                          ? t('ruta.siguiente', { distancia: d !== null ? formatearDistancia(d) : '—' })
                          : t('ruta.porVisitar')}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="barra-accion">
        <button
          type="button"
          className="boton-cuadrado"
          aria-label={t('ruta.mochila')}
          aria-pressed={mochila.includes(ruta.id)}
          onClick={() => alternarMochila(ruta.id)}
        >
          <Icono nombre={mochila.includes(ruta.id) ? 'check' : 'mochila'} tamano={22} />
        </button>
        <Link to="/mapa" className="boton-secundario">
          {t('nav.mapa')}
        </Link>
        {completa ? (
          <span className="boton-principal ancho desactivado">{t('ruta.terminada')}</span>
        ) : (
          <Link to={`/guia/${siguiente}`} className="boton-principal ancho">
            <Icono nombre="flecha" tamano={18} />
            {t('ruta.irParada', { n: nSiguiente })}
          </Link>
        )}
      </div>
    </main>
  );
}
