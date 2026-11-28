import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { useAlmacen } from '../../lib/almacen';
import { useSensores } from '../../lib/contexto';
import { PUNTOS } from '../../data/demo';
import { Icono } from '../../components/Icono';

// Lista de comprobación de pantallas (solo para la fase de pruebas).
const PANTALLAS: { n: number; nombre: string; a: string; que: string }[] = [
  { n: 0, nombre: 'Bienvenida y permisos', a: '/', que: 'Pide cámara, ubicación y orientación; «Empezar» lleva a la cámara.' },
  { n: 1, nombre: 'Explorar con la cámara', a: '/explorar', que: 'Etiquetas sobre la imagen, siguen al girar e inclinar; radar con la N; tocar una etiqueta cambia la tarjeta.' },
  { n: 2, nombre: 'Mapa', a: '/mapa', que: 'Mapa real con pines; filtros; buscador; estilos Calles, Relieve y Noche; la lista lleva a la ficha.' },
  { n: 3, nombre: 'Ficha del lugar (completa)', a: '/lugar/yedra', que: 'Todos los datos; «Escuchar» lee el texto en voz alta; «Llévame»; «Reservar»; mochila; rutas.' },
  { n: 4, nombre: 'Guiado', a: '/guia/yedra', que: 'Flecha que apunta al lugar, distancia y minutos; «Has llegado» a menos de 25 m; Google Maps.' },
  { n: 5, nombre: 'Escanear QR', a: '/escanear', que: 'Lee los QR de prueba de esta página; también «Probar sin código».' },
  { n: 6, nombre: 'Pasaporte', a: '/pasaporte', que: 'Rutas con su progreso; cambia al conseguir sellos.' },
  { n: 7, nombre: 'Detalle de ruta', a: '/ruta/monumental', que: 'Mini mapa, paradas selladas, siguiente y pendientes; botón para ir a la siguiente.' },
  { n: 8, nombre: 'Sello conseguido', a: '/sello/yedra', que: 'Se ve el sello y el progreso; lleva a la siguiente parada.' },
];

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
  const { modoAlrededor } = useSensores();
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
          {PANTALLAS.map((p) => (
            <li key={p.n} className="tarjeta-plana">
              <label className="casilla">
                <input type="checkbox" checked={hechas.includes(p.n)} onChange={() => marcar(p.n)} />
                <span className="solo-lector">{p.nombre}</span>
              </label>
              <Link to={p.a} className="fila-lista-texto enlace-pantalla">
                <strong>{p.n}. {p.nombre}</strong>
                <span className="nota">{p.que}</span>
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
        <p className="texto-suave">{t('demo.qrTexto')}</p>
        <div className="rejilla-qr">
          {PUNTOS.map((p) => (
            <figure key={p.id} className="tarjeta-plana qr-demo">
              <img src={`/demo/qr-${p.qr_codigo}.svg`} alt={`QR: ${p.nombre}`} />
              <figcaption className="nota">{p.nombre}</figcaption>
            </figure>
          ))}
        </div>

        <Link to="/prueba-ra" className="boton-secundario">
          {t('demo.pruebaTecnica')}
        </Link>
      </div>
    </main>
  );
}
