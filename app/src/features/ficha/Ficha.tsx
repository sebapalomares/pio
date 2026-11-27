import { Link, useParams } from 'react-router-dom';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { useAlmacen } from '../../lib/almacen';
import { useLectura } from '../../lib/voz';
import { distancia, formatearDistancia } from '../../lib/geo';
import { buscarPunto, rutasDePunto, useDatos, useFicha } from '../../lib/datos';
import { BotonVolver } from '../../components/Comunes';
import { Icono, iconoCategoria } from '../../components/Icono';

const dominio = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/** Pantalla 3 · Ficha del lugar, con los datos de /puntos/{id}. */
export default function Ficha() {
  const { id = '' } = useParams();
  const s = useSensores();
  const { datos, cargando } = useDatos();
  const { mochila, alternarMochila } = useAlmacen();
  const voz = useLectura();
  const { ficha, estado } = useFicha(id);
  // Lo de la lista se ve al momento (y con la posición del modo prueba); la ficha completa, en cuanto llega
  const resumen = buscarPunto(s.puntos, id);
  const p = ficha ? { ...ficha, ...(resumen ? { lat: resumen.lat, lng: resumen.lng } : {}) } : resumen;

  if (!p) {
    const esperando = estado === 'cargando' || (cargando && !datos);
    return (
      <main className="pantalla pantalla-texto">
        <BotonVolver a="/mapa" />
        <p>{esperando ? t('comun.cargando') : estado === 'sin-conexion' ? t('ficha.sinConexion') : t('ficha.noEncontrado')}</p>
      </main>
    );
  }

  const conCoords = p.lat !== null && p.lng !== null;
  const d = s.posicion && conCoords ? distancia(s.posicion, { lat: p.lat!, lng: p.lng! }) : null;
  const enMochila = mochila.includes(p.id);
  const rutas = rutasDePunto(datos?.rutas ?? [], p.id);
  const fotos = ficha ? [...new Set([...(ficha.galeria ?? []), ...(ficha.foto ? [ficha.foto] : [])])] : p.foto ? [p.foto] : [];
  const texto = ficha?.texto ?? '';
  const compartir = () => {
    const datosCompartir = { title: p.nombre, url: window.location.href };
    if (navigator.share) void navigator.share(datosCompartir).catch(() => {});
  };

  return (
    <main className="pantalla pantalla-ficha">
      <div className="ficha-foto">
        {fotos[0] ? (
          <img className="ficha-foto-img" src={fotos[0]} alt="" />
        ) : (
          <span className="ficha-foto-icono" aria-hidden="true">
            <Icono nombre={iconoCategoria(p.categoria.slug)} tamano={64} />
          </span>
        )}
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
        {fotos.length > 1 && <span className="banda-foto">{t('ficha.fotos', { n: fotos.length })}</span>}
      </div>

      <div className="ficha-cuerpo">
        <div className="pila-8">
          <div className="fila">
            <span className="chip chip-azul">{p.categoria.nombre}</span>
            {!p.verificado && conCoords && <span className="chip chip-aprox">{t('comun.aprox')}</span>}
          </div>
          <h1 className="titulo-2">{p.nombre}</h1>
          {(ficha?.direccion || d !== null) && (
            <span className="texto-suave">
              {[ficha?.direccion, d !== null ? t('comun.aDistancia', { distancia: formatearDistancia(d) }) : null].filter(Boolean).join(' · ')}
            </span>
          )}
          {!conCoords && <span className="texto-aviso">{t('ficha.sinUbicacion')}</span>}
        </div>

        <div className="rejilla-3">
          {conCoords ? (
            <Link to={`/guia/${p.id}`} className="accion accion-principal">
              <Icono nombre="flecha" />
              {t('comun.llevame')}
            </Link>
          ) : (
            <span className="accion accion-principal desactivado" aria-disabled="true">
              <Icono nombre="flecha" />
              {t('comun.llevame')}
            </span>
          )}
          <button type="button" className="accion" onClick={() => voz.alternar(`${p.nombre}. ${texto}`)} disabled={!voz.disponible || !texto}>
            <Icono nombre={voz.hablando ? 'pausa' : 'auriculares'} />
            {voz.hablando ? t('comun.parar') : t('comun.escuchar')}
          </button>
          {conCoords ? (
            <Link to="/explorar" className="accion">
              <Icono nombre="camara" />
              {t('ficha.verEnRa')}
            </Link>
          ) : (
            <span className="accion desactivado" aria-disabled="true">
              <Icono nombre="camara" />
              {t('ficha.verEnRa')}
            </span>
          )}
        </div>

        {ficha?.descripcion ? (
          <div className="cuerpo ficha-texto" dangerouslySetInnerHTML={{ __html: ficha.descripcion }} />
        ) : (
          estado === 'cargando' && <p className="texto-suave">{t('comun.cargando')}</p>
        )}

        <div className="caja-datos">
          {ficha?.horario && (
            <div className="fila-dato">
              <Icono nombre="reloj" tamano={20} />
              <span className="texto-suave">{t('ficha.horario')}</span>
              <strong>{ficha.horario}</strong>
            </div>
          )}
          {ficha?.precio && (
            <div className="fila-dato">
              <Icono nombre="entrada" tamano={20} />
              <span className="texto-suave">{t('ficha.entrada')}</span>
              <strong>{ficha.precio}</strong>
            </div>
          )}
          {ficha?.telefono && (
            <a href={`tel:${ficha.telefono.replace(/[^\d+]/g, '')}`} className="fila-dato enlace">
              <Icono nombre="telefono" tamano={20} />
              <span className="texto-suave">{t('ficha.telefono')}</span>
              <strong>{ficha.telefono}</strong>
            </a>
          )}
          {ficha?.web && (
            <a href={ficha.web} className="fila-dato enlace" target="_blank" rel="noopener">
              <Icono nombre="enlace" tamano={20} />
              <span className="texto-suave">{t('ficha.web')}</span>
              <strong>{dominio(ficha.web)}</strong>
            </a>
          )}
          {rutas.map((r) => (
            <Link key={r.id} to={`/ruta/${r.id}`} className="fila-dato enlace">
              <Icono nombre="pasaporte" tamano={20} />
              <span className="texto-suave">{t('ficha.enRutas')}</span>
              <strong>{r.nombre}</strong>
            </Link>
          ))}
          {ficha?.enlace && (
            <a href={ficha.enlace} className="fila-dato enlace" target="_blank" rel="noopener">
              <Icono nombre="info" tamano={20} />
              <strong className="texto-azul">{t('ficha.enLaWeb')}</strong>
            </a>
          )}
          <button type="button" className="fila-dato enlace" onClick={() => alternarMochila(p.id)}>
            <Icono nombre={enMochila ? 'check' : 'mochila'} tamano={20} />
            <span>
              <strong className="texto-azul">{enMochila ? t('ficha.enMochila') : t('ficha.mochila')}</strong>
              <span className="nota">{t('ficha.mochilaNota')}</span>
            </span>
          </button>
        </div>
      </div>

      {ficha?.reserva_url && (
        <div className="barra-accion">
          <div className="barra-accion-texto">
            <span className="nota">{t('ficha.reservaTitulo')}</span>
            <strong>{t('ficha.reservaDonde')}</strong>
          </div>
          <a href={ficha.reserva_url} className="boton-principal" target="_blank" rel="noopener">
            {t('ficha.reservar')}
          </a>
        </div>
      )}
    </main>
  );
}
