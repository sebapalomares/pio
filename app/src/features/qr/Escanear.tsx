import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import jsQR from 'jsqr';
import { t } from '../../i18n';
import { useAlmacen } from '../../lib/almacen';
import { useCamara } from '../../lib/sensores';
import { useSensores } from '../../lib/contexto';
import { buscarPunto, useDatos, useFicha, useQr } from '../../lib/datos';
import { BarraNavegacion } from '../../components/Comunes';
import { Icono } from '../../components/Icono';

/** Saca el código de una URL de Pío (https://pio.turismocazorla.info/qr/CODIGO) o de un texto suelto. */
function extraerCodigo(texto: string): string {
  const m = texto.match(/\/qr\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : texto.trim();
}

/** Pantalla 5 · Escanear el código QR del cartel. También atiende las URL /qr/:codigo. */
export default function Escanear() {
  const { codigo: codigoUrl } = useParams();
  const s = useSensores();
  const { demo } = useDatos();
  const { sellos, sellar } = useAlmacen();
  const navegar = useNavigate();
  const [codigo, setCodigo] = useState<string | null>(codigoUrl ?? null);
  const { video, error: errorCamara } = useCamara(!codigo);

  // Lectura continua de la cámara mientras no haya código
  useEffect(() => {
    if (codigo) return;
    const lienzo = document.createElement('canvas');
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });
    let parar = false;
    let ultima = 0;
    const bucle = (ahora: number) => {
      if (parar) return;
      const v = video.current;
      if (ctx && v && v.readyState >= 2 && ahora - ultima > 250) {
        ultima = ahora;
        const escala = Math.min(1, 480 / (v.videoWidth || 480));
        lienzo.width = Math.round(v.videoWidth * escala);
        lienzo.height = Math.round(v.videoHeight * escala);
        ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height);
        const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
        const leido = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (leido?.data) {
          navigator.vibrate?.(60);
          setCodigo(extraerCodigo(leido.data));
          return;
        }
      }
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
    return () => {
      parar = true;
    };
  }, [codigo, video]);

  // El código se comprueba con la API (/qr/{codigo}); los ya leídos se recuerdan sin conexión
  const { punto: p, estado } = useQr(codigo);
  const { ficha } = useFicha(p?.id);
  const conCoords = p ? Boolean(buscarPunto(s.puntos, p.id)) : false;
  const yaSellado = p ? Boolean(sellos[p.id]) : false;
  const aviso = !codigo
    ? t('qr.apunta')
    : p
      ? t('qr.apunta')
      : estado === 'cargando'
        ? t('qr.comprobando')
        : estado === 'sin-conexion'
          ? t('qr.sinConexion')
          : t('qr.invalido');
  const codigoDemo = demo ? Object.keys(demo.qr)[0] : null;

  const checkin = () => {
    if (!p) return;
    sellar(p.id);
    navegar(`/sello/${p.id}`);
  };

  return (
    <main className="pantalla pantalla-camara" data-tema="oscuro">
      {!codigo && <video ref={video} className="camara-video" playsInline muted autoPlay />}
      {!codigo && (
        <div className="marco-qr" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
      )}

      <div className="aviso-superior">
        <span className="pildora-aviso" role="status">{aviso}</span>
      </div>

      <section className="hoja-inferior">
        <span className="asa" aria-hidden="true" />
        {errorCamara && !codigo && <p className="texto-aviso">{t('aviso.errorCamara', { error: errorCamara })}</p>}

        {p ? (
          <>
            <div className="fila-lugar">
              <span className="circulo-logro">
                <Icono nombre="check" />
              </span>
              <div>
                <span className="etiqueta-suave">{t('qr.leido')}</span>
                <h2 className="titulo-3">{p.nombre}</h2>
              </div>
            </div>
            <div className="rejilla-2">
              <Link to={`/lugar/${p.id}`} className="opcion">
                <Icono nombre="info" />
                <strong>{t('qr.info')}</strong>
                <span className="nota">{t('qr.infoSub')}</span>
              </Link>
              <Link to={conCoords ? `/guia/${p.id}` : `/lugar/${p.id}`} className="opcion">
                <Icono nombre="auriculares" />
                <strong>{t('qr.audio')}</strong>
                <span className="nota">{t('qr.audioSub')}</span>
              </Link>
              {ficha?.reserva_url ? (
                <a href={ficha.reserva_url} className="opcion" target="_blank" rel="noopener">
                  <Icono nombre="calendario" />
                  <strong>{t('qr.reservar')}</strong>
                  <span className="nota">{t('qr.reservarSub')}</span>
                </a>
              ) : (
                <span className="opcion desactivado" aria-disabled="true">
                  <Icono nombre="calendario" />
                  <strong>{t('qr.reservar')}</strong>
                  <span className="nota">{t('qr.sinReserva')}</span>
                </span>
              )}
              <button type="button" className="opcion opcion-principal" onClick={checkin}>
                <Icono nombre="pasaporte" />
                <strong>{yaSellado ? t('qr.yaSellado') : t('qr.checkin')}</strong>
                <span className="nota">{t('qr.checkinSub')}</span>
              </button>
            </div>
            <button type="button" className="boton-texto" onClick={() => setCodigo(null)}>
              <Icono nombre="qr" tamano={20} />
              {t('qr.apunta')}
            </button>
          </>
        ) : codigo ? (
          <button type="button" className="boton-secundario" onClick={() => setCodigo(null)}>
            <Icono nombre="qr" tamano={20} />
            {t('qr.otraVez')}
          </button>
        ) : (
          // Solo con los datos de demostración (desarrollo): con datos reales no hay códigos de prueba
          codigoDemo && (
            <div className="fila-botones">
              <button type="button" className="boton-secundario" onClick={() => setCodigo(codigoDemo)}>
                {t('qr.probar')}
              </button>
              <Link to="/pantallas#qr" className="boton-secundario">
                {t('qr.qrPrueba')}
              </Link>
            </div>
          )
        )}
      </section>

      <BarraNavegacion />
    </main>
  );
}
