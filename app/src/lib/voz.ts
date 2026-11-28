import { useEffect, useRef, useState } from 'react';
import { idioma } from '../i18n';

/**
 * Audioguía provisional: si el lugar no tiene audio grabado, el móvil lee el texto en voz alta.
 * Cuando haya audio_url, se reproducirá el archivo (y se guardará en la mochila, D12).
 *
 * Para que suene menos a robot:
 * - Se elige la mejor voz en español que tenga el móvil: primero las «premium» o «mejoradas»
 *   (iPhone: Ajustes → Accesibilidad → Contenido leído → Voces → Español), luego las de
 *   Google (Android) y nunca las voces de juguete de iOS (Eloquence: Eddy, Flo, Reed…).
 * - Se lee frase a frase, con una pausa breve entre frases, a un ritmo algo más tranquilo.
 */

const LOCALE = idioma === 'es' ? 'es-ES' : idioma;
const RITMO = 0.95;
const PAUSA_MS = 250;

/** Voces de iOS que suenan a robot (Eloquence) o son de broma: no se eligen nunca. */
const VOCES_ROBOTICAS = /\b(eddy|flo|grandma|grandpa|abuela|abuelo|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph)\b/i;

function puntuar(v: SpeechSynthesisVoice): number {
  const nombre = v.name.toLowerCase();
  if (VOCES_ROBOTICAS.test(nombre)) return -100;
  let p = 0;
  const lang = v.lang.replace('_', '-').toLowerCase();
  if (lang === LOCALE.toLowerCase()) p += 20; // español de España
  else if (lang.startsWith(LOCALE.slice(0, 2).toLowerCase())) p += 10; // otro español
  else return -100;
  if (/premium/.test(nombre)) p += 40;
  if (/(enhanced|mejorad|natural|neural)/.test(nombre)) p += 30;
  if (/google/.test(nombre)) p += 15; // Android y Chrome: voces neuronales de Google
  if (/(m[oó]nica|marisa|jorge|paulina|lucia|luc[ií]a|elvira|alvaro|álvaro)/.test(nombre)) p += 5;
  if (v.localService) p += 2; // funciona sin conexión
  return p;
}

/** La mejor voz disponible, o null si el móvil no tiene ninguna en el idioma. */
export function mejorVoz(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voces = window.speechSynthesis.getVoices();
  let mejor: SpeechSynthesisVoice | null = null;
  let puntos = -1;
  for (const v of voces) {
    const p = puntuar(v);
    if (p > puntos) {
      puntos = p;
      mejor = v;
    }
  }
  return puntos >= 0 ? mejor : null;
}

/** Trocea el texto en frases (sin cortar abreviaturas como «s.» o «c.» en exceso). */
export function frases(texto: string): string[] {
  const limpio = texto
    .replace(/\[[^\]]*\]/g, '') // huecos entre corchetes: no se leen
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpio) return [];
  return (limpio.match(/[^.!?…;]+(?:[.!?…;]+|$)/g) ?? [limpio])
    .map((f) => f.trim())
    .reduce<string[]>((acc, f) => {
      // Frases muy cortas («S. XVI.») se juntan con la anterior para no hacer pausas raras
      if (acc.length && f.length < 18) acc[acc.length - 1] += ` ${f}`;
      else acc.push(f);
      return acc;
    }, []);
}

export function useLectura() {
  const [hablando, setHablando] = useState(false);
  const [voz, setVoz] = useState<SpeechSynthesisVoice | null>(null);
  const turno = useRef(0); // para cortar la lectura en curso si se pulsa otra vez
  const disponible = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Las voces llegan tarde en algunos navegadores: se vuelve a elegir cuando cambian
  useEffect(() => {
    if (!disponible) return;
    const elegir = () => setVoz(mejorVoz());
    elegir();
    window.speechSynthesis.addEventListener('voiceschanged', elegir);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', elegir);
      window.speechSynthesis.cancel();
    };
  }, [disponible]);

  const leer = (texto: string) => {
    if (!disponible) return;
    window.speechSynthesis.cancel();
    const lista = frases(texto);
    if (!lista.length) return;
    const miTurno = ++turno.current;
    setHablando(true);

    const decir = (i: number) => {
      if (miTurno !== turno.current) return;
      if (i >= lista.length) {
        setHablando(false);
        return;
      }
      const frase = new SpeechSynthesisUtterance(lista[i]);
      frase.lang = voz?.lang ?? LOCALE;
      if (voz) frase.voice = voz;
      frase.rate = RITMO;
      frase.pitch = 1;
      frase.onend = () => window.setTimeout(() => decir(i + 1), PAUSA_MS);
      frase.onerror = () => {
        if (miTurno === turno.current) setHablando(false);
      };
      window.speechSynthesis.speak(frase);
    };
    decir(0);
  };

  const parar = () => {
    turno.current++;
    if (disponible) window.speechSynthesis.cancel();
    setHablando(false);
  };

  return {
    disponible,
    hablando,
    leer,
    parar,
    alternar: (texto: string) => (hablando ? parar() : leer(texto)),
    /** Nombre de la voz elegida (para mostrarlo o para depurar). */
    nombreVoz: voz?.name ?? null,
  };
}
