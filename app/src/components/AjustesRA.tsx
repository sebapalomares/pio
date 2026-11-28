import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { calibracion, OPCIONES_NOMBRES, OPCIONES_RADIO, textoRadio, useCalibracion, type Respuesta } from '../lib/calibracion';
import { Icono } from './Icono';

const RESPUESTAS: Respuesta[] = ['rapida', 'normal', 'estable'];
const TEXTO_RESPUESTA = {
  rapida: 'ajustes.respuestaRapida',
  normal: 'ajustes.respuestaNormal',
  estable: 'ajustes.respuestaEstable',
} as const;

/**
 * Ajustes de la cámara RA, guardados en el móvil (D24): radio de acción, hasta qué distancia
 * se ven los nombres, cómo de rápida responde la brújula y acceso al calibrador.
 */
export function AjustesRA({ onCerrar }: { onCerrar: () => void }) {
  const c = useCalibracion();
  const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : null;

  return (
    <section className="ajustes-ra" aria-labelledby="ajustes-ra-titulo">
      <div className="ajustes-ra-cabecera">
        <h2 className="titulo-3" id="ajustes-ra-titulo">
          {t('ajustes.titulo')}
        </h2>
        <button type="button" className="boton-redondo borde" aria-label={t('comun.cerrar')} onClick={onCerrar}>
          <Icono nombre="cerrar" />
        </button>
      </div>

      <Grupo titulo={t('ajustes.radio')} ayuda={t('ajustes.radioAyuda')}>
        {OPCIONES_RADIO.map((r) => (
          <button key={String(r)} type="button" aria-pressed={c.radio === r} onClick={() => calibracion.ponerRadio(r)}>
            {textoRadio(r)}
          </button>
        ))}
      </Grupo>

      <Grupo titulo={t('ajustes.nombres')} ayuda={t('ajustes.nombresAyuda')}>
        {OPCIONES_NOMBRES.map((r) => (
          <button key={String(r)} type="button" aria-pressed={c.nombresHasta === r} onClick={() => calibracion.ponerNombresHasta(r)}>
            {textoRadio(r)}
          </button>
        ))}
      </Grupo>

      <Grupo titulo={t('ajustes.respuesta')} ayuda={t('ajustes.respuestaAyuda')}>
        {RESPUESTAS.map((r) => (
          <button key={r} type="button" aria-pressed={c.respuesta === r} onClick={() => calibracion.ponerRespuesta(r)}>
            {t(TEXTO_RESPUESTA[r])}
          </button>
        ))}
      </Grupo>

      <div className="ajustes-ra-calibrar">
        <span className="texto-suave">
          {fecha ? t('ajustes.calibrado', { fecha, desfase: `${c.desfase > 0 ? '+' : ''}${Math.round(c.desfase)}` }) : t('calibrar.sinCalibrar')}
        </span>
        <Link to="/calibrar" className="boton-secundario">
          <Icono nombre="brujula" tamano={18} />
          {t('calibrar.boton')}
        </Link>
      </div>
    </section>
  );
}

function Grupo({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: React.ReactNode }) {
  return (
    <fieldset className="ajustes-ra-grupo">
      <legend>{titulo}</legend>
      <div className="ajustes-ra-opciones" role="group" aria-label={titulo}>
        {children}
      </div>
      <p className="texto-suave">{ayuda}</p>
    </fieldset>
  );
}
