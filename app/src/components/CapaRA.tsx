import { campoVertical } from '../lib/calibracion';

/** Un lugar listo para pintar en la cámara. */
export interface ItemRA {
  id: string;
  nombre: string;
  subtitulo: string;
  d: number; // metros
  rel: number; // grados respecto a donde miras (−180…180), ya con la calibración
  elev: number | null; // grados sobre el horizonte (null = desconocido → en el horizonte)
}

interface Props {
  items: ItemRA[];
  campo: number; // campo de visión horizontal (grados)
  inclinacion: number | null; // grados, positivo = mirando hacia arriba
  elegido?: string | null;
  onElegir?: (id: string) => void;
  /** Espacio libre arriba (cabecera) y abajo (hoja, barra) en px, para no tapar las etiquetas. */
  margenArriba?: number;
  margenAbajo?: number;
  /** Línea discontinua del horizonte (pantalla de prueba). */
  verHorizonte?: boolean;
}

const ALTO_ETIQUETA = 52;
const SEPARACION = 22; // entre la etiqueta y el recuadro
const FILAS = 4;

/**
 * Capa de realidad aumentada: sobre cada lugar, un recuadro (mira) a su altura real;
 * encima o debajo, su etiqueta; y una línea que los une.
 * El lugar que tienes en el centro (o el elegido) se resalta en amarillo.
 */
export function CapaRA({ items, campo, inclinacion, elegido = null, onElegir, margenArriba = 150, margenAbajo = 300, verHorizonte = false }: Props) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const medioV = campoVertical(campo, W, H) / 2;
  const horizonte = H / 2 + ((inclinacion ?? 0) / medioV) * (H / 2);

  const visibles = items.filter((p) => Math.abs(p.rel) <= campo / 2 + 3);
  // El que está más centrado, si está cerca del centro, se considera «enfocado»
  const centrado = visibles.reduce<ItemRA | null>((m, p) => (!m || Math.abs(p.rel) < Math.abs(m.rel) ? p : m), null);
  const destacado = elegido && visibles.some((p) => p.id === elegido) ? elegido : centrado && Math.abs(centrado.rel) < campo * 0.15 ? centrado.id : null;

  // Colocación sin solapes: el más cercano primero, en la fila más próxima a su recuadro.
  const filas: { x: number; w: number }[][] = Array.from({ length: FILAS }, () => []);
  const colocados = [...visibles]
    .sort((a, b) => a.d - b.d)
    .map((p) => {
      const x = W * (0.5 + p.rel / campo);
      const y = horizonte - ((p.elev ?? 0) / medioV) * (H / 2);
      const tam = Math.round(Math.min(88, Math.max(30, 6000 / Math.max(p.d, 1))));
      const w = Math.min(260, 64 + p.nombre.length * 7.5);
      const xEtiqueta = Math.min(W - w / 2 - 8, Math.max(w / 2 + 8, x));
      const fila = filas.findIndex((f) => f.every((o) => Math.abs(o.x - xEtiqueta) > (o.w + w) / 2 + 8));
      if (fila === -1) return null;
      filas[fila].push({ x: xEtiqueta, w });

      // Encima del recuadro; si no cabe (lugar muy alto en la imagen), debajo.
      let arriba = y - tam / 2 - SEPARACION - ALTO_ETIQUETA - fila * (ALTO_ETIQUETA + 8);
      let debajo = false;
      if (arriba < margenArriba) {
        arriba = y + tam / 2 + SEPARACION + fila * (ALTO_ETIQUETA + 8);
        debajo = true;
      }
      arriba = Math.min(Math.max(arriba, margenArriba), H - margenAbajo - ALTO_ETIQUETA);
      return { ...p, x, y, tam, xEtiqueta, arriba, debajo };
    })
    .filter((p) => p !== null)
    .reverse(); // los lejanos se pintan primero, los cercanos encima

  return (
    <div className="ra-capa">
      <svg className="ra-lineas" width={W} height={H} aria-hidden="true">
        {verHorizonte && <line className="ra-linea-horizonte" x1={0} y1={horizonte} x2={W} y2={horizonte} />}
        {colocados.map((p) => {
          const yEtiqueta = p.debajo ? p.arriba : p.arriba + ALTO_ETIQUETA;
          const yRecuadro = p.debajo ? p.y + p.tam / 2 : p.y - p.tam / 2;
          return (
            <g key={p.id} className={p.id === destacado ? 'destacado' : undefined}>
              <line x1={p.xEtiqueta} y1={yEtiqueta} x2={p.x} y2={yRecuadro} />
              <Mira x={p.x} y={p.y} tam={p.tam} />
            </g>
          );
        })}
      </svg>

      {colocados.map((p) => {
        const contenido = (
          <>
            <img src="/brand/pio-pin-azul.svg" alt="" />
            <span className="etiqueta-texto">
              <strong>{p.nombre}</strong>
              <span>{p.subtitulo}</span>
            </span>
          </>
        );
        const clase = p.id === destacado ? 'etiqueta-ra elegida' : 'etiqueta-ra';
        const estilo = { left: p.xEtiqueta, top: p.arriba };
        return onElegir ? (
          <button key={p.id} type="button" className={clase} style={estilo} onClick={() => onElegir(p.id)}>
            {contenido}
          </button>
        ) : (
          <div key={p.id} className={clase} style={estilo}>
            {contenido}
          </div>
        );
      })}
    </div>
  );
}

/** Recuadro de esquinas (mira) centrado en el lugar. */
function Mira({ x, y, tam }: { x: number; y: number; tam: number }) {
  const m = tam / 2;
  const e = Math.max(8, tam * 0.28); // largo de cada esquina
  const d = [
    `M${x - m},${y - m + e}V${y - m}H${x - m + e}`,
    `M${x + m - e},${y - m}H${x + m}V${y - m + e}`,
    `M${x + m},${y + m - e}V${y + m}H${x + m - e}`,
    `M${x - m + e},${y + m}H${x - m}V${y + m - e}`,
  ].join('');
  return (
    <>
      <path className="ra-mira-sombra" d={d} />
      <path className="ra-mira" d={d} />
      <circle className="ra-mira-punto" cx={x} cy={y} r={3} />
    </>
  );
}
