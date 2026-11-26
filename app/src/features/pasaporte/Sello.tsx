import { Link, useParams } from 'react-router-dom';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { useAlmacen } from '../../lib/almacen';
import { distancia, formatearDistancia } from '../../lib/geo';
import { buscarPunto, rutasDePunto } from '../../data/demo';
import { Icono, iconoCategoria } from '../../components/Icono';
import { progresoRuta } from './Pasaporte';

/** Pantalla 8 · Sello conseguido. */
export default function Sello() {
  const { id = '' } = useParams();
  const s = useSensores();
  const { sellos } = useAlmacen();
  const p = buscarPunto(id, s.puntos);
  if (!p) return null;

  const ruta = rutasDePunto(p.id)[0];
  const prog = ruta ? progresoRuta(ruta.paradas, sellos) : null;
  const sig = prog?.siguiente ? buscarPunto(prog.siguiente, s.puntos) : undefined;
  const nParada = ruta ? ruta.paradas.indexOf(p.id) + 1 : 0;
  const fecha = new Date(sellos[p.id] ?? Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase();

  return (
    <main className="pantalla pantalla-clara pantalla-sello">
      <div className="fila-entre">
        <span className="etiqueta-azul">{t('sello.checkin')}</span>
        <Link to="/escanear" className="boton-redondo borde" aria-label={t('comun.cerrar')}>
          <Icono nombre="cerrar" tamano={22} />
        </Link>
      </div>

      <div className="sello" role="img" aria-label={`${t('sello.titulo')}: ${p.nombre}`}>
        <div className="sello-interior">
          <span className="etiqueta-suave">CAZORLA</span>
          <span className="texto-azul">
            <Icono nombre={iconoCategoria(p.categoria.slug)} tamano={44} />
          </span>
          <strong className="titulo-3">{p.nombre}</strong>
          {ruta && <span className="etiqueta-suave">{t('sello.parada', { n: nParada, fecha })}</span>}
        </div>
      </div>

      <div className="centrado">
        <h1 className="titulo-1">{prog?.completa ? t('sello.rutaCompleta') : t('sello.titulo')}</h1>
        {ruta && prog && (
          <p className="texto-suave">{t('sello.progreso', { ruta: ruta.nombre, hechos: prog.hechos, total: prog.total })}</p>
        )}
      </div>

      {ruta && (
        <div className="segmentos" role="img" aria-label={t('ruta.progreso', { hechos: prog?.hechos ?? 0, total: ruta.paradas.length })}>
          {ruta.paradas.map((pid) => (
            <span key={pid} className={sellos[pid] ? 'hecho' : ''} />
          ))}
        </div>
      )}

      {sig && (
        <div className="tarjeta-plana fila-lugar">
          <span className="num-parada siguiente">{ruta.paradas.indexOf(sig.id) + 1}</span>
          <span className="fila-lista-texto">
            <span className="nota">{t('sello.siguiente')}</span>
            <strong>
              {sig.nombre}
              {s.posicion && ` · ${formatearDistancia(distancia(s.posicion, sig))}`}
            </strong>
          </span>
        </div>
      )}

      <div className="pila-8 abajo">
        {sig && (
          <Link to={`/guia/${sig.id}`} className="boton-principal">
            <Icono nombre="flecha" tamano={18} />
            {t('sello.llevame')}
          </Link>
        )}
        {ruta && (
          <Link to={`/ruta/${ruta.id}`} className="boton-secundario">
            {t('sello.verRuta')}
          </Link>
        )}
      </div>
    </main>
  );
}
