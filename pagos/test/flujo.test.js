import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ANA, BETO, CREDENCIALES, FINANCIERA, GRUPO, levantar, LLAVE_CLIENTES, LLAVE_PRIVADA_BASE64, VUELTA_BOT } from "./helpers/app-prueba.js";

let app;
afterEach(async () => app?.cerrar());

const cuota = (grantId, extra = {}) => ({ grantId, walletOrigen: ANA.id, monto: 50000, referencia: "part-ana", periodo: 1, ...extra });

test("permiso recurrente: pedirlo, aprobarlo y volver al chat del bot", async () => {
  app = await levantar();
  const { permisoId, pedido, vuelta } = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA, monto: 200000 });

  assert.equal(pedido.estado, 201);
  assert.match(pedido.cuerpo.urlAprobacion, /^https:\/\/wallet\.prueba\.test\/aprobar\//);
  const solicitud = app.llamadas.find((l) => l.paso === "permiso" && l.cuerpo.interact).cuerpo;
  assert.deepEqual(solicitud.access_token.access[0].limits, { debitAmount: { value: "20000000", assetCode: "COP", assetScale: 2 } });
  assert.equal(solicitud.access_token.access[0].limits.interval, undefined);
  assert.equal(solicitud.interact.finish.uri, `https://pagos.prueba.test/api/permisos/${permisoId}/retorno`);

  assert.equal(vuelta.estado, 302);
  assert.equal(vuelta.ubicacion, `https://t.me/natillera_bot?start=permiso_${permisoId}`);
  assert.ok(`permiso_${permisoId}`.length <= 64);
  const estado = await app.clientes("GET", `/api/permisos/${permisoId}`);
  assert.deepEqual(estado.cuerpo, { estado: "aprobado", grantId: permisoId, motivo: null });
});

test("permiso: si el participante lo rechaza o el hash no cuadra, queda rechazado y vuelve al chat", async () => {
  app = await levantar();
  const rechazado = await app.clientes("POST", "/api/permisos", { tipo: "recurrente", wallet: ANA.id, monto: 1000, vuelta: VUELTA_BOT });
  const vuelta = await app.llamar("GET", `/api/permisos/${rechazado.cuerpo.permisoId}/retorno?result=grant_rejected`);
  assert.equal(vuelta.estado, 302);
  assert.equal((await app.clientes("GET", `/api/permisos/${rechazado.cuerpo.permisoId}`)).cuerpo.estado, "rechazado");

  const falso = await app.clientes("POST", "/api/permisos", { tipo: "recurrente", wallet: ANA.id, monto: 1000 });
  await app.llamar("GET", `/api/permisos/${falso.cuerpo.permisoId}/retorno?interact_ref=x&hash=aGFzaGZhbHNv`);
  const estado = (await app.clientes("GET", `/api/permisos/${falso.cuerpo.permisoId}`)).cuerpo;
  assert.equal(estado.estado, "rechazado");
  assert.equal(estado.grantId, null);
  assert.equal(app.contar("continuar"), 0, "sin hash válido no se continúa el permiso");
});

test("cobrar-cuota: un pago real de punta a punta, con sus cuatro etapas y el aviso al bot", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA });
  const respuesta = await app.staging("cobrar-cuota", cuota(permisoId));

  assert.equal(respuesta.estado, 200);
  assert.deepEqual(respuesta.cuerpo, { periodo: 1, monto: 50000 });

  const cobro = app.llamadas.find((l) => l.paso === "cobro");
  assert.equal(cobro.args.walletAddress, GRUPO.id, "la cuota llega a la billetera del grupo");
  assert.deepEqual(cobro.args.incomingAmount, { value: "5000000", assetCode: "COP", assetScale: 2 });
  const saliente = app.llamadas.find((l) => l.paso === "saliente");
  assert.equal(saliente.args.walletAddress, ANA.id, "sale de la billetera de Ana");
  assert.match(saliente.accessToken, /^token-saliente-/, "con el token del permiso que aprobó Ana");

  const [pago] = (await app.clientes("GET", "/api/registro")).cuerpo;
  assert.equal(pago.estado, "completado");
  assert.equal(pago.simulado, false);
  for (const etapa of ["solicitud", "autorizacion", "ejecucion", "finalizacion"]) assert.ok(pago.etapas[etapa], etapa);
  assert.ok(pago.etapas.ejecucion.pagoSalienteId);

  const avisos = (await app.clientes("GET", "/api/avisos")).cuerpo;
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].evento, "PagoCompletado");
  assert.deepEqual(avisos[0].datos, { tipo: "cuota", referencia: "part-ana", monto: 50000, periodo: 1 });
  assert.deepEqual((await app.clientes("GET", `/api/avisos?desde=${avisos[0].id}`)).cuerpo, []);
});

test("cobrar-cuota: el reintento con el mismo cuerpo no cobra dos veces; otro periodo sí cobra", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA });
  await app.staging("cobrar-cuota", cuota(permisoId));
  const repetido = await app.staging("cobrar-cuota", cuota(permisoId));
  assert.equal(repetido.estado, 200);
  assert.equal(app.contar("saliente"), 1);

  await app.staging("cobrar-cuota", cuota(permisoId, { periodo: 2 }));
  assert.equal(app.contar("saliente"), 2);
});

test("sin fondos: 402, aviso PagoFallido y, al recargar, el mismo cuerpo se intenta de nuevo", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA });
  app.control.salienteFalla = true;
  const fallo = await app.staging("cobrar", { grantId: permisoId, walletOrigen: ANA.id, monto: 61500, referencia: "part-ana" });
  assert.equal(fallo.estado, 402);
  const [aviso] = (await app.clientes("GET", "/api/avisos")).cuerpo;
  assert.equal(aviso.evento, "PagoFallido");
  assert.equal(aviso.datos.tipo, "deuda");
  assert.ok(aviso.datos.motivo);

  app.control.salienteFalla = false;
  const reintento = await app.staging("cobrar", { grantId: permisoId, walletOrigen: ANA.id, monto: 61500, referencia: "part-ana" });
  assert.equal(reintento.estado, 200);
  assert.equal(app.contar("saliente"), 2);
});

test("un permiso no se usa con la billetera de otra persona", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA });
  const respuesta = await app.staging("cobrar-cuota", cuota(permisoId, { walletOrigen: BETO.id }));
  assert.equal(respuesta.estado, 422);
  assert.equal(app.contar("saliente"), 0);
  const [aviso] = (await app.clientes("GET", "/api/avisos")).cuerpo;
  assert.equal(aviso.evento, "PagoFallido");
});

test("parte de una actividad sin grantId: usa el permiso recurrente de esa billetera", async () => {
  app = await levantar();
  await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA });
  const respuesta = await app.staging("cobrar", { walletOrigen: "$ilp.prueba.test/ana", monto: 10000, referencia: "act-1" });
  assert.equal(respuesta.estado, 200);
  const [aviso] = (await app.clientes("GET", "/api/avisos")).cuerpo;
  assert.equal(aviso.datos.tipo, "actividad");
});

test("pagar y desembolsar salen de las billeteras del grupo y de la financiera, con su permiso (#67)", async () => {
  app = await levantar();
  const sinPermiso = await app.staging("pagar", { walletDestino: ANA.id, monto: 30000, referencia: "act-1", origen: "nat-1" });
  assert.equal(sinPermiso.estado, 403);

  await app.aprobarPermiso({ tipo: "grupo", monto: 5_000_000 });
  await app.aprobarPermiso({ tipo: "financiera", monto: 5_000_000 });
  assert.equal((await app.staging("pagar", { walletDestino: ANA.id, monto: 30000, referencia: "act-1", origen: "nat-1" })).estado, 200);
  assert.equal((await app.staging("desembolsar", { walletDestino: BETO.id, monto: 100000, referencia: "cred-1" })).estado, 200);

  const salientes = app.llamadas.filter((l) => l.paso === "saliente").map((l) => l.args.walletAddress);
  assert.deepEqual(salientes, [GRUPO.id, FINANCIERA.id]);
});

test("compra: dos pagos con el mismo permiso de un solo uso, al vendedor y la comisión al grupo", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "un-solo-uso", wallet: ANA, monto: 100000 });
  const alVendedor = await app.staging("pagar-con-permiso", { grantId: permisoId, walletOrigen: ANA.id, walletDestino: BETO.id, monto: 95000, referencia: "venta-1" });
  const comision = await app.staging("aportar-con-permiso", { grantId: permisoId, walletOrigen: ANA.id, natilleraId: "nat-1", monto: 5000, referencia: "venta-1" });
  assert.equal(alVendedor.estado, 200);
  assert.equal(comision.estado, 200);
  const destinos = app.llamadas.filter((l) => l.paso === "cobro").map((l) => l.args.walletAddress);
  assert.deepEqual(destinos, [BETO.id, GRUPO.id]);
});

test("el token se rota antes de pagar cuando está por vencer", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA });
  await app.staging("cobrar-cuota", cuota(permisoId));
  assert.equal(app.contar("rotar"), 0);

  app.reloj.ahora += 8 * 60 * 1000;
  await app.staging("cobrar-cuota", cuota(permisoId, { periodo: 2 }));
  assert.equal(app.contar("rotar"), 1);
  const ultimo = app.llamadas.filter((l) => l.paso === "saliente").at(-1);
  assert.match(ultimo.accessToken, /^token-rotado-/);
});

test("operación simulada: responde 2xx sin mover dinero y queda marcada como simulada", async () => {
  app = await levantar({ simuladas: ["desembolsar"] });
  const respuesta = await app.staging("desembolsar", { walletDestino: BETO.id, monto: 100000, referencia: "cred-1" });
  assert.deepEqual(respuesta.cuerpo, { monto: 100000 });
  assert.equal(app.contar("saliente"), 0);
  const [pago] = (await app.clientes("GET", "/api/registro")).cuerpo;
  assert.equal(pago.simulado, true);
  const [aviso] = (await app.clientes("GET", "/api/avisos")).cuerpo;
  assert.equal(aviso.datos.simulado, true);
});

test("si el pago tarda, staging recibe 503 a tiempo y el reintento recibe el resultado", async () => {
  let soltar;
  const consultaLenta = new Promise((r) => (soltar = r));
  app = await levantar({ limiteRespuestaMs: 50, esperar: () => consultaLenta });
  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA });

  const primero = await app.staging("cobrar-cuota", cuota(permisoId));
  assert.equal(primero.estado, 503);
  const mientras = await app.staging("cobrar-cuota", cuota(permisoId));
  assert.equal(mientras.estado, 503);

  soltar();
  await new Promise((r) => setTimeout(r, 20));
  const despues = await app.staging("cobrar-cuota", cuota(permisoId));
  assert.equal(despues.estado, 200);
  assert.equal(app.contar("saliente"), 1);
});

test("llaves: staging y clientes no se cruzan, la vuelta es pública y el cuerpo se valida", async () => {
  app = await levantar();
  assert.equal((await app.llamar("POST", "/api/open-payments/cobrar", { cuerpo: {} })).estado, 401);
  assert.equal((await app.llamar("POST", "/api/open-payments/cobrar", { cuerpo: {}, llave: LLAVE_CLIENTES })).estado, 401);
  assert.equal((await app.llamar("GET", "/api/avisos")).estado, 401);
  assert.equal((await app.llamar("GET", "/api/salud")).estado, 200);
  const malo = await app.staging("cobrar-cuota", { monto: "50000" });
  assert.equal(malo.estado, 400);
  assert.match(malo.cuerpo.error, /grantId/);
  assert.equal((await app.staging("inventada", {})).estado, 404);
});

test("llaves de Open Payments: llegan en cada llamada y nunca quedan en el almacén", async () => {
  app = await levantar();
  const sinLlaves = await app.clientes("POST", "/api/permisos", { tipo: "recurrente", wallet: ANA.id, monto: 1000 }, {});
  assert.equal(sinLlaves.estado, 400);
  assert.match(sinLlaves.cuerpo.error, /X-OP-Key-Id/);

  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA });
  assert.equal((await app.staging("cobrar-cuota", cuota(permisoId), {})).estado, 400);
  assert.equal(app.contar("saliente"), 0);
  assert.equal((await app.staging("cobrar-cuota", cuota(permisoId))).estado, 200);
  // La respuesta repetida por idempotencia no necesita las llaves.
  assert.equal((await app.staging("cobrar-cuota", cuota(permisoId), {})).estado, 200);

  assert.equal(app.clientesArmados[0].keyId, "kid-de-prueba");
  assert.equal(app.clientesArmados[0].walletAddressUrl, GRUPO.id);
  assert.equal(app.clientesArmados.length, 1, "el cliente se reutiliza en memoria");
  const guardado = JSON.stringify(await Promise.all(["permiso", "pago", "aviso", "idem", "rol"].map((t) => app.almacen.listar(t))));
  assert.ok(!guardado.includes(LLAVE_PRIVADA_BASE64.slice(20, 60)), "la llave privada no se guarda");
  assert.ok(!guardado.includes("PRIVATE KEY"), "la llave privada no se guarda");
  assert.ok(!guardado.includes("kid-de-prueba"), "el Key ID no se guarda, solo su huella");
});

test("las llaves también pueden venir en el cuerpo, sin cambiar la idempotencia", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA });
  const enCuerpo = {
    ...cuota(permisoId),
    opWalletAddress: GRUPO.id,
    opKeyId: "kid-de-prueba",
    opPrivateKey: Buffer.from(LLAVE_PRIVADA_BASE64, "base64").toString("utf8"),
  };
  assert.equal((await app.staging("cobrar-cuota", enCuerpo, {})).estado, 200);
  assert.equal((await app.staging("cobrar-cuota", cuota(permisoId))).estado, 200);
  assert.equal(app.contar("saliente"), 1);
});

test("un permiso solo lo usa la llave que lo pidió", async () => {
  app = await levantar();
  const { permisoId } = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA });
  const otraLlave = { ...CREDENCIALES, "X-OP-Key-Id": "otra-llave" };
  const respuesta = await app.staging("cobrar-cuota", cuota(permisoId), otraLlave);
  assert.equal(respuesta.estado, 422);
  assert.match(respuesta.cuerpo.error, /otra llave/);
  assert.equal(app.contar("saliente"), 0);
});

test("la vuelta no termina el permiso: lo termina el bot al consultar, con las llaves", async () => {
  app = await levantar();
  const pedido = await app.clientes("POST", "/api/permisos", { tipo: "recurrente", wallet: ANA.id, monto: 1000 });
  const { permisoId } = pedido.cuerpo;
  await app.volverAprobado(permisoId);
  assert.equal(app.contar("continuar"), 0, "la vuelta la abre el navegador, que no tiene las llaves");

  const sinLlaves = await app.clientes("GET", `/api/permisos/${permisoId}`, undefined, {});
  assert.equal(sinLlaves.estado, 400);
  const conLlaves = await app.clientes("GET", `/api/permisos/${permisoId}`);
  assert.deepEqual(conLlaves.cuerpo, { estado: "aprobado", grantId: permisoId, motivo: null });
  assert.equal(app.contar("continuar"), 1);
  // Consultar otra vez no vuelve a continuar ni pide llaves.
  assert.equal((await app.clientes("GET", `/api/permisos/${permisoId}`, undefined, {})).cuerpo.estado, "aprobado");
  assert.equal(app.contar("continuar"), 1);
});

test("la vuelta la decide quien pide el permiso; sin vuelta, el navegador ve una página y nada más", async () => {
  app = await levantar();
  const propia = await app.aprobarPermiso({ tipo: "recurrente", wallet: ANA, vuelta: "https://natillera.test/listo?permiso={permisoId}&x=1" });
  assert.equal(propia.vuelta.ubicacion, `https://natillera.test/listo?permiso=${propia.permisoId}&x=1`);

  const sinVuelta = await app.clientes("POST", "/api/permisos", { tipo: "grupo", monto: 5_000_000 });
  const pagina = await app.volverAprobado(sinVuelta.cuerpo.permisoId);
  assert.equal(pagina.estado, 200);
  assert.equal(pagina.ubicacion, null);
  assert.match(pagina.cuerpo, /Puedes cerrar esta ventana/);
  // El permiso del grupo lo termina quien lo consulte con las llaves (Willy, #67).
  assert.equal((await app.clientes("GET", `/api/permisos/${sinVuelta.cuerpo.permisoId}`)).cuerpo.estado, "aprobado");

  for (const mala of ["http://t.me/bot", "javascript:alert(1)", "no es url", 42]) {
    const respuesta = await app.clientes("POST", "/api/permisos", { tipo: "recurrente", wallet: ANA.id, monto: 1000, vuelta: mala });
    assert.equal(respuesta.estado, 400, String(mala));
  }
});
