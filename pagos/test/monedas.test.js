import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { EVA, GRUPO, levantar, UGO } from "./helpers/app-prueba.js";

// Tasas del Open Payments falso: 1 EUR = 3.600 COP y 1 USD = 3.200 COP (ver op-falso.js).
let app;
afterEach(async () => app?.cerrar());

const solicitudDelPermiso = () => app.llamadas.findLast((l) => l.paso === "permiso" && l.cuerpo.interact).cuerpo;
const cotizaciones = () => app.llamadas.filter((l) => l.paso === "cotizacion");

test("el tope de un permiso en euros se cotiza en euros, con la mitad de margen", async () => {
  app = await levantar();
  const { pedido } = await app.aprobarPermiso({ tipo: "recurrente", wallet: EVA, monto: 150000 });
  assert.equal(pedido.estado, 201);
  // 150.000 COP cuestan 41,67 EUR (4167 en unidades); con la mitad de margen, 62,51 EUR.
  assert.deepEqual(solicitudDelPermiso().access_token.access[0].limits, { debitAmount: { value: "6251", assetCode: "EUR", assetScale: 2 } });
  const cotizacionDelTope = app.llamadas.find((l) => l.paso === "cobro");
  assert.equal(cotizacionDelTope.args.walletAddress, GRUPO.id, "se cotiza un cobro de 150.000 COP al grupo");
  assert.equal(app.contar("saliente"), 0, "cotizar el tope no paga nada");
  assert.equal(app.contar("cerrar-cobro"), 1, "el cobro de la cotización se cierra");
});

test("cuota desde una billetera en euros: llegan los pesos exactos al grupo y se debitan euros", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: EVA, monto: 150000 });
  const respuesta = await app.staging("cobrar-cuota", { grantId: permisoId, walletOrigen: EVA.id, monto: 50000, referencia: "part-eva", periodo: 1 });

  assert.equal(respuesta.estado, 200);
  assert.deepEqual(respuesta.cuerpo, { periodo: 1, monto: 50000 });
  const cobro = app.llamadas.filter((l) => l.paso === "cobro").at(-1);
  assert.deepEqual(cobro.args.incomingAmount, { value: "5000000", assetCode: "COP", assetScale: 2 });
  const cotizacion = cotizaciones().at(-1);
  assert.equal(cotizacion.args.walletAddress, EVA.id);
  assert.equal(cotizacion.args.debitAmount, undefined, "monto fijo al recibir: la cotización calcula el débito");

  const [pago] = (await app.clientes("GET", "/api/registro")).cuerpo;
  assert.equal(pago.estado, "completado");
  assert.equal(pago.etapas.ejecucion.modo, "fijo-al-recibir");
  assert.deepEqual(pago.etapas.ejecucion.debitado, { value: "1389", assetCode: "EUR", assetScale: 2 });
  assert.deepEqual(pago.etapas.ejecucion.recibido, { value: "5000000", assetCode: "COP", assetScale: 2 });
});

test("premio desde el grupo a una billetera en euros: sale el monto exacto en pesos y llega lo convertido", async () => {
  app = await levantar();
  await app.aprobarPermiso({ tipo: "grupo", monto: 5_000_000 });
  const respuesta = await app.staging("pagar", { walletDestino: EVA.id, monto: 30000, referencia: "act-1", origen: "nat-1" });

  assert.equal(respuesta.estado, 200);
  assert.deepEqual(respuesta.cuerpo, { monto: 30000 });
  const cobro = app.llamadas.filter((l) => l.paso === "cobro").at(-1);
  assert.equal(cobro.args.walletAddress, EVA.id);
  assert.equal(cobro.args.incomingAmount, undefined, "el cobro en euros no tiene monto fijo");
  const cotizacion = cotizaciones().at(-1);
  assert.equal(cotizacion.args.walletAddress, GRUPO.id);
  assert.deepEqual(cotizacion.args.debitAmount, { value: "3000000", assetCode: "COP", assetScale: 2 });
  assert.equal(app.contar("cerrar-cobro"), 1, "el cobro sin monto fijo se cierra cuando llega lo cotizado");

  const [pago] = (await app.clientes("GET", "/api/registro")).cuerpo;
  assert.equal(pago.etapas.ejecucion.modo, "fijo-al-enviar");
  assert.deepEqual(pago.etapas.ejecucion.recibido, { value: "833", assetCode: "EUR", assetScale: 2 });
  const [aviso] = (await app.clientes("GET", "/api/avisos")).cuerpo;
  assert.deepEqual(aviso.datos, { tipo: "premio", referencia: "act-1", monto: 30000 });
});

test("compra entre billeteras en euros y dólares: el grupo cotiza el valor y quien compra cubre eso", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "un-solo-uso", wallet: EVA, monto: 50000 });
  const antes = cotizaciones().length;
  const respuesta = await app.staging("pagar-con-permiso", { grantId: permisoId, walletOrigen: EVA.id, walletDestino: UGO.id, monto: 47500, referencia: "venta-1" });

  assert.equal(respuesta.estado, 200);
  assert.deepEqual(respuesta.cuerpo, { monto: 47500 });
  const [referencia, deQuienPaga] = cotizaciones().slice(antes);
  assert.equal(referencia.args.walletAddress, GRUPO.id, "la cotización de referencia sale del grupo y no se paga");
  assert.deepEqual(referencia.args.debitAmount, { value: "4750000", assetCode: "COP", assetScale: 2 });
  assert.equal(deQuienPaga.args.walletAddress, EVA.id);
  assert.deepEqual(deQuienPaga.args.receiveAmount, { value: "1484", assetCode: "USD", assetScale: 2 });

  const [pago] = (await app.clientes("GET", "/api/registro")).cuerpo;
  assert.equal(pago.etapas.ejecucion.modo, "convertido");
  assert.ok(pago.etapas.ejecucion.cotizacionDeReferenciaId);
  assert.deepEqual(pago.etapas.ejecucion.debitado, { value: "1320", assetCode: "EUR", assetScale: 2 });
  assert.deepEqual(pago.etapas.ejecucion.recibido, { value: "1484", assetCode: "USD", assetScale: 2 });
});

test("sin tasa entre las monedas: el permiso y el pago fallan con un motivo claro", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: EVA, monto: 150000 });
  app.control.sinTasa = true;

  const permiso = await app.clientes("POST", "/api/permisos", { tipo: "recurrente", wallet: EVA.id, monto: 150000 });
  assert.equal(permiso.estado, 422);
  assert.match(permiso.cuerpo.error, /cotización del tope.*No hay tasa entre EUR y COP/);

  const cuota = await app.staging("cobrar-cuota", { grantId: permisoId, walletOrigen: EVA.id, monto: 50000, referencia: "part-eva", periodo: 1 });
  assert.equal(cuota.estado, 422);
  const aviso = (await app.clientes("GET", "/api/avisos")).cuerpo.at(-1);
  assert.equal(aviso.evento, "PagoFallido");
  assert.match(aviso.datos.motivo, /No hay tasa entre EUR y COP/);
});
