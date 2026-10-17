import { generateKeyPairSync } from "node:crypto";
import { crearAlmacenMemoria } from "../../src/almacen.js";
import { calcularHash } from "../../src/aprobacion.js";
import { crearApp } from "../../src/app.js";
import { crearClientes } from "../../src/clientes.js";
import { crearOpFalso, SERVIDOR_PERMISOS, wallet } from "./op-falso.js";

export const LLAVE_STAGING = "llave-staging-de-prueba";
export const LLAVE_CLIENTES = "llave-clientes-de-prueba";
export const ANA = wallet("ana");
export const BETO = wallet("beto");
export const GRUPO = wallet("grupo");
export const FINANCIERA = wallet("financiera");
export const VUELTA_BOT = "https://t.me/natillera_bot?start=permiso_{permisoId}";

// Las llaves de Open Payments de la app, como las mandarían el bot y staging en cada llamada.
const { privateKey } = generateKeyPairSync("ed25519");
export const LLAVE_PRIVADA_BASE64 = Buffer.from(privateKey.export({ type: "pkcs8", format: "pem" })).toString("base64");
export const CREDENCIALES = {
  "X-OP-Wallet-Address": GRUPO.id,
  "X-OP-Key-Id": "kid-de-prueba",
  "X-OP-Private-Key": LLAVE_PRIVADA_BASE64,
};

export async function levantar({ simuladas = [], limiteRespuestaMs, esperar = async () => {} } = {}) {
  const reloj = { ahora: Date.parse("2026-10-16T20:00:00Z") };
  const falso = crearOpFalso([ANA, BETO, GRUPO, FINANCIERA]);
  const almacen = crearAlmacenMemoria();
  const clientesArmados = [];
  const clientes = crearClientes({
    crearCliente: async (args) => {
      clientesArmados.push(args);
      return falso.op;
    },
    ahora: () => reloj.ahora,
  });
  const config = {
    urlPublica: "https://pagos.prueba.test",
    llaveStaging: LLAVE_STAGING,
    llaveClientes: LLAVE_CLIENTES,
    walletGrupo: GRUPO.id,
    walletFinanciera: FINANCIERA.id,
    simuladas: new Set(simuladas),
  };
  const servidor = crearApp({ config, almacen, opPublico: falso.op, clientes, ahora: () => reloj.ahora, esperar, limiteRespuestaMs });
  await new Promise((resolver) => servidor.listen(0, "127.0.0.1", resolver));
  const base = `http://127.0.0.1:${servidor.address().port}`;

  const llamar = async (metodo, ruta, { cuerpo, llave, credenciales = {} } = {}) => {
    const res = await fetch(`${base}${ruta}`, {
      method: metodo,
      redirect: "manual",
      headers: { "Content-Type": "application/json", ...(llave ? { "X-Api-Key": llave } : {}), ...credenciales },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const texto = await res.text();
    const esJson = res.headers.get("content-type")?.includes("application/json");
    return { estado: res.status, cuerpo: esJson && texto ? JSON.parse(texto) : texto || null, ubicacion: res.headers.get("location") };
  };
  const staging = (operacion, cuerpo, credenciales = CREDENCIALES) =>
    llamar("POST", `/api/open-payments/${operacion}`, { cuerpo, llave: LLAVE_STAGING, credenciales });
  const clientesApi = (metodo, ruta, cuerpo, credenciales = CREDENCIALES) => llamar(metodo, ruta, { cuerpo, llave: LLAVE_CLIENTES, credenciales });

  // Pide un permiso, simula que su dueño lo aprueba en la billetera y que el bot consulta el estado.
  async function aprobarPermiso({ tipo, wallet: w, monto = 1_000_000, referencia = "ref", vuelta = VUELTA_BOT }) {
    const pedido = await clientesApi("POST", "/api/permisos", { tipo, wallet: w?.id, monto, referencia, vuelta });
    const { permisoId } = pedido.cuerpo;
    const regreso = await volverAprobado(permisoId);
    const estado = await clientesApi("GET", `/api/permisos/${permisoId}`);
    return { permisoId, pedido, vuelta: regreso, estado };
  }

  async function volverAprobado(permisoId) {
    const guardado = await almacen.obtener("permiso", permisoId);
    const interactRef = `ref-${permisoId}`;
    const hash = calcularHash({
      nonceCliente: guardado.nonceCliente,
      nonceServidor: guardado.nonceServidor,
      interactRef,
      urlServidorPermisos: SERVIDOR_PERMISOS,
    }).toString("base64");
    return llamar("GET", `/api/permisos/${permisoId}/retorno?interact_ref=${interactRef}&hash=${encodeURIComponent(hash)}`);
  }

  return {
    ...falso,
    almacen,
    reloj,
    clientesArmados,
    llamar,
    staging,
    clientes: clientesApi,
    aprobarPermiso,
    volverAprobado,
    base,
    rutas: servidor.rutas,
    cerrar: () => new Promise((r) => servidor.close(r)),
  };
}
