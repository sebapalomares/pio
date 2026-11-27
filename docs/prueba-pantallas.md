# Comprobación de pantallas

Las 8 pantallas del diseño con los **lugares reales de turismocazorla.info** (API del plugin `pio`, `/wp-json/pio/v1`). La misma lista está dentro de la app, en **/pantallas** («Ver todas las pantallas» en la bienvenida), con casillas para ir marcando.

## Antes de empezar
- Genera la web con `cd app && npm run build` y sube el contenido de `app/dist` a la carpeta de `pio.turismocazorla.info`, **sustituyendo todo** lo anterior (incluido el `.htaccess`).
- En el móvil, si ya tenías Pío abierto o instalado: ciérralo del todo y vuelve a abrirlo **dos veces** (la primera descarga la versión nueva, la segunda la usa). Si sigue saliendo la antigua: borra los datos del sitio en los ajustes del navegador.
- **En casa:** la app coloca sola los lugares a tu alrededor si estás a más de 3 km de Cazorla. Se puede forzar en /pantallas → «Colocar los lugares a mi alrededor».

## Recorrido completo (unos 10 minutos)
| # | Pantalla | Qué hacer | Qué debe pasar |
|---|---|---|---|
| 0 | Bienvenida `/` | Pulsa «Empezar» | Pide permisos y abre la cámara |
| 1 | Explorar `/explorar` | Gira e inclina el móvil; toca una etiqueta | Las etiquetas siguen al paisaje sin solaparse; el radar marca la N; la tarjeta de abajo cambia |
| 2 | Mapa `/mapa` | Filtros, buscador, Calles / Relieve / Noche, toca un pin | Mapa real; con «Noche» toda la interfaz pasa a oscuro y el logotipo a azul claro; el pin abre la ficha |
| 3 | Ficha `/lugar/{id}` | Escuchar, Llévame, «Ver la ficha en Turismo Cazorla», mochila | Foto, texto, dirección y teléfono de WordPress; lee el texto en voz alta |
| 4 | Guiado `/guia/{id}` | Camina o gira | La flecha amarilla apunta al lugar; distancia y minutos; a menos de 25 m sale «Has llegado» |
| 5 | Escanear `/escanear` | Escanea el QR de un punto: `https://pio.turismocazorla.info/qr/{qr_codigo}` (el código está en la meta `qr_codigo` del punto) | Vibra, comprueba el código con la API y muestra el lugar y las 4 opciones |
| 5b | QR con la cámara normal | Escanea el QR con la cámara del móvil, sin la app | Se abre la app directamente en ese lugar |
| — | Check-in | «Hacer check-in» | Pantalla de sello |
| 8 | Sello `/sello/{id}` | Mira el sello | Sello con fecha, progreso de la ruta y siguiente parada |
| 6 | Pasaporte `/pasaporte` | Entra tras sellar | Cuenta de sellos y barra de la ruta actualizadas |
| 7 | Ruta `/ruta/{id}` (si hay rutas publicadas) | Revisa las paradas | La sellada en azul, la siguiente en amarillo; «Llévame a la parada N» |

Para repetir la prueba desde cero: Pasaporte → «Borrar mis sellos de prueba».

## Datos reales: qué comprobar
- **CORS (D9):** en el móvil, `/mapa` debe mostrar los 41 puntos con coordenadas. Si sale «No hemos podido cargar los lugares», abre en un ordenador `https://pio.turismocazorla.info/mapa`, consola del navegador → pestaña Red: si la petición a `turismocazorla.info/wp-json/pio/v1/puntos?lang=es` dice «CORS», revisa que ningún plugin de seguridad o la caché de la web quite la cabecera `Access-Control-Allow-Origin`.
- **Ubicación sin verificar (D18):** pin blanco con borde azul discontinuo en el mapa, «Ubicación aproximada» en la lista y la ficha; en la cámara, etiqueta con borde discontinuo y «≈». Al verificar un punto en «Verificar en el mapa», el pin pasa a azul.
- **Sin coordenadas (D19):** el punto que no tiene ubicación no sale en el mapa ni en la cámara; su ficha (por QR o enlace) avisa y no ofrece «Llévame».
- **Cambio en WordPress:** cambia el título de un punto, vuelve a la app (o recárgala) y debe verse el nombre nuevo. Si tarda, la caché de la web está guardando la API.
- **Sin cobertura:** con el móvil en modo avión, la app abre con los últimos datos y avisa «Sin conexión · datos guardados el…». Las fichas y fotos ya vistas se abren; un QR nuevo necesita conexión.
- **Desarrollo:** `npm run dev` usa la API real; si no responde y no hay nada guardado, usa los datos de demostración (`app/src/data/demo.ts`) con el aviso «solo en desarrollo». Con `VITE_PIO_DATOS=demo` en `app/.env.local`, siempre demostración. En producción, nunca.

## Lo que aún no es definitivo
- Fotos: los puntos sin imagen destacada muestran el icono de la categoría.
- Audioguía: el móvil lee el texto en voz alta mientras no haya audios grabados.
- Mochila: guarda la marca, pero la descarga sin conexión llega en la siguiente fase (D12).
- Mapa: teselas gratuitas (OpenStreetMap, OpenTopoMap, CARTO) solo para la demostración; en producción, proveedor propio o con contrato.

## Qué apuntar
- Pantalla y móvil (modelo, iPhone o Android, Safari/Chrome o app instalada).
- Lo que no hace lo que dice la tabla, con una captura si puedes.
