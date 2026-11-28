# Pío y el planificador de viaje de turismocazorla.info (D27)

**Estado (28/11/2026):** hecho y probado, **apagado** hasta que se decida activarlo. Rama `planificador` (sobre `mapa-ruta-pie`), plugin 0.5.0.

## Qué hace
1. En **/planifica-tu-viaje/**, cuando el viajero genera su ruta, aparece **«📍 Abrir en Pío»** en «Llévate la ruta».
2. El botón abre `https://pio.turismocazorla.info/viaje?d=…&t=…` y Pío guarda el viaje en el móvil.
3. En Pío, **«Tu viaje»**: pestañas por día y las paradas en orden.
   - Los **puntos de Pío** (puntos de interés) tienen ficha, sello y «Llévame».
   - Los **demás lugares** (restaurantes, senderos que aún no están en Pío, alojamientos) salen en la lista con su tipo y la distancia, y enlazan a su ficha en la web.
   - Lo que ya no está publicado sale como «Ya no está publicado en la web».
4. **«Mapa»** abre el día en el mapa (`/mapa?ruta=viaje-1`) con el camino a pie, las paradas numeradas y «Llévame a la parada N», igual que una ruta (D25, D26).
5. El **Pasaporte** muestra la tarjeta del viaje con sus sellos.

## Contrato (sin guardar nada en el servidor: el viaje va en el enlace)
- Enlace: `/viaje?d=12,45,78~33,91&t=Título`. Días separados por `~`, IDs de WordPress separados por comas, máximo 80.
- API: `GET /wp-json/pio/v1/viaje?ids=12,45,78` → `{ lugares: [{ id, nombre, tipo, tipo_nombre, es_punto, lat, lng, foto, verificado, enlace }], faltan: [ids] }`. Acepta cualquier contenido **publicado y de un tipo público** (no páginas ni adjuntos). Con la sincronización apagada responde **404**.
- PHP: `apply_filters( 'pio_enlace_viaje', '', $dias, $titulo )` o `pio_url_viaje()`; devuelven `''` si está apagado.
- JS en las páginas del planificador: `window.pioViaje.url( dias, titulo )`.

## Cómo se enlaza desde el planificador
Sin tocar su código. `wp-plugin/pio/assets/planificador-pio.js` (solo en `/planifica-tu-viaje/` y con la sincronización activa) espera a que el planificador pinte el viaje en `.pvc-res`, lee en orden las paradas y comidas de cada día (`.pvc-dia .pvc-tl .pvc-t a`), las convierte en IDs con `window.PVC_DATA` (pois y rest, por su URL) y añade el botón. Si el planificador cambia esas clases, hay que revisar este archivo.

El alojamiento no entra en el viaje de Pío (es el mismo todos los días y ya tiene su tarjeta y su reserva en el planificador).

## Cómo activarlo (cuando se decida)
1. Subir el plugin **0.5.0** (Plugins → Añadir → Subir → Reemplazar).
2. **Ajustes → Pío** → marcar «Sincronizar con el planificador» y guardar. Ahí mismo, «Probar un viaje» crea un enlace con los IDs que pongas.
3. Construir la app con `VITE_PIO_PLANIFICADOR=1` y subir `dist` al subdominio. Sin esa variable, `/viaje` lleva a la portada.
4. Purgar en LiteSpeed la caché de `/planifica-tu-viaje/` y de `/wp-json/pio/v1/viaje`.

## Pruebas hechas (28/11)
- WordPress de pruebas (SQLite) imitando los tipos de Toolset: `/viaje` apagado → 404; encendido → lugares en orden, alojamientos con coordenadas de `wpcf-ubicacion`, borradores, tipos privados e IDs inexistentes en `faltan`; CORS `*`.
- App en el navegador (390×844): abrir el enlace, cambiar de día, mapa del día, tarjeta del Pasaporte, recargar sin parámetros, quitar el viaje.
- Página real del planificador: botón inyectado solo en la pestaña del navegador (sin cambiar la web). Viaje de 2 días → `d=22280,22195,19169,22510~17215,22281,22277,18393`; los 8 nombres coinciden.

## Pendiente
- Probarlo en el móvil con la web real una vez activado.
- Los senderos del planificador (`t: sendero`) son puntos de interés de la web: salen con sello solo si son del tipo `puntos-de-interes`. Cuando Pío lea el tipo `senderos` (D20), entrarán con su trazado.
- Más adelante: botón «Añadir a mi viaje» en la ficha de Pío (necesita que el planificador acepte lugares por la dirección) y el enlace «Abrir en Pío» dentro del email del planificador.
