// Genera los QR de prueba (public/demo/qr-<codigo>.svg) con la URL real que llevarán los carteles.
// Uso: node scripts/generar-qr-demo.mjs
import QRCode from 'qrcode';
import { writeFile } from 'node:fs/promises';

const BASE = 'https://pio.turismocazorla.info/qr/';
const CODIGOS = ['demo-yedra', 'demo-santa-maria', 'demo-corredera', 'demo-san-jose', 'demo-fuente-1', 'demo-fuente-2', 'demo-fuente-3'];

for (const codigo of CODIGOS) {
  const svg = await QRCode.toString(BASE + codigo, { type: 'svg', margin: 2, color: { dark: '#22313A', light: '#FFFFFF' } });
  await writeFile(new URL(`../public/demo/qr-${codigo}.svg`, import.meta.url), svg);
  console.log('QR', codigo);
}
