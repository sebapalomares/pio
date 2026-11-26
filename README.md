# Pío

App de puntos de interés con realidad aumentada y códigos QR. Primer destino: Cazorla.

- `app/` — PWA (Vite + React + TypeScript)
- `wp-plugin/pio/` — plugin de WordPress con los puntos, rutas, QR y la API REST (`/wp-json/pio/v1`)
- `docs/` — notas técnicas

La documentación del producto (alcance, arquitectura, roadmap, decisiones) está en el proyecto «PÍO» de Claude.

## Arrancar la app

```bash
cd app
npm install
npm run dev
```

Vite muestra una dirección `https://192.168.x.x:5173`. Ábrela en el móvil (misma wifi), acepta el aviso de certificado y pulsa **Empezar la prueba**. La cámara, el GPS y la brújula solo funcionan con HTTPS.

## Instalar el plugin

Copia `wp-plugin/pio/` en `wp-content/plugins/` de turismocazorla.info (mejor primero en una copia de pruebas) y actívalo. Aparecerán **Puntos de interés** y **Rutas** en el escritorio.

Endpoints: `/puntos`, `/puntos/{id}`, `/categorias`, `/rutas`, `/rutas/{id}`, `/qr/{codigo}`.
