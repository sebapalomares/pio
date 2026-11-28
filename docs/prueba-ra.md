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
