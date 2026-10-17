import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import SwaggerParser from "@apidevtools/swagger-parser";
import { crearOpenApi } from "../src/openapi.js";
import { REGLAS } from "../src/operaciones.js";
import { levantar } from "./helpers/app-prueba.js";

let app;
afterEach(async () => app?.cerrar());

const contrato = () => crearOpenApi({ urlPublica: "https://pagos.prueba.test" });
const operacionesDe = (spec) =>
  Object.entries(spec.paths).flatMap(([ruta, metodos]) => Object.entries(metodos).map(([metodo, op]) => ({ ruta, metodo: metodo.toUpperCase(), op })));
const concreta = (ruta) => ruta.replace("{permisoId}", "p0123456789abcdef");

test("el contrato es un OpenAPI válido", async () => {
  await SwaggerParser.validate(structuredClone(contrato()));
});

test("las rutas de staging salen de la misma tabla que valida los cuerpos", () => {
  const spec = contrato();
  for (const [operacion, regla] of Object.entries(REGLAS)) {
    const cuerpo = spec.paths[`/api/open-payments/${operacion}`].post.requestBody.content["application/json"].schema;
    assert.deepEqual(cuerpo.required, Object.keys(regla.campos), operacion);
    assert.deepEqual(Object.keys(cuerpo.properties).sort(), Object.keys({ ...regla.campos, ...regla.opcionales }).sort(), operacion);
  }
  const respuestaCuota = spec.paths["/api/open-payments/cobrar-cuota"].post.responses[200].content["application/json"].schema;
  assert.deepEqual(respuestaCuota.required, ["periodo", "monto"]);
});

test("paridad: cada ruta del contrato existe en el servidor, y cada ruta del servidor está en el contrato", async () => {
  app = await levantar();
  const spec = (await app.llamar("GET", "/api/openapi.json")).cuerpo;
  const documentadas = operacionesDe(spec);
  for (const { ruta, metodo } of documentadas) {
    const respuesta = await app.llamar(metodo, concreta(ruta), { cuerpo: metodo === "POST" ? {} : undefined });
    assert.ok(!(respuesta.estado === 404 && respuesta.cuerpo?.error === "Ruta desconocida"), `${metodo} ${ruta} no existe en el servidor`);
  }
  const propias = ["/docs", "/docs/", "/docs/swagger-ui.css", "/api/openapi.json"];
  for (const { metodo, patron } of app.rutas) {
    if (propias.some((r) => patron.test(r))) continue;
    const cubierta = documentadas.some((d) => d.metodo === metodo && patron.test(concreta(d.ruta)));
    assert.ok(cubierta, `${metodo} ${patron} no está en el contrato`);
  }
});

test("los ejemplos del contrato son cuerpos que la API acepta", async () => {
  app = await levantar();
  for (const operacion of Object.keys(REGLAS)) {
    const esquema = contrato().paths[`/api/open-payments/${operacion}`].post.requestBody.content["application/json"].schema;
    const ejemplo = Object.fromEntries(Object.entries(esquema.properties).map(([campo, s]) => [campo, s.example]));
    const respuesta = await app.staging(operacion, ejemplo);
    assert.notEqual(respuesta.estado, 400, `${operacion}: ${respuesta.cuerpo?.error}`);
  }
});

test("Swagger UI se sirve desde el paquete, solo con los archivos que usa", async () => {
  app = await levantar();
  const pagina = await app.llamar("GET", "/docs/");
  assert.equal(pagina.estado, 200);
  assert.match(pagina.cuerpo, /swagger-ui-bundle\.js/);
  assert.match(pagina.cuerpo, /persistAuthorization: false/);
  assert.equal((await app.llamar("GET", "/docs")).ubicacion, "/docs/");
  const res = await fetch(`${app.base}/docs/swagger-ui-bundle.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /javascript/);
  assert.ok((await res.arrayBuffer()).byteLength > 100_000);
  assert.equal((await app.llamar("GET", "/docs/index.html")).estado, 404);
  assert.equal((await app.llamar("GET", "/docs/..%2Fpackage.json")).estado, 404);
});
