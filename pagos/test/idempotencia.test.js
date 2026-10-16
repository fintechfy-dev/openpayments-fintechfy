import assert from "node:assert/strict";
import { test } from "node:test";
import { crearAlmacenMemoria } from "../src/almacen.js";
import { ErrorHttp } from "../src/errores.js";
import { crearIdempotencia, llaveIdempotencia } from "../src/idempotencia.js";

const cuerpo = { grantId: "p1", walletOrigen: "https://w/ana", monto: 50000, referencia: "part-1", periodo: 1 };

test("la llave no depende del orden de los campos pero sí de cada valor y de la ruta", () => {
  const llave = llaveIdempotencia("/cobrar-cuota", cuerpo);
  const reordenado = Object.fromEntries(Object.entries(cuerpo).reverse());
  assert.equal(llaveIdempotencia("/cobrar-cuota", reordenado), llave);
  assert.notEqual(llaveIdempotencia("/cobrar-cuota", { ...cuerpo, periodo: 2 }), llave);
  assert.notEqual(llaveIdempotencia("/cobrar-cuota", { ...cuerpo, monto: 50001 }), llave);
  assert.notEqual(llaveIdempotencia("/cobrar", cuerpo), llave);
});

test("un éxito se repite sin volver a pagar durante 5 minutos", async () => {
  const reloj = { ahora: 0 };
  const idem = crearIdempotencia({ almacen: crearAlmacenMemoria(), ahora: () => reloj.ahora });
  let pagos = 0;
  const pagar = async () => ({ pago: ++pagos });
  assert.deepEqual(await idem.ejecutar("k", pagar), { pago: 1 });
  assert.deepEqual(await idem.ejecutar("k", pagar), { pago: 1 });
  reloj.ahora = 5 * 60 * 1000 + 1;
  assert.deepEqual(await idem.ejecutar("k", pagar), { pago: 2 });
});

test("mientras el pago sigue en curso, el reintento recibe 503 y no paga otra vez", async () => {
  const idem = crearIdempotencia({ almacen: crearAlmacenMemoria() });
  let terminar;
  const enCurso = idem.ejecutar("k", () => new Promise((r) => (terminar = r)));
  await new Promise((r) => setImmediate(r));
  await assert.rejects(idem.ejecutar("k", async () => "otro"), (e) => e instanceof ErrorHttp && e.estado === 503);
  terminar("listo");
  assert.equal(await enCurso, "listo");
  assert.equal(await idem.ejecutar("k", async () => "otro"), "listo");
});

test("dos llamadas simultáneas con el mismo cuerpo: solo una paga", async () => {
  const idem = crearIdempotencia({ almacen: crearAlmacenMemoria() });
  let pagos = 0;
  const pagar = async () => {
    pagos += 1;
    await new Promise((r) => setTimeout(r, 5));
    return "ok";
  };
  const resultados = await Promise.allSettled([idem.ejecutar("k", pagar), idem.ejecutar("k", pagar)]);
  assert.equal(pagos, 1);
  assert.deepEqual(resultados.map((r) => r.status).sort(), ["fulfilled", "rejected"]);
});

test("un fallo no se guarda: el mismo cuerpo se intenta de nuevo", async () => {
  const idem = crearIdempotencia({ almacen: crearAlmacenMemoria() });
  await assert.rejects(idem.ejecutar("k", async () => {
    throw new ErrorHttp(402, "sin fondos");
  }));
  assert.equal(await idem.ejecutar("k", async () => "pagado al recargar"), "pagado al recargar");
});
