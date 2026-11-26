# Plugin `pio` para WordPress

Puntos de interés, rutas y códigos QR de la app Pío, con API REST en `/wp-json/pio/v1`.
Modelo de datos y endpoints: `03-modelo-datos-api.md` (docs del proyecto).

## Instalar (primero en una copia de pruebas)

1. Escritorio → Plugins → Añadir nuevo → Subir plugin → `pio-plugin-0.2.0.zip` → Activar.
2. Si ya estaba la 0.1.0, basta con subir el zip y aceptar «Reemplazar la versión actual»: los permisos nuevos se aplican solos al entrar en el escritorio.
3. Puntos de interés → **Importar demostración** → Importar (crea los 7 puntos y las 2 rutas de `app/src/data/demo.ts`; los 4 monumentos entran ya verificados).

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
