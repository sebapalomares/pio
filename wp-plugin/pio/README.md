# Plugin `pio` para WordPress

Puntos de interés, rutas y códigos QR de la app Pío, con API REST en `/wp-json/pio/v1`.
Modelo de datos y endpoints: `03-modelo-datos-api.md` (docs del proyecto).

## De dónde salen los puntos (D19)

- **En turismocazorla.info:** Pío usa los **Puntos de Interés que ya tiene la web** (tipo de Toolset `puntos-de-interes`).
  La ubicación es el campo de Toolset Maps `ubicacion` (`{lat,lng}` o una dirección en texto), las categorías son las del blog
  y el teléfono, la web, la dirección y las imágenes salen de sus campos de Toolset. Pío no crea otro tipo de puntos ni toca sus permisos (Toolset Access).
- **En una web sin ese tipo:** Pío registra su propio tipo `pio_punto` (con metas `lat`/`lng`) y el importador de la demo.
- Todo pasa por `includes/origen.php`; el tipo externo se puede cambiar con el filtro `pio_tipo_externo`.

## Instalar (primero en una copia de pruebas)

1. Escritorio → Plugins → Añadir nuevo → Subir plugin → `pio-plugin-0.3.0.zip` → Activar.
2. Si ya estaba una versión anterior, basta con subir el zip y aceptar «Reemplazar la versión actual»: los permisos nuevos se aplican solos al entrar en el escritorio.
3. Solo en una web sin puntos propios: Puntos de interés → **Importar demostración** → Importar (crea como **borradores** los 7 puntos y las 2 rutas de `app/src/data/demo.ts`; los 4 monumentos entran ya verificados). En la web real no hace falta: basta con añadir un punto a mano.

Necesita PHP 8.0 o superior.

## Verificar en el mapa (D18)

Puntos de interés → **Verificar en el mapa** (también en la barra superior: «Verificar puntos»).

- Pin **rojo**: sin verificar. Pin **azul de Pío**: verificado.
- Al pinchar un pin: arrástralo y pulsa **Guardar y verificar**, o pulsa **Estoy aquí: usar mi posición** desde el propio sitio (muestra la precisión del GPS).
- Se guarda lat, lng, quién, cuándo y cómo (mapa o GPS con su precisión).
- Si las coordenadas cambian después por cualquier vía, el punto vuelve a «sin verificar».
- Mapas: Calles (OpenStreetMap), Satélite (PNOA del IGN y Esri) y Relieve (OpenTopoMap).
- El GPS del móvil solo funciona si la web va por **HTTPS**.

### Quién puede usarla

| Rol | Puntos | Verificar |
|---|---|---|
| Administrador | Todos | Todos |
| Gestor de puntos (`pio_gestor`) | Solo los suyos (autor) | Solo los suyos |
| Editor | Todos | No |

## Datos de demostración

`datos/demo.json` se genera desde la app: `cd app && npm run exportar-demo-wp`. No se edita a mano.

## Librerías incluidas

- Leaflet 1.9.4 (`assets/vendor/leaflet/`, licencia BSD-2-Clause).
