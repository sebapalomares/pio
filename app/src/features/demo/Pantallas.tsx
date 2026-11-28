import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { useAlmacen } from '../../lib/almacen';
import { useSensores } from '../../lib/contexto';
import { useDatos } from '../../lib/datos';
import { Icono } from '../../components/Icono';

// Lista de comprobación de pantallas (solo para la fase de pruebas). Los enlaces usan
// el primer lugar y la primera ruta que lleguen de la API.
const PANTALLAS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

const CLAVE = 'pio:comprobadas';

function leerComprobadas(): number[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
  } catch {
    return [];
  }
}

export default function Pantallas() {
  const { ponerAlrededor } = useAlmacen();
  const { modoAlrededor, puntos } = useSensores();
  const { datos, demo } = useDatos();
  // Un lugar verificado para la ficha y el guiado, si hay; si no, el primero
  const lugar = (puntos.find((p) => p.verificado) ?? puntos[0])?.id ?? '';
  const ruta = datos?.rutas[0]?.id ?? '';
  const enlace: Record<number, string> = {
    0: '/', 1: '/explorar', 2: '/mapa', 3: `/lugar/${lugar}`, 4: `/guia/${lugar}`,
    5: '/escanear', 6: '/pasaporte', 7: ruta ? `/ruta/${ruta}` : '/pasaporte', 8: `/sello/${lugar}`,
  };
  const [hechas, setHechas] = useState<number[]>(leerComprobadas);

  const marcar = (n: number) => {
    const nuevas = hechas.includes(n) ? hechas.filter((h) => h !== n) : [...hechas, n];
    setHechas(nuevas);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nuevas));
    } catch {
      /* sin almacenamiento */
    }
  };

  return (
    <main className="pantalla pantalla-clara">
      <div className="contenido-desplazable">
        <img className="inicio-logo" src="/brand/pio-firma-horizontal.svg" alt="pio" />
        <h1 className="titulo-1">{t('demo.titulo')}</h1>
        <p className="texto-suave">{t('demo.texto')}</p>

        <ol className="lista-comprobacion">
          {PANTALLAS.map((n) => (
            <li key={n} className="tarjeta-plana">
              <label className="casilla">
                <input type="checkbox" checked={hechas.includes(n)} onChange={() => marcar(n)} />
                <span className="solo-lector">{t(`pantallas.${n}.nombre`)}</span>
              </label>
              <Link to={enlace[n]} className="fila-lista-texto enlace-pantalla">
                <strong>{n}. {t(`pantallas.${n}.nombre`)}</strong>
                <span className="nota">{t(`pantallas.${n}.que`)}</span>
              </Link>
              <Icono nombre="derecha" tamano={20} />
            </li>
          ))}
        </ol>

        <h2 className="titulo-3">{t('demo.puntos')}</h2>
        <label className="tarjeta-plana interruptor">
          <input type="checkbox" checked={modoAlrededor} onChange={(e) => ponerAlrededor(e.target.checked)} />
          <span className="fila-lista-texto">
            <strong>{t('demo.alrededor')}</strong>
            <span className="nota">{t('demo.alrededorTexto')}</span>
          </span>
        </label>

        <h2 className="titulo-3" id="qr">{t('demo.qr')}</h2>
        {demo ? (
          <>
            <p className="texto-suave">{t('demo.qrTexto')}</p>
            <div className="rejilla-qr">
              {Object.entries(demo.qr).map(([codigo, id]) => {
                const nombre = demo.datos.puntos.find((p) => p.id === id)?.nombre ?? id;
                return (
                  <figure key={codigo} className="tarjeta-plana qr-demo">
                    <img src={`/demo/qr-${codigo}.svg`} alt={`QR: ${nombre}`} />
                    <figcaption className="nota">{nombre}</figcaption>
                  </figure>
                );
              })}
            </div>
          </>
        ) : (
          <p className="texto-suave">{t('demo.qrReales')}</p>
        )}

        <Link to="/calibrar" className="boton-secundario">
          {t('calibrar.enlace')}
        </Link>
        <Link to="/prueba-ra" className="boton-secundario">
          {t('demo.pruebaTecnica')}
        </Link>
      </div>
    </main>
  );
}
