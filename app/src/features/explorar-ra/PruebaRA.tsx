import { useMemo, useState } from 'react';
import { anguloRelativo, distancia, formatearDistancia, rumbo } from '../../lib/geo';
import { pedirPermisoBrujula, useBrujula, useCamara, usePosicion } from '../../lib/sensores';
import { PUNTOS_CAZORLA, puntosAlrededor } from '../../data/puntos-prueba';

// Campo de visión horizontal aproximado de la cámara trasera en vertical.
const CAMPO_VISION = 60;

type Fuente = 'alrededor' | 'cazorla';

/**
 * Fase 1 · Prueba técnica de RA.
 * Cámara + GPS + brújula → etiquetas flotantes de puntos según su rumbo.
 */
export default function PruebaRA() {
  const [activo, setActivo] = useState(false);
  const [avisoBrujula, setAvisoBrujula] = useState<string | null>(null);
  const [fuente, setFuente] = useState<Fuente>('alrededor');
  const [verDatos, setVerDatos] = useState(true);

  const { posicion, error: errorGps } = usePosicion(activo);
  const { rumbo: orientacion, fuente: fuenteBrujula } = useBrujula(activo);
  const { video, error: errorCamara } = useCamara(activo);

  const empezar = async () => {
    const ok = await pedirPermisoBrujula();
    if (!ok) setAvisoBrujula('Sin permiso de brújula: las etiquetas no podrán orientarse.');
    setActivo(true);
  };

  // Los puntos "alrededor" se fijan con la primera posición, para que no se muevan contigo.
  const [origenDemo, setOrigenDemo] = useState<{ lat: number; lng: number } | null>(null);
  if (posicion && !origenDemo) setOrigenDemo({ lat: posicion.lat, lng: posicion.lng });

  const etiquetas = useMemo(() => {
    if (!posicion || orientacion === null) return [];
    const puntos =
      fuente === 'cazorla' ? PUNTOS_CAZORLA : origenDemo ? puntosAlrededor(origenDemo) : [];
    return puntos
      .map((p) => {
        const d = distancia(posicion, p);
        const r = rumbo(posicion, p);
        const rel = anguloRelativo(r, orientacion);
        return { ...p, d, r, rel };
      })
      .filter((p) => Math.abs(p.rel) <= CAMPO_VISION / 2 + 5)
      .sort((a, b) => b.d - a.d);
  }, [posicion, orientacion, fuente, origenDemo]);

  if (!activo) {
    return (
      <main className="inicio">
        <h1>Pío · Prueba de realidad aumentada</h1>
        <p>
          Esta pantalla comprueba si el móvil puede mostrar etiquetas de lugares sobre la cámara usando
          GPS y brújula. Necesita permiso para la cámara, la ubicación y la orientación.
        </p>
        <button type="button" className="boton-principal" onClick={empezar}>
          Empezar la prueba
        </button>
      </main>
    );
  }

  return (
    <main className="ra">
      <video ref={video} className="ra-video" playsInline muted autoPlay />

      <div className="ra-capa" aria-live="polite">
        {etiquetas.map((p, i) => {
          const x = 50 + (p.rel / (CAMPO_VISION / 2)) * 50;
          const y = 30 + i * 9;
          return (
            <div key={p.id} className="etiqueta" style={{ left: `${x}%`, top: `${y}%` }}>
              <strong>{p.nombre}</strong>
              <span>
                {formatearDistancia(p.d)} · {p.categoria}
              </span>
            </div>
          );
        })}
      </div>

      <div className="ra-barra">
        <div className="segmentado" role="group" aria-label="Puntos a mostrar">
          <button type="button" aria-pressed={fuente === 'alrededor'} onClick={() => setFuente('alrededor')}>
            Alrededor de mí
          </button>
          <button type="button" aria-pressed={fuente === 'cazorla'} onClick={() => setFuente('cazorla')}>
            Cazorla
          </button>
        </div>
        <button type="button" className="boton-secundario" onClick={() => setVerDatos((v) => !v)}>
          {verDatos ? 'Ocultar datos' : 'Ver datos'}
        </button>
      </div>

      {verDatos && (
        <section className="ra-datos" aria-label="Datos de los sensores">
          <div>
            GPS:{' '}
            {posicion
              ? `${posicion.lat.toFixed(5)}, ${posicion.lng.toFixed(5)} (±${Math.round(posicion.precision)} m)`
              : 'buscando señal…'}
          </div>
          <div>
            Brújula: {orientacion !== null ? `${Math.round(orientacion)}°` : 'sin datos'} · {fuenteBrujula}
          </div>
          <div>Etiquetas visibles: {etiquetas.length}</div>
          {errorGps && <div className="error">GPS: {errorGps}</div>}
          {errorCamara && <div className="error">Cámara: {errorCamara}</div>}
          {avisoBrujula && <div className="error">{avisoBrujula}</div>}
        </section>
      )}
    </main>
  );
}
