import { normalizarWallet } from "./billeteras.js";

export const OPERACIONES = ["cobrar-cuota", "cobrar", "pagar", "desembolsar", "pagar-con-permiso", "aportar-con-permiso"];

export class ConfigIncompleta extends Error {}

// La configuración de la App Service en Azure. Las llaves de Open Payments NO van aquí: llegan en
// cada llamada (ver credenciales.js). Las llaves de esta API sí, y no se escriben en los logs.
export function leerConfig(env = process.env) {
  const faltan = [];
  const requerida = (nombre) => {
    const valor = env[nombre]?.trim();
    if (!valor) faltan.push(nombre);
    return valor ?? "";
  };
  const wallet = (nombre) => {
    const valor = requerida(nombre);
    const normal = normalizarWallet(valor);
    if (valor && !normal) faltan.push(`${nombre} (no es una dirección https ni un payment pointer)`);
    return normal;
  };

  const config = {
    puerto: Number(env.PORT || 3200),
    urlPublica: requerida("URL_PUBLICA").replace(/\/+$/, ""),
    botUsuario: requerida("BOT_USUARIO").replace(/^@/, ""),
    llaveStaging: requerida("API_KEY_STAGING"),
    llaveClientes: requerida("API_KEY_CLIENTES"),
    walletGrupo: wallet("OP_WALLET_GRUPO"),
    walletFinanciera: wallet("OP_WALLET_FINANCIERA"),
    tablaConexion: env.TABLA_CONEXION?.trim() || null,
    simuladas: leerSimuladas(env.OPERACIONES_SIMULADAS, faltan),
  };
  if (faltan.length) throw new ConfigIncompleta(`Faltan o están mal: ${faltan.join(", ")}`);
  return config;
}

function leerSimuladas(texto, faltan) {
  const lista = (texto ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const desconocidas = lista.filter((op) => !OPERACIONES.includes(op));
  if (desconocidas.length) faltan.push(`OPERACIONES_SIMULADAS desconocidas: ${desconocidas.join(", ")}`);
  return new Set(lista);
}
