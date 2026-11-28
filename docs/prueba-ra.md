# Fase 1 · Prueba técnica de RA

Objetivo: decidir si la PWA sirve para la realidad aumentada o hay que pasar a React Native + Expo / Flutter.

## Cómo probar
1. `cd app && npm run dev` y abre en el móvil la dirección `https://…:5173`.
2. Pulsa **Empezar la prueba** y acepta cámara, ubicación y movimiento/orientación.
3. Modo **Alrededor de mí**: aparecen 4 puntos a 150 m al N, E, S y O de donde estabas al empezar. Gira sobre ti mismo con una brújula de referencia (la del móvil o una física) y comprueba que cada etiqueta queda centrada al mirar en su dirección.
   - Inclina el móvil hacia arriba y hacia abajo: la línea discontinua del horizonte y las etiquetas deben bajar y subir para quedarse «pegadas» al paisaje.
   - Si las etiquetas se adelantan o se quedan atrás al girar, ajusta el **campo de visión** en el panel de sensores hasta que acompañen al paisaje, y apunta el valor (depende del modelo de móvil).
   - El **radar** (arriba a la derecha) muestra todos los puntos alrededor; los amarillos son los que caen dentro de la cámara. La N indica el norte.
4. Modo **Cazorla**: en el casco antiguo, apunta a sitios reales (coordenadas aproximadas: corrígelas antes si hace falta).
5. Para probar como app instalada: «Añadir a pantalla de inicio» y repetir.

## Qué apuntar (por dispositivo)
| Dato | iPhone Safari | iPhone instalada | Android Chrome | Android instalada |
|---|---|---|---|---|
| Modelo / versión de sistema | | | | |
| ¿Pide y concede los 3 permisos? | | | | |
| Error de la etiqueta al centrarla (°) | | | | |
| Campo de visión que mejor encaja (°) | | | | |
| ¿Las etiquetas siguen al inclinar el móvil? | | | | |
| ¿Tiembla o salta la etiqueta? | | | | |
| Precisión GPS (± m) en casco antiguo | | | | |
| Precisión GPS (± m) en exterior abierto | | | | |
| ¿Se calienta / gasta mucha batería en 10 min? | | | | |

## Criterio de decisión
- **Seguimos con PWA** si en ambos sistemas el error de orientación es de unos 15° o menos, las etiquetas son estables y los permisos funcionan instalada.
- **Pasamos a nativa** si iPhone o Android no dan brújula fiable, la cámara falla instalada, o la experiencia no es usable.

Apuntar el resultado en `05-decisiones.md` del proyecto.

## Calibrar antes de probar (D24)

Desde el 28/11/2026 la app tiene **calibración de la brújula y de la cámara**, guardada en cada móvil:

1. En **Explorar**, botón **«Calibrar»** bajo el radar (o en `/calibrar`, o desde el panel de `/prueba-ra`).
2. Elige un lugar **verificado y lejano** (más de 120 m; el primero de la lista es el recomendado). De cerca, un error pequeño del GPS cambia mucho la dirección.
3. Pon la **línea amarilla central** sobre el centro del lugar y pulsa **«Lo tengo»** → corrige la brújula.
4. Gira a la izquierda hasta que el lugar quede en la **línea de la derecha** y pulsa **«Está en la línea»** → mide el ancho de la imagen (campo de visión). Se puede saltar.
5. Comprueba con varios lugares y afina con **Dirección ◀ ▶** (1°) y **Ancho − +** (2°).

Cada lugar a la vista lleva un **recuadro (mira)** a su altura real —calculada con el relieve del terreno— y una **línea** hasta su etiqueta; el que tienes en el centro sale en amarillo y su tarjeta abajo.

### Resultados de campo
- **28/11, San Isicio (iPhone, Safari):** GPS ±5 m; brújula con unos 3° de error (castillo visto en el borde derecho con la brújula a 77°; rumbo real 94°). Las distancias que mostraba la app (castillo 621 m frente a 452 m reales) venían de **una versión antigua guardada en el móvil**: el servidor del subdominio estaba vacío (404). Con la pantalla a 30° el castillo caía en el borde: el campo de visión real en vertical ronda los 30–35°, no los 50° fijos que usaba «Explorar».
- **28/11, Ruinas de Santa María (balcón de Zabaleta):** las ruinas salían ~90° a la izquierda. A menos de 100 m, el error de posición pesa mucho; pendiente de repetir con la versión nueva.
