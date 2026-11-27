import { Link, useParams } from 'react-router-dom';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { useCamara } from '../../lib/sensores';
import { useLectura } from '../../lib/voz';
import { anguloRelativo, distancia, formatearDistancia, rumbo } from '../../lib/geo';
import { minutosAPie } from '../../lib/ra';
import { buscarPunto, useDatos, useFicha } from '../../lib/datos';
import { Icono } from '../../components/Icono';

const LLEGADA_M = 25;

/** Pantalla 4 · Guiado hasta el lugar (tema oscuro). */
export default function Guia() {
  const { id = '' } = useParams();
  const s = useSensores();
  const { video } = useCamara(true);
  const voz = useLectura();
  const { datos, cargando } = useDatos();
  const { ficha } = useFicha(id);
  const p = buscarPunto(s.puntos, id);
  if (!p) {
    // Sin coordenadas (D19) no se puede guiar; o los datos aún no han llegado
    return (
      <main className="pantalla pantalla-texto">
        <p>{!datos && cargando ? t('comun.cargando') : ficha ? t('ficha.sinUbicacion') : t('ficha.noEncontrado')}</p>
        <Link to={`/lugar/${id}`} className="boton-secundario">
          {t('comun.verFicha')}
        </Link>
      </main>
    );
  }
  const texto = ficha?.texto ?? '';

  const d = s.posicion ? distancia(s.posicion, p) : null;
  const rel = s.posicion && s.orientacion !== null ? anguloRelativo(rumbo(s.posicion, p), s.orientacion) : null;
  const llegado = d !== null && d <= LLEGADA_M;

  const indicacion =
    rel === null
      ? t('guia.sigueFlecha')
      : Math.abs(rel) > 150
        ? t('guia.detras')
        : rel > 20
          ? t('guia.girarDerecha')
          : rel < -20
            ? t('guia.girarIzquierda')
            : t('guia.recto');

  const maps = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`;

  return (
    <main className="pantalla pantalla-camara" data-tema="oscuro">
      <video ref={video} className="camara-video" playsInline muted autoPlay />

      <div className="tarjeta-flotante guia-indicacion">
        <span className="guia-icono">
          <Icono nombre={llegado ? 'check' : 'flecha'} tamano={28} />
        </span>
        <div>
          <div className="titulo-1">{llegado ? t('guia.llegado') : d !== null ? formatearDistancia(d) : '—'}</div>
          <div className="texto-suave">{llegado ? t('guia.llegadoTexto') : indicacion}</div>
        </div>
      </div>

      {!llegado && (
        <div className="guia-flecha" style={{ transform: `translate(-50%, -50%) rotateX(55deg) rotate(${rel ?? 0}deg)` }} aria-hidden="true">
          <svg viewBox="0 0 100 140" width="120" height="168">
            <path d="M50 4 L92 70 L64 70 L64 136 L36 136 L36 70 L8 70 Z" fill="#F2B705" />
          </svg>
        </div>
      )}

      {!s.brujulaActiva && (
        <div className="centro-flotante">
          <button type="button" className="boton-principal" onClick={() => void s.activarBrujula()}>
            <Icono nombre="brujula" />
            {t('inicio.empezar')}
          </button>
        </div>
      )}

      <div className="pila-flotante-abajo">
        <div className="tarjeta-flotante fila-voz">
          <span className="circulo-suave">
            <Icono nombre="auriculares" tamano={22} />
          </span>
          <p className="pequeno">{p.nombre}{texto && `. ${texto}`}</p>
          <button
            type="button"
            className="boton-circular"
            aria-label={voz.hablando ? t('comun.parar') : t('comun.escuchar')}
            onClick={() => voz.alternar(`${p.nombre}. ${texto}`)}
            disabled={!voz.disponible || !texto}
          >
            <Icono nombre={voz.hablando ? 'pausa' : 'play'} tamano={20} />
          </button>
        </div>

        {llegado ? (
          <Link to="/escanear" className="boton-principal ancho">
            <Icono nombre="qr" />
            {t('guia.escanear')}
          </Link>
        ) : (
          <div className="tarjeta-flotante fila-guia">
            <div className="fila-guia-datos">
              <div>
                <div className="titulo-2">{d !== null ? formatearDistancia(d) : '—'}</div>
                <div className="nota">{t('guia.teFaltan')}</div>
              </div>
              <div>
                <div className="titulo-2">{d !== null ? t('guia.minutos', { n: minutosAPie(d) }) : '—'}</div>
                <div className="nota">{t('guia.aPie')}</div>
              </div>
            </div>
            <a href={maps} className="boton-cuadrado" aria-label={t('guia.abrirMaps')} target="_blank" rel="noopener">
              <Icono nombre="mapa" tamano={22} />
            </a>
            <Link to={`/lugar/${p.id}`} className="boton-aviso">
              {t('guia.salir')}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
