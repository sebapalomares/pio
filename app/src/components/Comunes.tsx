import { NavLink, Link } from 'react-router-dom';
import { t } from '../i18n';
import { Icono, iconoCategoria, type NombreIcono } from './Icono';

/** Barra inferior: Explorar, Mapa, Escanear, Pasaporte. */
export function BarraNavegacion() {
  const items: { a: string; icono: NombreIcono; texto: string }[] = [
    { a: '/explorar', icono: 'camara', texto: t('nav.explorar') },
    { a: '/mapa', icono: 'mapa', texto: t('nav.mapa') },
    { a: '/escanear', icono: 'qr', texto: t('nav.escanear') },
    { a: '/pasaporte', icono: 'pasaporte', texto: t('nav.pasaporte') },
  ];
  return (
    <nav className="barra-nav" aria-label={t('nav.principal')}>
      {items.map((i) => (
        <NavLink key={i.a} to={i.a} className="barra-nav-item">
          <span className="barra-nav-icono">
            <Icono nombre={i.icono} />
          </span>
          {i.texto}
        </NavLink>
      ))}
    </nav>
  );
}

/** Conmutador Cámara RA / Mapa, siempre arriba y en el mismo sitio. */
export function SelectorModo({ actual }: { actual: 'camara' | 'mapa' }) {
  return (
    <div className="selector-modo" role="group" aria-label={t('modo.grupo')}>
      <Link to="/explorar" aria-current={actual === 'camara' ? 'page' : undefined}>
        <Icono nombre="camara" tamano={18} />
        {t('modo.camara')}
      </Link>
      <Link to="/mapa" aria-current={actual === 'mapa' ? 'page' : undefined}>
        <Icono nombre="mapa" tamano={18} />
        {t('modo.mapa')}
      </Link>
    </div>
  );
}

/**
 * Logotipo sobre mapa, cámara o foto: siempre en pastilla de superficie (D17).
 * El color del logotipo sigue al tema: azul en claro, azul claro en oscuro.
 */
export function LogoPastilla({ oscuro = false }: { oscuro?: boolean }) {
  return (
    <span className="logo-pastilla">
      <img src={oscuro ? '/brand/pio-logotipo-azul-claro.svg' : '/brand/pio-logotipo-azul.svg'} alt="pio" />
    </span>
  );
}

/** Hueco para la foto de un lugar mientras no hay fotos reales. */
export function FotoHueco({ slug, tamano }: { slug: string; tamano: number }) {
  return (
    <span className="foto-hueco" style={{ width: tamano, height: tamano }} aria-hidden="true">
      <Icono nombre={iconoCategoria(slug)} tamano={Math.round(tamano * 0.4)} />
    </span>
  );
}

export function BotonVolver({ a, texto }: { a: string; texto?: string }) {
  return (
    <Link to={a} className="boton-redondo" aria-label={texto ?? t('comun.volver')}>
      <Icono nombre="atras" />
    </Link>
  );
}
