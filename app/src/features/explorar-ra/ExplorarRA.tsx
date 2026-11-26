import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { useCamara } from '../../lib/sensores';
import { formatearDistancia } from '../../lib/geo';
import { CAMPO_VISION, alturaHorizonte, usePuntosEnVista } from '../../lib/ra';
import { BarraNavegacion, FotoHueco, LogoPastilla, SelectorModo } from '../../components/Comunes';
import { Icono } from '../../components/Icono';
import { Radar } from '../../components/Radar';

/** Pantalla 1 · Explorar con la cámara (tema oscuro). */
export default function ExplorarRA() {
  const s = useSensores();
  const { video, error: errorCamara } = useCamara(true);
  const puntos = usePuntosEnVista(s.puntos, s.posicion, s.orientacion);
  const [elegido, setElegido] = useState<string | null>(null);

  const enVista = puntos.filter((p) => Math.abs(p.rel) <= CAMPO_VISION / 2 + 5);
  const seleccionado = puntos.find((p) => p.id === elegido) ?? enVista[0] ?? null;
  const horizonte = alturaHorizonte(s.inclinacion);

  // Colocación sin solapes: el más cercano, en la fila más baja (junto al horizonte);
  // si choca con otra etiqueta, sube una fila. Como mucho 4 filas: el resto queda en el radar.
  const ancho = window.innerWidth;
  const filas: { x: number; w: number }[][] = [[], [], [], []];
  const etiquetas = enVista
    .map((p) => {
      const x = ((50 + (p.rel / (CAMPO_VISION / 2)) * 50) / 100) * ancho;
      const w = Math.min(260, 64 + p.nombre.length * 7.5);
      const fila = filas.findIndex((f) => f.every((o) => Math.abs(o.x - x) > (o.w + w) / 2 + 8));
      if (fila === -1) return null;
      filas[fila].push({ x, w });
      return { ...p, x, fila };
    })
    .filter((p) => p !== null)
    .reverse(); // los lejanos se pintan primero, los cercanos encima

  return (
    <main className="pantalla pantalla-camara" data-tema="oscuro">
      <video ref={video} className="camara-video" playsInline muted autoPlay />

      <div className="ra-capa">
        {etiquetas.map((p) => (
          <button
            key={p.id}
            type="button"
            className={seleccionado?.id === p.id ? 'etiqueta-ra elegida' : 'etiqueta-ra'}
            style={{
              left: p.x,
              top: `max(160px, calc(${horizonte}% - ${72 + p.fila * 60}px))`,
            }}
            onClick={() => setElegido(p.id)}
          >
            <img src="/brand/pio-pin-azul.svg" alt="" />
            <span className="etiqueta-texto">
              <strong>{p.nombre}</strong>
              <span>
                {formatearDistancia(p.d)} · {p.categoria.nombre}
              </span>
            </span>
          </button>
        ))}
      </div>

      <header className="cabecera-flotante">
        <LogoPastilla oscuro />
        <SelectorModo actual="camara" />
      </header>

      <div className="aviso-flotante">
        <Icono nombre="brujula" tamano={16} />
        {s.modoAlrededor ? t('ra.demoAlrededor') : t('ra.cercanos', { n: puntos.length })}
      </div>

      <div className="radar-sitio">
        <Radar puntos={puntos} orientacion={s.orientacion} campo={CAMPO_VISION} />
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
              <FotoHueco slug={seleccionado.categoria.slug} tamano={64} />
              <div className="fila-lugar-texto">
                <span className="etiqueta-azul">
                  {seleccionado.categoria.nombre} · {formatearDistancia(seleccionado.d)}
                </span>
                <h2 className="titulo-3">{seleccionado.nombre}</h2>
                {seleccionado.horario && <span className="texto-suave">{seleccionado.horario}</span>}
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
