# Comprobación de pantallas

Versión de demostración con las 8 pantallas del diseño y datos de prueba. La misma lista está dentro de la app, en **/pantallas** («Ver todas las pantallas» en la bienvenida), con casillas para ir marcando.

## Antes de empezar
- Sube el contenido de `pio-web.zip` a la carpeta de `pio.turismocazorla.info`, **sustituyendo todo** lo anterior (incluido el `.htaccess`).
- En el móvil, si ya tenías Pío abierto o instalado: ciérralo del todo y vuelve a abrirlo **dos veces** (la primera descarga la versión nueva, la segunda la usa). Si sigue saliendo la antigua: borra los datos del sitio en los ajustes del navegador.
- **En casa:** la app coloca sola los lugares a tu alrededor si estás a más de 3 km de Cazorla. Se puede forzar en /pantallas → «Colocar los lugares a mi alrededor».

## Recorrido completo (unos 10 minutos)
| # | Pantalla | Qué hacer | Qué debe pasar |
|---|---|---|---|
| 0 | Bienvenida `/` | Pulsa «Empezar» | Pide permisos y abre la cámara |
| 1 | Explorar `/explorar` | Gira e inclina el móvil; toca una etiqueta | Las etiquetas siguen al paisaje sin solaparse; el radar marca la N; la tarjeta de abajo cambia |
| 2 | Mapa `/mapa` | Filtros, buscador, Calles / Relieve / Noche, toca un pin | Mapa real; con «Noche» toda la interfaz pasa a oscuro y el logotipo a azul claro; el pin abre la ficha |
| 3 | Ficha `/lugar/yedra` | Escuchar, Llévame, Reservar, mochila, «Forma parte de» | Es la **ficha completa**: lee el texto en voz alta, abre turismocazorla.info, guarda en la mochila |
| 4 | Guiado `/guia/yedra` | Camina o gira | La flecha amarilla apunta al lugar; distancia y minutos; a menos de 25 m sale «Has llegado» |
| 5 | Escanear `/escanear` | Escanea un QR de /pantallas (desde otra pantalla o impreso) | Vibra, muestra el lugar y las 4 opciones |
| 5b | QR con la cámara normal | Escanea el QR con la cámara del móvil, sin la app | Se abre la app directamente en ese lugar |
| — | Check-in | «Hacer check-in» | Pantalla de sello |
| 8 | Sello `/sello/yedra` | Mira el sello | Sello con fecha, progreso de la ruta y siguiente parada |
| 6 | Pasaporte `/pasaporte` | Entra tras sellar | Cuenta de sellos y barra de la ruta actualizadas |
| 7 | Ruta `/ruta/monumental` | Revisa las paradas | La sellada en azul, la siguiente en amarillo; «Llévame a la parada N» |

Para repetir la prueba desde cero: Pasaporte → «Borrar mis sellos de prueba».

## Qué es de demostración (no definitivo)
- Lugares, coordenadas y rutas: datos de prueba en `app/src/data/demo.ts`. Lo que va entre [corchetes] lo rellenará cada gestor en WordPress.
- Fotos: hueco con el icono de la categoría.
- Audioguía: el móvil lee el texto en voz alta mientras no haya audios grabados.
- Mochila: guarda la marca, pero la descarga sin conexión llega en la siguiente fase (D12).
- Mapa: teselas gratuitas (OpenStreetMap, OpenTopoMap, CARTO) solo para la demostración; en producción, proveedor propio o con contrato.

## Qué apuntar
- Pantalla y móvil (modelo, iPhone o Android, Safari/Chrome o app instalada).
- Lo que no hace lo que dice la tabla, con una captura si puedes.
