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
    if (!ok) setAvisoBrujula('Sin permiso de brújula no podemos orientar los lugares. Actívalo en los ajustes del navegador.');
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
        <img className="inicio-logo" src="/brand/pio-firma-horizontal.svg" alt="pio" />
        <div className="inicio-cuerpo">
          <span className="inicio-etiqueta">Prueba de realidad aumentada</span>
          <h1>Mira a tu alrededor</h1>
          <p>
            Vamos a comprobar si tu móvil puede mostrar los lugares cercanos sobre la imagen de la cámara,
            usando el GPS y la brújula.
          </p>
          <ul className="inicio-permisos">
            <li>{icono('camara')}Cámara, para ver el entorno</li>
            <li>{icono('gps')}Ubicación, para saber dónde estás</li>
            <li>{icono('brujula')}Movimiento y orientación, para saber hacia dónde miras</li>
          </ul>
        </div>
        <button type="button" className="boton-principal" onClick={empezar}>
          Empezar la prueba
        </button>
      </main>
    );
  }

  return (
    <main className="ra" data-tema="oscuro">
      <video ref={video} className="ra-video" playsInline muted autoPlay />

      <div className="ra-capa" aria-live="polite">
        {etiquetas.map((p, i) => {
          const x = 50 + (p.rel / (CAMPO_VISION / 2)) * 50;
          const y = 30 + i * 9;
          return (
            <div key={p.id} className="etiqueta" style={{ left: `${x}%`, top: `${y}%` }}>
              <img src="/brand/pio-pin-azul.svg" alt="" />
              <span className="etiqueta-texto">
                <strong>{p.nombre}</strong>
                <span>
                  {formatearDistancia(p.d)} · {p.categoria}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="ra-barra">
        <img className="ra-logo" src="/brand/pio-logotipo-azul-claro.svg" alt="pio" />
        <div className="segmentado" role="group" aria-label="Puntos que se muestran">
          <button type="button" aria-pressed={fuente === 'alrededor'} onClick={() => setFuente('alrededor')}>
            Alrededor
          </button>
          <button type="button" aria-pressed={fuente === 'cazorla'} onClick={() => setFuente('cazorla')}>
            Cazorla
          </button>
        </div>
      </div>

      <section className="ra-datos" aria-label="Datos de los sensores">
        <div className="ra-datos-cabecera">
          <strong>Sensores</strong>
          <button type="button" className="boton-secundario" onClick={() => setVerDatos((v) => !v)}>
            {verDatos ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {verDatos && (
          <>
            <div>
              GPS:{' '}
              {posicion
                ? `${posicion.lat.toFixed(5)}, ${posicion.lng.toFixed(5)} (±${Math.round(posicion.precision)} m)`
                : 'buscando señal…'}
            </div>
            <div>
              Brújula: {orientacion !== null ? `${Math.round(orientacion)}°` : 'sin datos'} · {fuenteBrujula}
            </div>
            <div>Lugares a la vista: {etiquetas.length}</div>
            {errorGps && <div className="error">GPS: {errorGps}</div>}
            {errorCamara && <div className="error">Cámara: {errorCamara}</div>}
            {avisoBrujula && <div className="error">{avisoBrujula}</div>}
          </>
        )}
      </section>
    </main>
  );
}

/** Iconos de trazo 24 px, 2 px, del manual (sección 7). */
function icono(nombre: 'camara' | 'gps' | 'brujula') {
  const trazos = {
    camara: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
    gps: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" /></>,
    brujula: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  };
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {trazos[nombre]}
    </svg>
  );
}
