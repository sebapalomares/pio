import { desplazar, type Coordenadas } from '../lib/geo';

export interface PuntoPrueba extends Coordenadas {
  id: string;
  nombre: string;
  categoria: string;
}

/**
 * Puntos de Cazorla para la prueba de RA.
 * OJO: coordenadas APROXIMADAS — verificarlas sobre el terreno o en el mapa
 * (tarea de la Fase 0) antes de sacar conclusiones de precisión.
 */
export const PUNTOS_CAZORLA: PuntoPrueba[] = [
  { id: 'yedra', nombre: 'Castillo de la Yedra', categoria: 'Monumento', lat: 37.90743593295055, lng: -3.0014442711889884 },
  { id: 'santa-maria', nombre: 'Ruinas de Santa María', categoria: 'Monumento', lat: 37.90839513968401, lng: -2.9997676695709248 },
  { id: 'corredera', nombre: 'Plaza de la Corredera', categoria: 'Plaza', lat: 37.91095938644883, lng: -3.0025005515625707 },
  { id: 'san-jose', nombre: 'Iglesia de San José', categoria: 'Iglesia', lat: 37.91138646100681, lng: -3.00256821536116 },
];

/**
 * Puntos de demostración alrededor de donde estés (N, E, S, O),
 * para probar la RA en cualquier sitio, no solo en Cazorla.
 */
export function puntosAlrededor(origen: Coordenadas, metros = 150): PuntoPrueba[] {
  const direcciones: [string, number][] = [
    ['Norte', 0],
    ['Este', 90],
    ['Sur', 180],
    ['Oeste', 270],
  ];
  return direcciones.map(([nombre, grados]) => ({
    id: `demo-${nombre}`,
    nombre: `${nombre} (${metros} m)`,
    categoria: 'Demo',
    ...desplazar(origen, grados, metros),
  }));
}
