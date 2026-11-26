import { es, type Clave } from './es';

// De momento solo español; el idioma se elegirá aquí cuando haya más (D11).
const textos: Record<Clave, string> = es;

/** Devuelve el texto de la interfaz para una clave, sustituyendo {variables}. */
export function t(clave: Clave, vars?: Record<string, string | number>): string {
  let texto = textos[clave] ?? clave;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) texto = texto.replaceAll(`{${k}}`, String(v));
  }
  return texto;
}

export const idioma = 'es';
