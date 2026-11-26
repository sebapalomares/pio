import { Link, useNavigate } from 'react-router-dom';
import { t } from '../../i18n';
import { useSensores } from '../../lib/contexto';
import { Icono } from '../../components/Icono';

export default function Bienvenida() {
  const { activarBrujula } = useSensores();
  const navegar = useNavigate();

  const empezar = async () => {
    await activarBrujula();
    navegar('/explorar');
  };

  return (
    <main className="inicio">
      <img className="inicio-logo" src="/brand/pio-firma-horizontal.svg" alt="pio" />
      <div className="inicio-cuerpo">
        <span className="inicio-etiqueta">{t('inicio.etiqueta')}</span>
        <h1>{t('inicio.titulo')}</h1>
        <p>{t('inicio.texto')}</p>
        <ul className="inicio-permisos">
          <li><Icono nombre="camara" />{t('inicio.permisoCamara')}</li>
          <li><Icono nombre="gps" />{t('inicio.permisoGps')}</li>
          <li><Icono nombre="brujula" />{t('inicio.permisoBrujula')}</li>
        </ul>
      </div>
      <div className="inicio-acciones">
        <button type="button" className="boton-principal" onClick={empezar}>
          {t('inicio.empezar')}
        </button>
        <Link to="/pantallas" className="boton-secundario">
          {t('inicio.verPantallas')}
        </Link>
      </div>
    </main>
  );
}
