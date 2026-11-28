import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { anguloRelativo, distancia, formatearDistancia, rumbo } from '../../lib/geo';
import { pedirPermisoBrujula, useBrujula, useCamara, usePosicion } from '../../lib/sensores';
import { PUNTOS_CAZORLA, puntosAlrededor } from '../../data/puntos-prueba';
import { calibracion, corregirRumbo, useCalibracion, useCampoVision } from '../../lib/calibracion';
import { anguloElevacion, useElevaciones } from '../../lib/elevacion';
import { CapaRA } from '../../components/CapaRA';
import { t } from '../../i18n';

const RADAR = 96; // diámetro del radar en px

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
  const { rumbo: rumboBruto, inclinacion, fuente: fuenteBrujula, precision: precisionBrujula } = useBrujula(activo);
  const { video, error: errorCamara } = useCamara(activo);
  // Calibración del móvil (D24): desfase de la brújula y ancho de la imagen
  const cal = useCalibracion();
  const { campo, medido } = useCampoVision(video);
  const orientacion = corregirRumbo(rumboBruto, cal.desfase);

  const empezar = async () => {
    const ok = await pedirPermisoBrujula();
    if (!ok) setAvisoBrujula('Sin permiso de brújula no podemos orientar los lugares. Actívalo en los ajustes del navegador.');
    setActivo(true);
  };

  // Los puntos "alrededor" se fijan con la primera posición, para que no se muevan contigo.
  const [origenDemo, setOrigenDemo] = useState<{ lat: number; lng: number } | null>(null);
  if (posicion && !origenDemo) setOrigenDemo({ lat: posicion.lat, lng: posicion.lng });

  const lista = useMemo(
    () => (fuente === 'cazorla' ? PUNTOS_CAZORLA : origenDemo ? puntosAlrededor(origenDemo) : []),
    [fuente, origenDemo],
  );
  const versionAlturas = useElevaciones(lista, posicion);

  // Todos los puntos con distancia, ángulo respecto a donde miras y elevación (relieve del terreno)
  const puntos = useMemo(() => {
    if (!posicion || orientacion === null) return [];
    return lista.map((p) => {
      const d = distancia(posicion, p);
      const r = rumbo(posicion, p);
      return { ...p, d, r, rel: anguloRelativo(r, orientacion), elev: anguloElevacion(posicion, p, d) };
    });
    // versionAlturas: recalcular cuando llegan las altitudes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicion, orientacion, lista, versionAlturas]);

  const enVista = puntos.filter((p) => Math.abs(p.rel) <= campo / 2);
  const alcanceRadar = Math.max(200, ...puntos.map((p) => p.d)) * 1.15;

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

      <CapaRA
        items={puntos.map((p) => ({ ...p, subtitulo: `${formatearDistancia(p.d)} · ${p.categoria}` }))}
        campo={campo}
        inclinacion={inclinacion}
        margenArriba={140}
        margenAbajo={verDatos ? 380 : 120}
        verHorizonte
      />

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

      <div className="ra-radar" role="img" aria-label={`Radar: ${puntos.length} lugares alrededor`}>
        <div className="ra-radar-cono" style={{ ['--campo' as string]: `${campo}deg` }} />
        {orientacion !== null && (
          <span
            className="ra-radar-norte"
            style={{ transform: `rotate(${-orientacion}deg) translateY(${-RADAR / 2 + 10}px) rotate(${orientacion}deg)` }}
          >
            N
          </span>
        )}
        {puntos.map((p) => {
          const radio = (Math.min(p.d, alcanceRadar) / alcanceRadar) * (RADAR / 2 - 8);
          const a = (p.rel * Math.PI) / 180;
          return (
            <span
              key={p.id}
              className={Math.abs(p.rel) <= campo / 2 ? 'ra-radar-punto en-vista' : 'ra-radar-punto'}
              style={{ left: RADAR / 2 + Math.sin(a) * radio - 4, top: RADAR / 2 - Math.cos(a) * radio - 4 }}
            />
          );
        })}
        <span className="ra-radar-yo" />
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
              {precisionBrujula !== null && (precisionBrujula < 0 ? ' · ±? (no fiable)' : ` · ±${Math.round(precisionBrujula)}°`)}
            </div>
            <div>
              Calibración: {cal.desfase > 0 ? '+' : ''}
              {Math.round(cal.desfase)}° · <Link to="/calibrar">{t('calibrar.enlace')}</Link>
            </div>
            <div>Inclinación: {inclinacion !== null ? `${Math.round(inclinacion)}°` : 'sin datos'}</div>
            <div>Lugares a la vista: {enVista.length} de {puntos.length}</div>
            <label className="ra-campo">
              Campo de visión: {Math.round(campo)}°{medido ? '' : ' (estimado)'}
              <input
                type="range"
                min={15}
                max={100}
                step={1}
                value={Math.round(campo)}
                onChange={(e) => calibracion.ponerCampo(Number(e.target.value))}
              />
            </label>
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
