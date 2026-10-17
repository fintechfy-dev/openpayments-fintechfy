import { createServer } from "node:http";
import { createUnauthenticatedClient } from "@interledger/open-payments";
import { crearAlmacenMemoria, crearAlmacenTablas } from "./almacen.js";
import { crearApp } from "./app.js";
import { crearClientes } from "./clientes.js";
import { ConfigIncompleta, leerConfig } from "./config.js";
import { archivoDocs, paginaDocs } from "./docs.js";
import { crearOpenApi } from "./openapi.js";

let config;
try {
  config = leerConfig();
} catch (error) {
  if (!(error instanceof ConfigIncompleta)) throw error;
  // Sin configuración completa no se mueve dinero, pero la app responde y dice qué falta: así un
  // despliegue en Azure se puede verificar antes de tener todas las direcciones.
  console.error(`Sin configurar: ${error.message}. Ver .env.example.`);
  // El contrato y Swagger UI sí se sirven: el equipo puede implementar contra ellos mientras tanto.
  const contrato = JSON.stringify(crearOpenApi({ urlPublica: process.env.URL_PUBLICA?.trim().replace(/\/+$/, "") || "" }));
  createServer((req, res) => {
    const ruta = new URL(req.url, "http://local").pathname;
    const archivo = ruta.startsWith("/docs/") && archivoDocs(ruta.slice("/docs/".length));
    if (req.method === "GET" && ruta === "/api/openapi.json") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }).end(contrato);
    } else if (req.method === "GET" && (ruta === "/docs" || ruta === "/docs/")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(paginaDocs());
    } else if (req.method === "GET" && archivo) {
      res.writeHead(200, { "Content-Type": archivo.tipo }).end(archivo.contenido);
    } else {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" }).end(JSON.stringify({ ok: false, error: error.message }));
    }
  }).listen(Number(process.env.PORT || 3200));
}
if (config) await arrancar(config);

async function arrancar(config) {
  const almacen = config.tablaConexion ? await crearAlmacenTablas(config.tablaConexion) : crearAlmacenMemoria();
  if (almacen.nombre === "memoria") console.warn("Sin TABLA_CONEXION: los permisos y pagos se pierden al reiniciar. Solo para la laptop.");

  const opPublico = await createUnauthenticatedClient({ logLevel: "warn" });

  crearApp({ config, almacen, opPublico, clientes: crearClientes() }).listen(config.puerto, () => {
    console.log(`API de pagos en el puerto ${config.puerto} · almacén ${almacen.nombre} · grupo ${config.walletGrupo}`);
    if (config.simuladas.size) console.log(`Operaciones SIMULADAS: ${[...config.simuladas].join(", ")}`);
  });
}
