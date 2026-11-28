import type { Datos, FichaPunto } from '../lib/tipos';
import { PUNTOS, RUTAS } from './demo';

/**
 * Respaldo SOLO PARA DESARROLLO: convierte los datos de demostración (demo.ts) a la forma
 * que usa la app con la API. `lib/datos.tsx` solo lo importa dentro de `import.meta.env.DEV`,
 * así que no entra en el paquete de producción.
 */
export interface RespaldoDemo {
  datos: Datos;
  fichas: Record<string, FichaPunto>;
  /** código QR → id del punto */
  qr: Record<string, string>;
}

const hueco = (v: string | null) => (v && !/^\[[^\]]*\]$/.test(v.trim()) ? v : null);

export function respaldoDemo(): RespaldoDemo {
  const puntos = PUNTOS.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    lat: p.lat,
    lng: p.lng,
    altitud: null,
    foto: null,
    verificado: p.verificado,
  }));
  const fichas = Object.fromEntries(
    PUNTOS.map((p): [string, FichaPunto] => [
      p.id,
      {
        ...puntos.find((x) => x.id === p.id)!,
        descripcion: `<p>${p.descripcion}</p>`,
        texto: p.descripcion,
        galeria: [],
        direccion: null,
        horario: hueco(p.horario),
        precio: hueco(p.precio),
        telefono: hueco(p.telefono),
        web: p.web,
        reserva_url: p.reserva_url,
        video_url: null,
        audio_url: p.audio_url,
        enlace: null,
      },
    ]),
  );
  const categorias = [...new Map(PUNTOS.map((p) => [p.categoria.slug, p.categoria])).values()];
  return {
    datos: {
      puntos,
      categorias,
      rutas: RUTAS.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        color: null,
        icono: r.id === 'fuentes' ? 'gota' : 'castillo',
        paradas: r.paradas,
        nombres: Object.fromEntries(r.paradas.map((id) => [id, PUNTOS.find((p) => p.id === id)?.nombre ?? id])),
        trazado: null,
        distancia: null,
        duracion: null,
      })),
    },
    fichas,
    qr: Object.fromEntries(PUNTOS.map((p) => [p.qr_codigo, p.id])),
  };
}
