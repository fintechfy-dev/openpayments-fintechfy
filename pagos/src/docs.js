import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import swaggerUi from "swagger-ui-dist";

// Swagger UI en /docs, servido desde el paquete swagger-ui-dist (sin CDN: funciona aunque la red del
// evento bloquee terceros). Solo se sirven los archivos que la página usa, por nombre exacto.
const CARPETA = swaggerUi.getAbsoluteFSPath();
const ARCHIVOS = {
  "swagger-ui.css": "text/css; charset=utf-8",
  "swagger-ui-bundle.js": "text/javascript; charset=utf-8",
  "swagger-ui-standalone-preset.js": "text/javascript; charset=utf-8",
  "favicon-32x32.png": "image/png",
  "favicon-16x16.png": "image/png",
};

// Sin persistAuthorization: guardaría la llave privada de Open Payments en el localStorage del navegador.
const PAGINA = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Natillera 2.0 · API de pagos</title>
  <link rel="stylesheet" href="/docs/swagger-ui.css">
  <link rel="icon" type="image/png" href="/docs/favicon-32x32.png" sizes="32x32">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/docs/swagger-ui-bundle.js"></script>
  <script src="/docs/swagger-ui-standalone-preset.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/api/openapi.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: "StandaloneLayout",
      persistAuthorization: false,
    });
  </script>
</body>
</html>`;

const cache = new Map();

export function paginaDocs() {
  return PAGINA;
}

export function archivoDocs(nombre) {
  const tipo = ARCHIVOS[nombre];
  if (!tipo) return null;
  if (!cache.has(nombre)) {
    const ruta = join(CARPETA, nombre);
    if (!existsSync(ruta)) return null;
    cache.set(nombre, readFileSync(ruta));
  }
  return { contenido: cache.get(nombre), tipo };
}
