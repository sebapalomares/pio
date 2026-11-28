import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { useCamara } from '../../lib/sensores';
import { formatearDistancia } from '../../lib/geo';
import { usePuntosEnVista } from '../../lib/ra';
import { useCampoVision } from '../../lib/calibracion';
import { anguloElevacion, useElevaciones } from '../../lib/elevacion';
import { CapaRA, type ItemRA } from '../../components/CapaRA';
import { BarraNavegacion, FotoHueco, LogoPastilla, SelectorModo } from '../../components/Comunes';
import { Icono } from '../../components/Icono';
import { Radar } from '../../components/Radar';

/** Pantalla 1 · Explorar con la cámara (tema oscuro). */
export default function ExplorarRA() {
  const s = useSensores();
  const { video, error: errorCamara } = useCamara(true);
  const puntos = usePuntosEnVista(s.puntos, s.posicion, s.orientacion);
  const [elegido, setElegido] = useState<string | null>(null);

  const { campo } = useCampoVision(video);
  const versionAlturas = useElevaciones(s.puntos, s.posicion);

  const enVista = puntos.filter((p) => Math.abs(p.rel) <= campo / 2 + 5);
  // La tarjeta muestra el lugar tocado o, si no, el que tienes más centrado en la cámara.
  const centrado = enVista.reduce<(typeof enVista)[number] | null>((m, p) => (!m || Math.abs(p.rel) < Math.abs(m.rel) ? p : m), null);
  // (el tocado deja de mandar cuando sale de la imagen)
  const seleccionado = enVista.find((p) => p.id === elegido) ?? centrado;

  // Cada lugar con su ángulo sobre el horizonte (relieve del terreno), para la mira de RA.
  const items: ItemRA[] = useMemo(
    () =>
      puntos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        // Ubicación sin verificar (D22): sale, pero marcada como aproximada
        subtitulo: `${p.verificado ? formatearDistancia(p.d) : t('ra.aprox', { distancia: formatearDistancia(p.d) })} · ${p.categoria.nombre}`,
        aproximado: !p.verificado,
        d: p.d,
        rel: p.rel,
        elev: s.posicion ? anguloElevacion(s.posicion, p, p.d) : null,
      })),
    // versionAlturas: recalcular cuando llegan las altitudes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puntos, s.posicion, versionAlturas],
  );

  return (
    <main className="pantalla pantalla-camara" data-tema="oscuro">
      <video ref={video} className="camara-video" playsInline muted autoPlay />

      <CapaRA
        items={items}
        campo={campo}
        inclinacion={s.inclinacion}
        elegido={seleccionado?.id ?? null}
        onElegir={setElegido}
        margenArriba={130}
        margenAbajo={330}
      />

      <header className="cabecera-flotante">
        <LogoPastilla oscuro />
        <SelectorModo actual="camara" />
      </header>

      <div className="aviso-flotante" data-ra-obstaculo>
        <Icono nombre="brujula" tamano={16} />
        {s.posicion && s.posicion.precision > 30
          ? t('ra.gpsImpreciso', { m: Math.round(s.posicion.precision) })
          : s.modoAlrededor
            ? t('ra.demoAlrededor')
            : t('ra.cercanos', { n: puntos.length })}
      </div>

      <div className="radar-sitio" data-ra-obstaculo>
        <Radar puntos={puntos} orientacion={s.orientacion} campo={campo} />
        <Link to="/calibrar" className="boton-calibrar" aria-label={t('calibrar.abrir')}>
          <Icono nombre="brujula" tamano={18} />
          {t('calibrar.boton')}
        </Link>
      </div>

      {!s.brujulaActiva && (
        <div className="centro-flotante">
          <button type="button" className="boton-principal" onClick={() => void s.activarBrujula()}>
            <Icono nombre="brujula" />
            {t('inicio.empezar')}
          </button>
        </div>
      )}

      <div className="hoja-flotante">
        {(errorCamara || s.errorGps || s.avisoBrujula || !s.posicion) && (
          <p className="texto-aviso">
            {errorCamara
              ? t('aviso.errorCamara', { error: errorCamara })
              : s.errorGps
                ? t('aviso.errorGps', { error: s.errorGps })
                : s.avisoBrujula
                  ? t('aviso.sinBrujula')
                  : t('aviso.buscandoGps')}
          </p>
        )}
        {seleccionado ? (
          <>
            <div className="fila-lugar">
              <FotoHueco slug={seleccionado.categoria.slug} tamano={64} foto={seleccionado.foto} />
              <div className="fila-lugar-texto">
                <span className="etiqueta-azul">
                  {seleccionado.categoria.nombre} · {formatearDistancia(seleccionado.d)}
                </span>
                <h2 className="titulo-3">{seleccionado.nombre}</h2>
                {!seleccionado.verificado && <span className="texto-suave">{t('ra.aproxTexto')}</span>}
              </div>
            </div>
            <div className="fila-botones">
              <Link to={`/lugar/${seleccionado.id}`} className="boton-secundario">
                {t('comun.verFicha')}
              </Link>
              <Link to={`/guia/${seleccionado.id}`} className="boton-principal">
                <Icono nombre="flecha" tamano={18} />
                {t('comun.llevame')}
              </Link>
            </div>
          </>
        ) : (
          s.posicion && <p className="texto-suave">{t('ra.toca')}</p>
        )}
      </div>

      <BarraNavegacion />
    </main>
  );
}
