# Pío — instrucciones para programar en este repo

- Idioma: código, comentarios, commits y textos de la app en **español**.
- Monorepo: `app/` (PWA, Vite + React + TS) y `wp-plugin/pio/` (PHP 8, estándares de WordPress).
- La API REST del plugin (`/wp-json/pio/v1`) es el contrato entre ambos: si cambia un campo, cambia los dos lados en el mismo commit.
- Prefijos en WordPress: tipos `pio_punto`, `pio_ruta`, taxonomía `pio_categoria`, funciones `pio_`.
- App: lógica geográfica en `src/lib/geo.ts`, sensores en `src/lib/sensores.ts`, pantallas en `src/features/<pantalla>/`.
- Nunca inventar horarios, precios ni nombres de lugares: van en WordPress. Las coordenadas de `src/data/puntos-prueba.ts` son aproximadas y solo para pruebas.
- Accesibilidad: botones reales, objetivos táctiles de 44 px o más, contraste AA.
- Antes de terminar una tarea: `cd app && npm run build` sin errores y `php -l` en los PHP tocados.
- Fase actual: **Fase 1 — prueba técnica de RA** (ver `docs/prueba-ra.md`), con una **demo navegable de las 8 pantallas** y datos de prueba (`app/src/data/demo.ts`, `docs/prueba-pantallas.md`).
- Textos de la interfaz: siempre en `app/src/i18n/es.ts` y con `t()` (D11).
- Logotipo sobre mapa, cámara o foto: siempre en pastilla (`LogoPastilla`, D17).
