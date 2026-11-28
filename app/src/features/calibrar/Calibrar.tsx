import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { useCamara } from '../../lib/sensores';
import { distancia, formatearDistancia, rumbo, anguloRelativo } from '../../lib/geo';
import { calibracion, mediaCircular, normalizar, useCalibracion, useCampoVision } from '../../lib/calibracion';
import { anguloElevacion, useElevaciones } from '../../lib/elevacion';
import { BotonVolver } from '../../components/Comunes';
import { CapaRA, type ItemRA } from '../../components/CapaRA';
import { Icono } from '../../components/Icono';

/** Por debajo de esta distancia, el error del GPS pesa demasiado en la dirección. */
const DISTANCIA_MINIMA = 120;
/** Posición de la línea del paso «ancho» (fracción del ancho de pantalla). */
const LINEA_DERECHA = 0.85;
/** Lecturas de brújula que se promedian al pulsar (ms). */
const VENTANA = 1200;

type Paso = 'elegir' | 'centrar' | 'campo' | 'comprobar';

/**
 * Calibrar la brújula y el campo de visión de la cámara de este móvil.
 * 1) Elegir un lugar verificado y lejano. 2) Apuntarlo con la línea central → desfase.
 * 3) Llevarlo a la línea de la derecha → ancho de la imagen. 4) Comprobar y afinar a ojo.
 */
export default function Calibrar() {
  const s = useSensores();
  const { video, error: errorCamara } = useCamara(true);
  const cal = useCalibracion();
  const { campo, medido, estimado } = useCampoVision(video);
  const [paso, setPaso] = useState<Paso>(cal.fecha ? 'comprobar' : 'elegir');
  const [refId, setRefId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const versionAlturas = useElevaciones(s.puntos, s.posicion);

  // Últimas lecturas de la brújula sin corregir, para promediarlas al pulsar
  const lecturas = useRef<{ t: number; v: number }[]>([]);
  useEffect(() => {
    if (s.orientacionBruta === null) return;
    const ahora = Date.now();
    lecturas.current = [...lecturas.current.filter((l) => ahora - l.t < VENTANA), { t: ahora, v: s.orientacionBruta }];
  }, [s.orientacionBruta]);
  const brujulaMedia = () => mediaCircular(lecturas.current.map((l) => l.v));

  // Lugares que sirven de referencia, con la distancia y el rumbo desde aquí: primero los
  // verificados (del más lejano al más cercano) y después los de ubicación aproximada (D22),
  // que valen si están lejos: 20 m de error a 600 m son unos 2°.
  const referencias = useMemo(() => {
    if (!s.posicion || s.modoAlrededor) return [];
    return s.puntos
      .map((p) => ({ ...p, d: distancia(s.posicion!, p), r: rumbo(s.posicion!, p) }))
      .sort((a, b) => (a.verificado === b.verificado ? b.d - a.d : a.verificado ? -1 : 1));
  }, [s.puntos, s.posicion, s.modoAlrededor]);
  const recomendado = referencias.find((p) => p.verificado && p.d >= DISTANCIA_MINIMA)?.id;
  const ref = referencias.find((p) => p.id === refId) ?? null;

  // Todos los lugares, con la calibración ya aplicada (para ver el resultado)
  const items: ItemRA[] = useMemo(() => {
    if (!s.posicion || s.orientacion === null) return [];
    return s.puntos.map((p) => {
      const d = distancia(s.posicion!, p);
      return {
        id: p.id,
        nombre: p.nombre,
        subtitulo: formatearDistancia(d),
        d,
        rel: anguloRelativo(rumbo(s.posicion!, p), s.orientacion!),
        elev: anguloElevacion(s.posicion!, p, d),
      };
    });
    // versionAlturas: recalcular cuando llegan las altitudes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.puntos, s.posicion, s.orientacion, versionAlturas]);

  const elegir = (id: string) => {
    setRefId(id);
    setAviso(null);
    setPaso('centrar');
  };

  const fijarDireccion = () => {
    const media = brujulaMedia();
    if (!ref || media === null) return;
    // desfase = lo que hay que sumar a la brújula para que marque el rumbo real del lugar
    calibracion.ponerDesfase(normalizar(ref.r - media), ref.nombre);
    lecturas.current = [];
    setAviso(null);
    setPaso('campo');
  };

  const fijarAncho = () => {
    const media = brujulaMedia();
    if (!ref || media === null) return;
    // Con el desfase ya puesto, el lugar está a «rel» grados a la derecha del centro…
    const rel = normalizar(ref.r - (media + cal.desfase));
    if (rel < 3) {
      setAviso(t('calibrar.giraMas'));
      return;
    }
    // …y se ve en la línea, que está a (LINEA_DERECHA − 0,5) del ancho desde el centro
    const ancho = rel / (LINEA_DERECHA - 0.5);
    if (ancho < 15 || ancho > 100) {
      setAviso(t('calibrar.campoRaro', { g: Math.round(ancho) }));
      return;
    }
    calibracion.ponerCampo(Math.round(ancho));
    setAviso(null);
    setPaso('comprobar');
  };

  const precisionMala = s.precisionBrujula !== null && (s.precisionBrujula < 0 || s.precisionBrujula > 20);
  const gpsMalo = s.posicion !== null && s.posicion.precision > 25;
  const fecha = cal.fecha ? new Date(cal.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <main className="pantalla pantalla-camara" data-tema="oscuro">
      <video ref={video} className="camara-video" playsInline muted autoPlay />

      {paso === 'comprobar' && <CapaRA items={items} campo={campo} inclinacion={s.inclinacion} margenArriba={200} margenAbajo={230} />}
      {(paso === 'centrar' || paso === 'campo') && (
        <div className={paso === 'centrar' ? 'calibrar-linea' : 'calibrar-linea derecha'} style={paso === 'campo' ? { left: `${LINEA_DERECHA * 100}%` } : undefined} aria-hidden="true">
          <span className="calibrar-mira" />
        </div>
      )}

      <header className="cabecera-flotante">
        <BotonVolver a="/explorar" />
        <span className="calibrar-titulo">{t('calibrar.titulo')}</span>
      </header>

      {/* Instrucciones arriba y en pequeño, para dejar ver el lugar en el centro de la imagen */}
      {paso !== 'elegir' && (
        <div className="calibrar-instruccion" role="status">
          {paso === 'centrar' && ref && (
            <>
              <strong>{t('calibrar.centrar', { nombre: ref.nombre })}</strong>
              <span>{t('calibrar.centrarTexto')}</span>
            </>
          )}
          {paso === 'campo' && ref && (
            <>
              <strong>{t('calibrar.campo')}</strong>
              <span>{t('calibrar.campoTexto', { nombre: ref.nombre })}</span>
            </>
          )}
          {paso === 'comprobar' && (
            <>
              <strong>{t('calibrar.comprobar')}</strong>
              <span>{fecha ? t('calibrar.ultima', { fecha, lugar: cal.referencia ?? '—' }) : t('calibrar.sinCalibrar')}</span>
            </>
          )}
        </div>
      )}

      <div className={paso === 'elegir' ? 'hoja-flotante calibrar-hoja' : 'hoja-flotante calibrar-hoja compacta'}>
        {errorCamara && <p className="texto-aviso">{t('aviso.errorCamara', { error: errorCamara })}</p>}
        {!s.brujulaActiva && (
          <button type="button" className="boton-principal" onClick={() => void s.activarBrujula()}>
            <Icono nombre="brujula" />
            {t('calibrar.activarBrujula')}
          </button>
        )}
        {precisionMala && <p className="texto-aviso">{t('calibrar.ocho')}</p>}
        {gpsMalo && <p className="texto-aviso">{t('calibrar.gpsImpreciso', { m: Math.round(s.posicion!.precision) })}</p>}

        {paso === 'elegir' && (
          <>
            <div>
              <h2 className="titulo-3">{t('calibrar.elige')}</h2>
              <p className="texto-suave">{t('calibrar.intro')}</p>
            </div>
            {s.modoAlrededor ? (
              <p className="texto-aviso">{t('calibrar.sinLugares')}</p>
            ) : !s.posicion ? (
              <p className="texto-suave">{t('calibrar.buscandoGps')}</p>
            ) : (
              <ul className="calibrar-lista">
                {referencias.map((p) => {
                  const cerca = p.d < DISTANCIA_MINIMA;
                  return (
                    <li key={p.id}>
                      <button type="button" disabled={cerca || !s.brujulaActiva} onClick={() => elegir(p.id)}>
                        <span>
                          <strong>{p.nombre}</strong>
                          <span className="texto-suave">
                            {cerca ? t('calibrar.cerca') : formatearDistancia(p.d)}
                            {!cerca && !p.verificado && ` · ${t('calibrar.aproximada')}`}
                          </span>
                        </span>
                        {p.id === recomendado && <span className="chip chip-azul">{t('calibrar.recomendado')}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="texto-suave">
              {s.posicion ? t('calibrar.gps', { m: Math.round(s.posicion.precision) }) : null}
              {s.precisionBrujula !== null && s.precisionBrujula >= 0 ? ` · ${t('calibrar.precisionBrujula', { g: Math.round(s.precisionBrujula) })}` : ''}
            </p>
          </>
        )}

        {paso === 'centrar' && ref && (
          <>
            {!ref.verificado && <p className="texto-aviso">{t('calibrar.aproximadaAviso')}</p>}
            <p className="texto-suave">
              {t('calibrar.lectura', {
                b: s.orientacionBruta !== null ? Math.round(s.orientacionBruta) : '—',
                nombre: ref.nombre,
                r: Math.round(ref.r),
              })}
            </p>
            <div className="fila-botones">
              <button type="button" className="boton-secundario" onClick={() => setPaso('elegir')}>
                {t('calibrar.otroLugar')}
              </button>
              <button type="button" className="boton-principal" disabled={s.orientacionBruta === null} onClick={fijarDireccion}>
                <Icono nombre="check" />
                {t('calibrar.loTengo')}
              </button>
            </div>
          </>
        )}

        {paso === 'campo' && ref && (
          <>
            {aviso && <p className="texto-aviso" role="alert">{aviso}</p>}
            <div className="fila-botones">
              <button type="button" className="boton-secundario" onClick={() => setPaso('comprobar')}>
                {t('calibrar.saltar')}
              </button>
              <button type="button" className="boton-principal" onClick={fijarAncho}>
                <Icono nombre="check" />
                {t('calibrar.enLaLinea')}
              </button>
            </div>
          </>
        )}

        {paso === 'comprobar' && (
          <>
            <div className="calibrar-ajuste">
              <button type="button" className="boton-redondo borde" aria-label={t('calibrar.izquierda')} onClick={() => calibracion.ajustarDesfase(1)}>
                <Icono nombre="atras" />
              </button>
              <span>{t('calibrar.direccion', { g: `${cal.desfase > 0 ? '+' : ''}${Math.round(cal.desfase)}` })}</span>
              <button type="button" className="boton-redondo borde" aria-label={t('calibrar.derecha')} onClick={() => calibracion.ajustarDesfase(-1)}>
                <Icono nombre="derecha" />
              </button>
            </div>
            <div className="calibrar-ajuste">
              <button type="button" className="boton-redondo borde" aria-label={t('calibrar.separar')} onClick={() => calibracion.ponerCampo(campo - 2)}>
                <span aria-hidden="true">−</span>
              </button>
              <span>{medido ? t('calibrar.ancho', { g: Math.round(campo) }) : t('calibrar.anchoEstimado', { g: Math.round(estimado ?? campo) })}</span>
              <button type="button" className="boton-redondo borde" aria-label={t('calibrar.juntar')} onClick={() => calibracion.ponerCampo(campo + 2)}>
                <span aria-hidden="true">+</span>
              </button>
            </div>
            <div className="fila-botones">
              <button type="button" className="boton-secundario" onClick={() => setPaso('elegir')}>
                {t('calibrar.repetir')}
              </button>
              <button type="button" className="boton-secundario" onClick={() => calibracion.reiniciar()}>
                {t('calibrar.restablecer')}
              </button>
              <Link to="/explorar" className="boton-principal">
                {t('calibrar.listo')}
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
