import { useRef } from 'react';
import { campoVertical } from '../lib/calibracion';
import { elegirCentrado } from '../lib/ra';
import { t } from '../i18n';

/** Un lugar listo para pintar en la cámara. */
export interface ItemRA {
  id: string;
  nombre: string;
  subtitulo: string;
  d: number; // metros
  rel: number; // grados respecto a donde miras (−180…180), ya con la calibración
  elev: number | null; // grados sobre el horizonte (null = desconocido → en el horizonte)
  /** Ubicación sin verificar (D22): mira y etiqueta con borde discontinuo. */
  aproximado?: boolean;
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
  /** Más lejos que esto (m), solo el pin, sin nombre (salvo el destacado). null = nombres en todos. */
  nombresHasta?: number | null;
}

const ALTO_ETIQUETA = 52; // etiqueta completa (nombre + distancia): la del lugar destacado
const ALTO_COMPACTA = 34; // etiqueta compacta (solo el nombre): el resto
const SEPARACION = 18; // entre la etiqueta y el recuadro
const FILAS = 6; // huecos que se prueban encima y debajo de cada mira
const AGRUPAR = 24; // px: miras más cercanas que esto se juntan en una

/** Elementos de la pantalla que las etiquetas no deben tapar (radar, botones…): llevan data-ra-obstaculo. */
function obstaculos(): Caja[] {
  return [...document.querySelectorAll('[data-ra-obstaculo]')].map((e) => {
    const r = e.getBoundingClientRect();
    return { x1: r.left - 6, y1: r.top - 6, x2: r.right + 6, y2: r.bottom + 6 };
  });
}

interface Caja {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const choca = (a: Caja, b: Caja) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

/** Ancho aproximado de una etiqueta (ver app.css): completa hasta 260 px, compacta hasta 170 px. */
const anchoEtiqueta = (p: ItemRA, compacta: boolean) =>
  compacta ? Math.min(170, 40 + p.nombre.length * 7.2) : Math.min(260, 58 + Math.max(p.nombre.length * 7.6, p.subtitulo.length * 6.4));

/**
 * Capa de realidad aumentada: sobre cada lugar, un recuadro (mira) a su altura real;
 * encima o debajo, su etiqueta; y una línea que los une.
 * El lugar que tienes en el centro (o el elegido) se resalta en amarillo.
 */
export function CapaRA({ items, campo, inclinacion, elegido = null, onElegir, margenArriba = 150, margenAbajo = 300, verHorizonte = false, nombresHasta = null }: Props) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const medioV = campoVertical(campo, W, H) / 2;
  const horizonte = H / 2 + ((inclinacion ?? 0) / medioV) * (H / 2);

  const visibles = items.filter((p) => Math.abs(p.rel) <= campo / 2 + 3);
  // El que está más centrado, si está cerca del centro, se considera «enfocado»
  // Con histéresis: el destacado se mantiene mientras siga cerca del centro, para que no
  // cambie a cada temblor de la brújula. Los ref guardan lo pintado en el fotograma anterior
  // (destacado y sitio de cada etiqueta): se leen y escriben al pintar a propósito.
  const anterior = useRef<string | null>(null);
  const memoria = useRef(new Map<string, { dx: number; dy: number; debajo: boolean }>());
  const centrado = elegirCentrado(visibles, anterior.current, campo);
  const destacado = elegido && visibles.some((p) => p.id === elegido) ? elegido : centrado;
  anterior.current = destacado;

  // Posición en pantalla de cada mira
  const todas = visibles.map((p) => ({
    ...p,
    x: W * (0.5 + p.rel / campo),
    y: horizonte - ((p.elev ?? 0) / medioV) * (H / 2),
    tam: Math.round(Math.min(88, Math.max(30, 6000 / Math.max(p.d, 1)))),
  }));

  // Lugares que caen casi en el mismo punto de la imagen: una sola mira (la del destacado o la
  // del más cercano) y su etiqueta indica cuántos más hay detrás («+2»).
  const marcas: ((typeof todas)[number] & { mas: number; lejano: boolean })[] = [];
  for (const m of [...todas].sort((a, b) => (a.id === destacado ? -1 : b.id === destacado ? 1 : a.d - b.d))) {
    const grupo = marcas.find((g) => Math.abs(g.x - m.x) < AGRUPAR && Math.abs(g.y - m.y) < AGRUPAR);
    if (grupo) grupo.mas += 1;
    else marcas.push({ ...m, mas: 0, lejano: m.id !== destacado && nombresHasta !== null && m.d > nombresHasta });
  }

  // Colocación de etiquetas sin solapes: primero la destacada y luego de la más cercana a la más
  // lejana. Para cada una se prueban huecos encima y debajo de su mira (y un poco a los lados),
  // del más cercano al más lejano; vale el primero que no pisa otra etiqueta ni otra mira.
  // Si no cabe, la mira se queda sin etiqueta (el lugar sigue en el radar).
  const ocupadas: Caja[] = obstaculos();
  const miras: Caja[] = marcas.map((m) => ({ x1: m.x - m.tam / 2, y1: m.y - m.tam / 2, x2: m.x + m.tam / 2, y2: m.y + m.tam / 2 }));
  // Orden de reparto: el destacado; luego las etiquetas que ya estaban (conservan su sitio);
  // al final las que acaban de entrar, en el hueco que quede. Así una nueva no empuja a las demás.
  const yaEstaba = (id: string) => memoria.current.has(id);
  const orden = [...marcas].sort((a, b) => {
    if (a.id === destacado) return -1;
    if (b.id === destacado) return 1;
    if (yaEstaba(a.id) !== yaEstaba(b.id)) return yaEstaba(a.id) ? -1 : 1;
    return a.d - b.d;
  });
  const etiquetas = new Map<string, { xEtiqueta: number; arriba: number; debajo: boolean; alto: number; compacta: boolean }>();

  const nuevaMemoria = new Map<string, { dx: number; dy: number; debajo: boolean }>();
  for (const m of orden) {
    if (m.lejano) continue; // lejos: solo el pin
    const compacta = m.id !== destacado;
    const alto = compacta ? ALTO_COMPACTA : ALTO_ETIQUETA;
    const w = anchoEtiqueta(m, compacta) + (m.mas ? 30 : 0);
    const minX = w / 2 + 8;
    const maxX = W - w / 2 - 8;
    const minY = margenArriba;
    const maxY = H - margenAbajo - alto;
    if (maxY < minY) break;

    const huecos: { xEtiqueta: number; arriba: number; debajo: boolean }[] = [];
    // Primero, el mismo sitio que tenía (respecto a su mira): así las etiquetas no saltan al girar
    const previo = memoria.current.get(m.id);
    if (previo) {
      const arriba = m.y + previo.dy;
      if (arriba >= minY && arriba <= maxY) {
        huecos.push({ xEtiqueta: Math.min(maxX, Math.max(minX, m.x + previo.dx)), arriba, debajo: previo.debajo });
      }
    }
    for (let k = 0; k < FILAS; k++) {
      const paso = k * (alto + 6);
      const encima = m.y - m.tam / 2 - SEPARACION - alto - paso;
      const bajo = m.y + m.tam / 2 + SEPARACION + paso;
      for (const desvio of [0, -0.55, 0.55]) {
        const xEtiqueta = Math.min(maxX, Math.max(minX, m.x + desvio * w));
        if (encima >= minY && encima <= maxY) huecos.push({ xEtiqueta, arriba: encima, debajo: false });
        if (bajo >= minY && bajo <= maxY) huecos.push({ xEtiqueta, arriba: bajo, debajo: true });
      }
    }
    // Si la mira está fuera de la franja útil, la etiqueta se pega al borde más cercano
    if (!huecos.length) {
      const xEtiqueta = Math.min(maxX, Math.max(minX, m.x));
      huecos.push({ xEtiqueta, arriba: m.y < minY ? minY : maxY, debajo: m.y < minY });
    }

    const caja = (h: { xEtiqueta: number; arriba: number }): Caja => ({
      x1: h.xEtiqueta - w / 2 - 4,
      y1: h.arriba - 4,
      x2: h.xEtiqueta + w / 2 + 4,
      y2: h.arriba + alto + 4,
    });
    const libre = (c: Caja, conMiras: boolean) =>
      ocupadas.every((o) => !choca(o, c)) && (!conMiras || miras.every((mi, i) => marcas[i].id === m.id || !choca(mi, c)));
    const elegidoHueco = huecos.find((h) => libre(caja(h), true)) ?? huecos.find((h) => libre(caja(h), false));
    if (!elegidoHueco) continue;
    ocupadas.push(caja(elegidoHueco));
    etiquetas.set(m.id, { ...elegidoHueco, alto, compacta });
    nuevaMemoria.set(m.id, { dx: elegidoHueco.xEtiqueta - m.x, dy: elegidoHueco.arriba - m.y, debajo: elegidoHueco.debajo });
  }

  memoria.current = nuevaMemoria;
  const colocados = [...marcas].sort((a, b) => b.d - a.d); // los lejanos se pintan primero, los cercanos encima

  return (
    <div className="ra-capa">
      <svg className="ra-lineas" width={W} height={H} aria-hidden="true">
        {verHorizonte && <line className="ra-linea-horizonte" x1={0} y1={horizonte} x2={W} y2={horizonte} />}
        {colocados.map((p) => {
          const e = etiquetas.get(p.id);
          return (
            <g key={p.id} className={[p.id === destacado && 'destacado', p.aproximado && 'aprox'].filter(Boolean).join(' ') || undefined}>
              {e && (
                <line
                  x1={e.xEtiqueta}
                  y1={e.debajo ? e.arriba : e.arriba + e.alto}
                  x2={p.x}
                  y2={e.debajo ? p.y + p.tam / 2 : p.y - p.tam / 2}
                />
              )}
              {p.lejano ? <PinLejano x={p.x} y={p.y} /> : <Mira x={p.x} y={p.y} tam={p.tam} />}
            </g>
          );
        })}
      </svg>

      {onElegir &&
        colocados
          .filter((p) => p.lejano)
          .map((p) => (
            <button
              key={`pin-${p.id}`}
              type="button"
              className="pin-ra"
              style={{ left: p.x, top: p.y }}
              aria-label={p.mas > 0 ? t('ra.masLugaresTexto', { nombre: p.nombre, n: p.mas }) : `${p.nombre} · ${p.subtitulo}`}
              onClick={() => onElegir(p.id)}
            />
          ))}

      {colocados.map((p) => {
        const e = etiquetas.get(p.id);
        if (!e) return null;
        const contenido = (
          <>
            <img src={p.aproximado ? '/brand/pio-pin-aprox.svg' : '/brand/pio-pin-azul.svg'} alt="" />
            <span className="etiqueta-texto">
              <strong>{p.nombre}</strong>
              <span>{p.subtitulo}</span>
            </span>
            {p.mas > 0 && <span className="etiqueta-mas">{t('ra.masLugares', { n: p.mas })}</span>}
          </>
        );
        const clase = ['etiqueta-ra', p.id === destacado && 'elegida', e.compacta && 'compacta', p.aproximado && 'aprox'].filter(Boolean).join(' ');
        const estilo = { left: e.xEtiqueta, top: e.arriba };
        const titulo = p.mas > 0 ? t('ra.masLugaresTexto', { nombre: p.nombre, n: p.mas }) : undefined;
        return onElegir ? (
          <button key={p.id} type="button" className={clase} style={estilo} title={titulo} onClick={() => onElegir(p.id)}>
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

/** Lugar lejano: pin pequeño con la punta en el lugar, sin nombre. */
function PinLejano({ x, y }: { x: number; y: number }) {
  // Pin de Pío (D16) a 14 × 19 px, con la punta en (x, y)
  const d = `M${x},${y} C${x - 4.2},${y - 5.6} ${x - 7},${y - 9} ${x - 7},${y - 12.4} A7 7 0 0 1 ${x + 7},${y - 12.4} C${x + 7},${y - 9} ${x + 4.2},${y - 5.6} ${x},${y} Z`;
  return (
    <>
      <path className="ra-pin" d={d} />
      <circle className="ra-pin-punto" cx={x} cy={y - 12.4} r={2.6} />
    </>
  );
}
