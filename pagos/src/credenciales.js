import { createHash, createPrivateKey } from "node:crypto";
import { normalizarWallet } from "./billeteras.js";
import { ErrorHttp } from "./errores.js";

// Decisión del equipo (16 de octubre): las llaves de Open Payments de la app (dirección de la billetera
// cliente, Key ID y llave privada) no viven en esta API. Llegan en cada llamada, en encabezados o en el
// cuerpo, y no se escriben en el almacén ni en los logs.
//
// Ojo: en Open Payments el token de un permiso queda atado a la llave que lo pidió. Quien cobra con un
// permiso tiene que mandar la misma llave con la que el bot lo pidió; por eso cada permiso guarda la
// huella de su llave (dirección + Key ID, nunca la llave) y se compara antes de usarlo.
const CAMPOS = ["opWalletAddress", "opKeyId", "opPrivateKey"];

export function leerCredenciales(encabezados, cuerpo) {
  const wallet = encabezados["x-op-wallet-address"] ?? cuerpo?.opWalletAddress;
  const keyId = encabezados["x-op-key-id"] ?? cuerpo?.opKeyId;
  const llave = encabezados["x-op-private-key"] ?? cuerpo?.opPrivateKey;
  if (!wallet || !keyId || !llave) {
    throw new ErrorHttp(400, "Faltan las llaves de Open Payments: X-OP-Wallet-Address, X-OP-Key-Id y X-OP-Private-Key");
  }
  const walletAddressUrl = normalizarWallet(String(wallet));
  if (!walletAddressUrl) throw new ErrorHttp(400, "X-OP-Wallet-Address no es una dirección https ni un payment pointer");
  return {
    walletAddressUrl,
    keyId: String(keyId),
    llavePrivada: leerLlave(String(llave)),
    huella: huellaDe(walletAddressUrl, String(keyId)),
  };
}

export function huellaDe(walletAddressUrl, keyId) {
  return createHash("sha256").update(`${walletAddressUrl}\n${keyId}`).digest("hex").slice(0, 16);
}

// Lo que queda del cuerpo sin las llaves: es lo que se valida y lo que forma la llave de idempotencia.
export function sinCredenciales(cuerpo) {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) return cuerpo;
  return Object.fromEntries(Object.entries(cuerpo).filter(([campo]) => !CAMPOS.includes(campo)));
}

// En un encabezado no caben saltos de línea: la llave viaja como el archivo private.key en base64.
// En el cuerpo también se acepta el PEM tal cual.
function leerLlave(texto) {
  const pem = texto.includes("BEGIN") ? texto : Buffer.from(texto, "base64").toString("utf8");
  let llave;
  try {
    llave = createPrivateKey(pem);
  } catch {
    throw new ErrorHttp(400, "X-OP-Private-Key no es una llave privada legible (se espera private.key en base64)");
  }
  if (llave.asymmetricKeyType !== "ed25519") throw new ErrorHttp(400, "La llave de Open Payments tiene que ser Ed25519");
  return llave;
}
