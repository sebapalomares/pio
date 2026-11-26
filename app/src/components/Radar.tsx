import { t } from '../i18n';
import type { PuntoEnVista } from '../lib/ra';

const D = 96;

/** Radar: tú en el centro, arriba es hacia donde miras, la N marca el norte. */
export function Radar({ puntos, orientacion, campo }: { puntos: PuntoEnVista[]; orientacion: number | null; campo: number }) {
  const alcance = Math.max(200, ...puntos.map((p) => p.d)) * 1.15;
  return (
    <div className="radar" role="img" aria-label={t('ra.radar', { n: puntos.length })}>
      <div className="radar-cono" style={{ ['--campo' as string]: `${campo}deg` }} />
      {orientacion !== null && (
        <span
          className="radar-norte"
          style={{ transform: `rotate(${-orientacion}deg) translateY(${-D / 2 + 10}px) rotate(${orientacion}deg)` }}
        >
          N
        </span>
      )}
      {puntos.map((p) => {
        const r = (Math.min(p.d, alcance) / alcance) * (D / 2 - 8);
        const a = (p.rel * Math.PI) / 180;
        return (
          <span
            key={p.id}
            className={Math.abs(p.rel) <= campo / 2 ? 'radar-punto en-vista' : 'radar-punto'}
            style={{ left: D / 2 + Math.sin(a) * r - 4, top: D / 2 - Math.cos(a) * r - 4 }}
          />
        );
      })}
      <span className="radar-yo" />
    </div>
  );
}
