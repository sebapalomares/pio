import { useEffect, useState } from 'react';
import { idioma } from '../i18n';

/**
 * Audioguía provisional: si el lugar no tiene audio grabado, el móvil lee el texto en voz alta.
 * Cuando haya audio_url, se reproducirá el archivo (y se guardará en la mochila, D12).
 */
export function useLectura() {
  const [hablando, setHablando] = useState(false);
  const disponible = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => () => {
    if (disponible) window.speechSynthesis.cancel();
  }, [disponible]);

  const leer = (texto: string) => {
    if (!disponible) return;
    window.speechSynthesis.cancel();
    // Quitamos los huecos entre corchetes para no leerlos en voz alta
    const limpio = texto.replace(/\[[^\]]*\]/g, '').trim();
    const frase = new SpeechSynthesisUtterance(limpio);
    frase.lang = idioma === 'es' ? 'es-ES' : idioma;
    frase.onend = () => setHablando(false);
    frase.onerror = () => setHablando(false);
    setHablando(true);
    window.speechSynthesis.speak(frase);
  };
  const parar = () => {
    if (disponible) window.speechSynthesis.cancel();
    setHablando(false);
  };

  return { disponible, hablando, leer, parar, alternar: (texto: string) => (hablando ? parar() : leer(texto)) };
}
