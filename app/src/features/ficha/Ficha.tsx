import { Link, useParams } from 'react-router-dom';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { useAlmacen } from '../../lib/almacen';
import { useLectura } from '../../lib/voz';
import { distancia, formatearDistancia } from '../../lib/geo';
import { buscarPunto, rutasDePunto } from '../../data/demo';
import { BotonVolver } from '../../components/Comunes';
import { Icono, iconoCategoria } from '../../components/Icono';

/** Pantalla 3 · Ficha del lugar. */
export default function Ficha() {
  const { id = '' } = useParams();
  const s = useSensores();
  const { mochila, alternarMochila } = useAlmacen();
  const voz = useLectura();
  const p = buscarPunto(id, s.puntos);

  if (!p) {
    return (
      <main className="pantalla pantalla-texto">
        <BotonVolver a="/mapa" />
        <p>{t('ficha.noEncontrado')}</p>
      </main>
    );
  }

  const d = s.posicion ? distancia(s.posicion, p) : null;
  const enMochila = mochila.includes(p.id);
  const rutas = rutasDePunto(p.id);
  const compartir = () => {
    const datos = { title: p.nombre, url: window.location.href };
    if (navigator.share) void navigator.share(datos).catch(() => {});
  };

  return (
    <main className="pantalla pantalla-ficha">
      <div className="ficha-foto">
        <span className="ficha-foto-icono" aria-hidden="true">
          <Icono nombre={iconoCategoria(p.categoria.slug)} tamano={64} />
        </span>
        <div className="ficha-foto-botones">
          <BotonVolver a="/mapa" />
          <div className="fila">
            <button type="button" className="boton-redondo" aria-label={t('ficha.favorito')}>
              <Icono nombre="marcador" tamano={22} />
            </button>
            <button type="button" className="boton-redondo" aria-label={t('ficha.compartir')} onClick={compartir}>
              <Icono nombre="compartir" tamano={22} />
            </button>
          </div>
        </div>
        <span className="banda-foto">{t('ficha.fotos', { n: p.num_fotos })}</span>
      </div>

      <div className="ficha-cuerpo">
        <div className="pila-8">
          <div className="fila">
            <span className="chip chip-azul">{p.categoria.nombre}</span>
            <span className="chip">{t('ficha.conQr')}</span>
          </div>
          <h1 className="titulo-2">{p.nombre}</h1>
          <span className="texto-suave">
            Cazorla{d !== null && ` · ${t('comun.aDistancia', { distancia: formatearDistancia(d) })}`}
          </span>
        </div>

        <div className="rejilla-3">
          <Link to={`/guia/${p.id}`} className="accion accion-principal">
            <Icono nombre="flecha" />
            {t('comun.llevame')}
          </Link>
          <button type="button" className="accion" onClick={() => voz.alternar(`${p.nombre}. ${p.descripcion}`)} disabled={!voz.disponible}>
            <Icono nombre={voz.hablando ? 'pausa' : 'auriculares'} />
            {voz.hablando ? t('comun.parar') : t('comun.escuchar')}
          </button>
          <Link to="/explorar" className="accion">
            <Icono nombre="camara" />
            {t('ficha.verEnRa')}
          </Link>
        </div>

        <p className="cuerpo">{p.descripcion}</p>

        <div className="caja-datos">
          {p.horario && (
            <div className="fila-dato">
              <Icono nombre="reloj" tamano={20} />
              <span className="texto-suave">{t('ficha.horario')}</span>
              <strong>{p.horario}</strong>
            </div>
          )}
          {p.precio && (
            <div className="fila-dato">
              <Icono nombre="entrada" tamano={20} />
              <span className="texto-suave">{t('ficha.entrada')}</span>
              <strong>{p.precio}</strong>
            </div>
          )}
          {p.telefono && (
            <div className="fila-dato">
              <Icono nombre="telefono" tamano={20} />
              <span className="texto-suave">{t('ficha.telefono')}</span>
              <strong>{p.telefono}</strong>
            </div>
          )}
          {rutas.map((r) => (
            <Link key={r.id} to={`/ruta/${r.id}`} className="fila-dato enlace">
              <Icono nombre="pasaporte" tamano={20} />
              <span className="texto-suave">{t('ficha.enRutas')}</span>
              <strong>{r.nombre}</strong>
            </Link>
          ))}
          <button type="button" className="fila-dato enlace" onClick={() => alternarMochila(p.id)}>
            <Icono nombre={enMochila ? 'check' : 'mochila'} tamano={20} />
            <span>
              <strong className="texto-azul">{enMochila ? t('ficha.enMochila') : t('ficha.mochila')}</strong>
              <span className="nota">{t('ficha.mochilaNota')}</span>
            </span>
          </button>
        </div>
      </div>

      {p.reserva_url && (
        <div className="barra-accion">
          <div className="barra-accion-texto">
            <span className="nota">{t('ficha.reservaTitulo')}</span>
            <strong>{t('ficha.reservaDonde')}</strong>
          </div>
          <a href={p.reserva_url} className="boton-principal" target="_blank" rel="noopener">
            {t('ficha.reservar')}
          </a>
        </div>
      )}
    </main>
  );
}
