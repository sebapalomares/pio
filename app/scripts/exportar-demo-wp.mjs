/**
 * Exporta los datos de demostración (src/data/demo.ts) a JSON para el importador
 * del plugin de WordPress: wp-plugin/pio/datos/demo.json
 *
 * Uso: npm run exportar-demo-wp
 * demo.ts sigue siendo la única fuente: si cambia, se vuelve a ejecutar este script.
 */
import { build } from 'rolldown';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = resolve(import.meta.dirname, '..');
const temporal = await mkdtemp(join(tmpdir(), 'pio-demo-'));
const salida = join(temporal, 'demo.mjs');

await build({
  input: join(raiz, 'src/data/demo.ts'),
  output: { file: salida, format: 'esm' },
  logLevel: 'silent',
});
const { PUNTOS, RUTAS, VERIFICACION_DEMO } = await import(pathToFileURL(salida).href);
await rm(temporal, { recursive: true, force: true });

/** Los huecos entre [corchetes] los rellena el gestor en WordPress: no se importan. */
const valor = (v) => (typeof v === 'string' && /^\[[^\]]*\]$/.test(v.trim()) ? null : v);

const datos = {
  origen: 'app/src/data/demo.ts',
  generado: new Date().toISOString().slice(0, 10),
  puntos: PUNTOS.map((p) => ({
    demo_id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    descripcion: p.descripcion,
    lat: p.lat,
    lng: p.lng,
    horario: valor(p.horario),
    precio: valor(p.precio),
    telefono: valor(p.telefono),
    web: valor(p.web),
    reserva_url: valor(p.reserva_url),
    audio_url: valor(p.audio_url),
    qr_codigo: p.qr_codigo,
    verificacion: p.verificado ? { ...VERIFICACION_DEMO } : null,
  })),
  rutas: RUTAS.map((r) => ({
    demo_id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    paradas: r.paradas,
  })),
};

const destino = resolve(raiz, '../wp-plugin/pio/datos/demo.json');
await writeFile(destino, JSON.stringify(datos, null, 2) + '\n');
console.log(`Exportados ${datos.puntos.length} puntos y ${datos.rutas.length} rutas a ${destino}`);
