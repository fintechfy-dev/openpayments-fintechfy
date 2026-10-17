import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { calcularHash, verificarHash } from "../src/aprobacion.js";
import { mismaWallet, normalizarWallet } from "../src/billeteras.js";
import { crearCandados } from "../src/candados.js";
import { ConfigIncompleta, leerConfig } from "../src/config.js";
import { leerCredenciales, sinCredenciales } from "../src/credenciales.js";
import { aUnidades, MontoInvalido } from "../src/montos.js";

test("aUnidades: pesos a unidades mínimas sin error de punto flotante", () => {
  assert.equal(aUnidades(50000, 2), "5000000");
  assert.equal(aUnidades(0.29, 2), "29");
  assert.equal(aUnidades(1234.5, 2), "123450");
  assert.equal(aUnidades(0.01, 2), "1");
  assert.equal(aUnidades(7, 0), "7");
});

test("aUnidades: rechaza montos que la billetera no puede representar", () => {
  assert.throws(() => aUnidades(1.234, 2), MontoInvalido);
  assert.throws(() => aUnidades(0, 2), MontoInvalido);
  assert.throws(() => aUnidades(-5, 2), MontoInvalido);
  assert.throws(() => aUnidades(Number.NaN, 2), MontoInvalido);
  assert.throws(() => aUnidades("100", 2), MontoInvalido);
  assert.throws(() => aUnidades(1e21, 2), MontoInvalido);
});

const vuelta = { nonceCliente: "nc", nonceServidor: "ns", interactRef: "ir", urlServidorPermisos: "https://auth.prueba.test" };

test("verificarHash: acepta el hash de la especificación, con o sin relleno y en base64url", () => {
  const hash = calcularHash(vuelta);
  assert.equal(verificarHash({ ...vuelta, hash: hash.toString("base64") }), true);
  assert.equal(verificarHash({ ...vuelta, hash: hash.toString("base64").replace(/=+$/, "") }), true);
  assert.equal(verificarHash({ ...vuelta, hash: hash.toString("base64url") }), true);
  // Un "+" sin codificar llega como espacio en la query.
  assert.equal(verificarHash({ ...vuelta, hash: hash.toString("base64").replace(/\+/g, " ") }), true);
});

test("verificarHash: tolera la barra final en la URL del servidor de permisos", () => {
  const hash = calcularHash({ ...vuelta, urlServidorPermisos: "https://auth.prueba.test/" }).toString("base64");
  assert.equal(verificarHash({ ...vuelta, hash }), true);
});

test("verificarHash: rechaza un hash ajeno o ausente", () => {
  const otro = calcularHash({ ...vuelta, interactRef: "otro" }).toString("base64");
  assert.equal(verificarHash({ ...vuelta, hash: otro }), false);
  assert.equal(verificarHash({ ...vuelta, hash: null }), false);
  assert.equal(verificarHash({ ...vuelta, hash: "no es base64!" }), false);
});

test("normalizarWallet: payment pointer, mayúsculas en el host y barra final", () => {
  assert.equal(normalizarWallet("$ilp.interledger-test.dev/ana"), "https://ilp.interledger-test.dev/ana");
  assert.equal(normalizarWallet("https://ILP.interledger-test.dev/ana/"), "https://ilp.interledger-test.dev/ana");
  assert.equal(normalizarWallet("http://ilp.interledger-test.dev/ana"), null);
  assert.equal(normalizarWallet(""), null);
  assert.equal(mismaWallet("$ilp.interledger-test.dev/ana", "https://ilp.interledger-test.dev/ana"), true);
  assert.equal(mismaWallet("$ilp.interledger-test.dev/ana", "$ilp.interledger-test.dev/beto"), false);
});

test("candados: la misma llave va en fila; llaves distintas en paralelo", async () => {
  const conCandado = crearCandados();
  const orden = [];
  const tarea = (nombre, ms) => async () => {
    orden.push(`${nombre}:inicio`);
    await new Promise((r) => setTimeout(r, ms));
    orden.push(`${nombre}:fin`);
  };
  await Promise.all([conCandado("a", tarea("a1", 20)), conCandado("a", tarea("a2", 1)), conCandado("b", tarea("b1", 1))]);
  assert.ok(orden.indexOf("a1:fin") < orden.indexOf("a2:inicio"), orden.join(" "));
  assert.ok(orden.indexOf("b1:fin") < orden.indexOf("a1:fin"), orden.join(" "));
});

function envBase() {
  return {
    URL_PUBLICA: "https://pagos.prueba.test/",
    API_KEY_STAGING: "a",
    API_KEY_CLIENTES: "b",
    OP_WALLET_GRUPO: "$ilp.interledger-test.dev/grupo",
    OP_WALLET_FINANCIERA: "https://ilp.interledger-test.dev/financiera",
  };
}

test("leerConfig: normaliza direcciones y no pide llaves de Open Payments", () => {
  const config = leerConfig(envBase());
  assert.equal(config.urlPublica, "https://pagos.prueba.test");
  assert.equal(config.botUsuario, undefined, "la API no necesita saber de Telegram");
  assert.equal(config.walletGrupo, "https://ilp.interledger-test.dev/grupo");
  assert.equal(config.tablaConexion, null);
  assert.equal(config.op, undefined);
});

test("leerConfig: nombra todo lo que falta y las operaciones simuladas desconocidas", () => {
  const env = { ...envBase(), API_KEY_STAGING: "", OPERACIONES_SIMULADAS: "pagar,inventada" };
  assert.throws(() => leerConfig(env), (error) => {
    assert.ok(error instanceof ConfigIncompleta);
    assert.match(error.message, /API_KEY_STAGING/);
    assert.match(error.message, /inventada/);
    return true;
  });
});

test("leerCredenciales: base64 en encabezados, PEM en el cuerpo, y rechaza lo que no es Ed25519", () => {
  const { privateKey } = generateKeyPairSync("ed25519");
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  const encabezados = { "x-op-wallet-address": "$ilp.interledger-test.dev/grupo", "x-op-key-id": "kid", "x-op-private-key": Buffer.from(pem).toString("base64") };
  const desdeEncabezados = leerCredenciales(encabezados, null);
  assert.equal(desdeEncabezados.walletAddressUrl, "https://ilp.interledger-test.dev/grupo");
  const desdeCuerpo = leerCredenciales({}, { opWalletAddress: "https://ilp.interledger-test.dev/grupo", opKeyId: "kid", opPrivateKey: pem });
  assert.equal(desdeCuerpo.huella, desdeEncabezados.huella);
  assert.deepEqual(sinCredenciales({ monto: 1, opKeyId: "kid", opPrivateKey: pem, opWalletAddress: "x" }), { monto: 1 });

  const rsa = generateKeyPairSync("rsa", { modulusLength: 1024 }).privateKey.export({ type: "pkcs8", format: "pem" });
  assert.throws(() => leerCredenciales({ ...encabezados, "x-op-private-key": Buffer.from(rsa).toString("base64") }, null), /Ed25519/);
  assert.throws(() => leerCredenciales({ ...encabezados, "x-op-private-key": "basura" }, null), /legible/);
  assert.throws(() => leerCredenciales({}, null), /Faltan las llaves/);
});
