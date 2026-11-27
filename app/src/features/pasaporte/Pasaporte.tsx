import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { useAlmacen } from '../../lib/almacen';
import { useDatos } from '../../lib/datos';
import { BarraNavegacion } from '../../components/Comunes';
import { Icono, iconoRuta } from '../../components/Icono';

/** Progreso de una ruta según los sellos guardados en el móvil. */
export function progresoRuta(paradas: string[], sellos: Record<string, string>) {
  const hechos = paradas.filter((id) => sellos[id]).length;
  const siguiente = paradas.find((id) => !sellos[id]) ?? null;
  return { hechos, total: paradas.length, siguiente, completa: hechos === paradas.length };
}

/** Pantalla 6 · Pasaporte con las rutas. */
export default function Pasaporte() {
  const { sellos, borrarSellos } = useAlmacen();
  const { datos, cargando } = useDatos();
  const rutas = datos?.rutas ?? [];
  const progresos = rutas.map((r) => ({ r, ...progresoRuta(r.paradas, sellos) }));
  const total = Object.keys(sellos).length;
  const enMarcha = progresos.filter((p) => p.hechos > 0 && !p.completa).length;
  const completas = progresos.filter((p) => p.completa).length;

  return (
    <main className="pantalla pantalla-clara">
      <div className="contenido-desplazable">
        <h1 className="titulo-1">{t('pasaporte.titulo')}</h1>
        <div className="rejilla-3">
          <div className="dato-tarjeta"><strong>{total}</strong><span>{t('pasaporte.sellos')}</span></div>
          <div className="dato-tarjeta"><strong>{enMarcha}</strong><span>{t('pasaporte.enMarcha')}</span></div>
          <div className="dato-tarjeta"><strong>{completas}</strong><span>{t('pasaporte.completadas')}</span></div>
        </div>

        <h2 className="etiqueta-suave">{t('pasaporte.rutas')}</h2>
        <div className="pila-8">
          {progresos.length === 0 && <p className="texto-suave">{!datos && cargando ? t('comun.cargando') : t('pasaporte.sinRutas')}</p>}
          {progresos.map(({ r, hechos, total: n, siguiente, completa }) => (
            <Link key={r.id} to={`/ruta/${r.id}`} className={completa ? 'tarjeta-ruta completa' : 'tarjeta-ruta'}>
              <span className="tarjeta-ruta-icono">
                <Icono nombre={iconoRuta(r.icono)} />
              </span>
              <span className="tarjeta-ruta-texto">
                <span className="fila-entre">
                  <strong>{r.nombre}</strong>
                  <span className="texto-suave">{hechos} / {n}</span>
                </span>
                <span className="barra-progreso">
                  <span style={{ width: `${n ? (hechos / n) * 100 : 0}%` }} />
                </span>
                <span className="nota">
                  {completa
                    ? t('pasaporte.completada')
                    : hechos === 0
                      ? t('pasaporte.sinEmpezar', { n })
                      : t('pasaporte.siguiente', { nombre: r.nombres[siguiente ?? ''] ?? '' })}
                </span>
              </span>
            </Link>
          ))}
        </div>

        {total > 0 && (
          <button type="button" className="boton-texto" onClick={borrarSellos}>
            {t('pasaporte.borrar')}
          </button>
        )}
      </div>
      <BarraNavegacion />
    </main>
  );
}
