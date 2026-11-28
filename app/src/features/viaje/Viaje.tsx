import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { t } from '../../i18n';
import { useAlmacen } from '../../lib/almacen';
import { useSensores } from '../../lib/contexto';
import { distancia, formatearDistancia } from '../../lib/geo';
import { PLANIFICADOR_ACTIVO, URL_PLANIFICADOR, idRutaDia, leerDias, useViaje } from '../../lib/viaje';
import { progresoRuta } from '../pasaporte/Pasaporte';
import { BarraNavegacion } from '../../components/Comunes';
import { Icono } from '../../components/Icono';

/**
 * «Tu viaje»: el viaje del planificador de turismocazorla.info abierto en Pío (D27).
 * /viaje?d=…&t=… guarda el viaje en el móvil; /viaje?dia=N abre ese día.
 */
export default function Viaje() {
  if (!PLANIFICADOR_ACTIVO) return <Navigate to="/" replace />;
  return <PantallaViaje />;
}

function PantallaViaje() {
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const s = useSensores();
  const { sellos } = useAlmacen();
  const { viaje, estado, actualizar, abrir, quitar } = useViaje();
  const [dia, setDia] = useState(() => Math.max(1, Number(params.get('dia')) || 1));

  // Enlace del planificador: se guarda el viaje y se limpia la dirección (así «atrás» no lo reabre)
  const d = params.get('d');
  useEffect(() => {
    if (d === null) return;
    abrir(leerDias(d), params.get('t')?.trim().slice(0, 80) || null);
    setDia(1);
    setParams({}, { replace: true });
  }, [d, params, abrir, setParams]);

  // Al abrir la pantalla (y con cada viaje nuevo) se piden los lugares a la API
  const clave = viaje ? JSON.stringify(viaje.dias) : '';
  useEffect(() => {
    if (clave) void actualizar();
  }, [clave, actualizar]);

  if (!viaje) {
    return (
      <main className="pantalla pantalla-clara">
        <div className="contenido-desplazable">
          <h1 className="titulo-1">{t('viaje.titulo')}</h1>
          <p className="texto-suave">{d !== null ? t('comun.cargando') : t('viaje.vacio')}</p>
          <a href={URL_PLANIFICADOR} className="boton-principal ancho">
            {t('viaje.irPlanificador')}
          </a>
        </div>
        <BarraNavegacion />
      </main>
    );
  }

  const nDias = viaje.dias.length;
  const actual = Math.min(dia, nDias);
  const ids = viaje.dias[actual - 1] ?? [];
  const paradasPio = ids.filter((id) => viaje.lugares[id]?.esPunto);
  const { siguiente, completa } = progresoRuta(paradasPio, sellos);
  const sinResolver = !viaje.actualizado;

  return (
    <main className="pantalla pantalla-clara">
      <div className="contenido-desplazable con-barra-accion">
        <Link to="/pasaporte" className="enlace-volver">
          <Icono nombre="atras" />
          {t('nav.pasaporte')}
        </Link>
        <div>
          <span className="etiqueta-azul">
            {[nDias === 1 ? t('viaje.unDia') : t('viaje.dias', { n: nDias }), t('viaje.lugares', { n: idsUnicos(viaje.dias) })].join(' · ')}
          </span>
          <h1 className="titulo-1">{viaje.titulo || t('viaje.titulo')}</h1>
          <p className="nota">{t('viaje.delPlanificador')}</p>
        </div>

        {estado === 'sin-conexion' && <p className="nota">{t('viaje.sinConexion')}</p>}
        {estado === 'apagado' && <p className="nota">{t('viaje.apagado')}</p>}

        {nDias > 1 && (
          <div className="fila-pildoras" role="group" aria-label={t('viaje.titulo')}>
            {viaje.dias.map((_, i) => (
              <button key={i} type="button" className="pildora" aria-pressed={actual === i + 1} onClick={() => setDia(i + 1)}>
                {t('viaje.dia', { n: i + 1 })}
              </button>
            ))}
          </div>
        )}

        <ol className="lista-paradas">
          {ids.map((id, i) => {
            const l = viaje.lugares[id];
            const falta = viaje.faltan.includes(id);
            const n = i + 1;
            if (!l) {
              return (
                <li key={id}>
                  <span className="fila-parada">
                    <span className="num-parada">{n}</span>
                    <span className="fila-lista-texto">
                      <strong>{falta ? t('viaje.yaNoEsta') : t('viaje.cargandoLugar')}</strong>
                    </span>
                  </span>
                </li>
              );
            }
            const d = s.posicion && l.lat !== null && l.lng !== null ? distancia(s.posicion, { lat: l.lat, lng: l.lng }) : null;
            if (!l.esPunto) {
              // Alojamientos, empresas…: sin sello; se abre su ficha en la web
              return (
                <li key={id}>
                  <a href={l.enlace ?? URL_PLANIFICADOR} className="fila-parada" target="_blank" rel="noopener">
                    <span className="num-parada">{n}</span>
                    <span className="fila-lista-texto">
                      <strong>{l.nombre}</strong>
                      <span className="nota">{[l.tipoNombre ?? t('viaje.sinPio'), d !== null ? formatearDistancia(d) : null].filter(Boolean).join(' · ')}</span>
                    </span>
                    <Icono nombre="enlace" tamano={18} etiqueta={t('viaje.enWeb')} />
                  </a>
                </li>
              );
            }
            const hecha = Boolean(sellos[id]);
            const esSiguiente = id === siguiente;
            return (
              <li key={id}>
                <Link to={`/lugar/${id}`} className="fila-parada">
                  <span className={hecha ? 'num-parada hecha' : esSiguiente ? 'num-parada siguiente' : 'num-parada'}>
                    {hecha ? <Icono nombre="check" tamano={16} /> : n}
                  </span>
                  <span className="fila-lista-texto">
                    <strong>{l.nombre}</strong>
                    <span className="nota">
                      {[hecha ? t('ruta.sellada') : esSiguiente ? t('ruta.siguienteCorta') : t('ruta.porVisitar'), d !== null ? formatearDistancia(d) : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        {!sinResolver && paradasPio.length === 0 && <p className="nota">{t('viaje.sinPuntos')}</p>}

        <a href={URL_PLANIFICADOR} className="boton-secundario">
          {t('viaje.editar')}
        </a>
        <button
          type="button"
          className="boton-texto"
          onClick={() => {
            quitar();
            navegar('/pasaporte', { replace: true });
          }}
        >
          {t('viaje.quitar')}
        </button>
      </div>

      <div className="barra-accion">
        {paradasPio.length > 0 && (
          <Link to={`/mapa?ruta=${idRutaDia(actual)}`} className="boton-secundario">
            {t('nav.mapa')}
          </Link>
        )}
        {paradasPio.length === 0 ? null : completa ? (
          <span className="boton-principal ancho desactivado">{t('viaje.diaHecho')}</span>
        ) : (
          <Link to={`/guia/${siguiente}`} className="boton-principal ancho">
            <Icono nombre="flecha" tamano={18} />
            {t('viaje.siguiente')}
          </Link>
        )}
      </div>
    </main>
  );
}

const idsUnicos = (dias: string[][]) => new Set(dias.flat()).size;
