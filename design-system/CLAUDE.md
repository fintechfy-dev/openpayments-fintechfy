@README.md

## Al trabajar en `design-system/`

Aplica la skill `natillera-design-system`. El design system es la fuente: la web lo copia con `npm --prefix web run ds` (a `web/public/ds/` y `web/src/styles/ds/`, ignorados por git) y el bot usa sus colores, su avatar y su voz y tono. Un cambio aquí se ve en los dos frentes.

## Qué mantener al día

- **Si tocas `tokens/tokens.json`:** regenera con `node design-system/tokens/build.mjs`, mide el contraste de lo que cambiaste y actualiza la tabla de color o tipografía de este README.
- **Componente nuevo, renombrado o borrado:** su `components/<Nombre>/README.md` y `preview.html`, la lista "Qué hay aquí" de este README y, si la web lo usa, la referencia en `web/README.md`.
- **Un logo o asset nuevo:** el README de su carpeta en `assets/` (qué archivo va sobre qué fondo).
- **Cambios de voz y tono:** `docs/voz-y-tono.md`; los textos del bot y de la web deben seguirlo.
