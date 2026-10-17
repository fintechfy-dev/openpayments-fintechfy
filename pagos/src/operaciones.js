import { normalizarWallet } from "./billeteras.js";
import { OPERACIONES } from "./config.js";
import { ErrorHttp } from "./errores.js";
import { esMontoValido } from "./montos.js";

// Qué pide staging en cada ruta, de qué billetera sale el dinero, a cuál llega y con qué permiso.
// Es la única tabla que decide eso: cambiar de dónde sale un pago se hace aquí y solo aquí.
//
// El tipo va en el aviso al bot. Dos casos comparten ruta y campos y no se pueden distinguir por el
// cuerpo: /pagar con origen es un premio o una comisión devuelta, y sin origen una liquidación o un
// reembolso; /pagar-con-permiso es una venta o una devolución. Se rotula el caso de la demo.
const REGLAS = {
  "cobrar-cuota": {
    campos: { grantId: "texto", walletOrigen: "wallet", monto: "monto", referencia: "texto", periodo: "entero" },
    tipo: () => "cuota",
    permiso: (c, p, cuenta) => p.aprobado(c.grantId, c.walletOrigen, cuenta),
    destino: (c, config) => config.walletGrupo,
    respuesta: (c) => ({ periodo: c.periodo, monto: c.monto }),
  },
  cobrar: {
    campos: { walletOrigen: "wallet", monto: "monto", referencia: "texto" },
    opcionales: { grantId: "texto" },
    tipo: (c) => (c.grantId ? "deuda" : "actividad"),
    permiso: (c, p, cuenta) => (c.grantId ? p.aprobado(c.grantId, c.walletOrigen, cuenta) : p.recurrenteDe(c.walletOrigen, cuenta)),
    destino: (c, config) => config.walletGrupo,
    respuesta: (c) => ({ monto: c.monto }),
  },
  pagar: {
    campos: { walletDestino: "wallet", monto: "monto", referencia: "texto" },
    opcionales: { origen: "texto" },
    tipo: (c) => (c.origen ? "premio" : "liquidacion"),
    permiso: (c, p, cuenta) => p.deRol("grupo", cuenta),
    destino: (c) => c.walletDestino,
    respuesta: (c) => ({ monto: c.monto }),
  },
  desembolsar: {
    campos: { walletDestino: "wallet", monto: "monto", referencia: "texto" },
    tipo: () => "desembolso",
    permiso: (c, p, cuenta) => p.deRol("financiera", cuenta),
    destino: (c) => c.walletDestino,
    respuesta: (c) => ({ monto: c.monto }),
  },
  "pagar-con-permiso": {
    campos: { grantId: "texto", walletOrigen: "wallet", walletDestino: "wallet", monto: "monto", referencia: "texto" },
    tipo: () => "venta",
    permiso: (c, p, cuenta) => p.aprobado(c.grantId, c.walletOrigen, cuenta),
    destino: (c) => c.walletDestino,
    respuesta: (c) => ({ monto: c.monto }),
  },
  "aportar-con-permiso": {
    campos: { grantId: "texto", walletOrigen: "wallet", natilleraId: "texto", monto: "monto", referencia: "texto" },
    tipo: () => "comision",
    permiso: (c, p, cuenta) => p.aprobado(c.grantId, c.walletOrigen, cuenta),
    destino: (c, config) => config.walletGrupo,
    respuesta: (c) => ({ monto: c.monto }),
  },
};

const VALIDADORES = {
  texto: (v) => typeof v === "string" && v.trim().length > 0,
  wallet: (v) => normalizarWallet(v) !== null,
  monto: esMontoValido,
  entero: (v) => Number.isInteger(v) && v >= 0,
};

export function validarCuerpo(operacion, cuerpo) {
  const regla = REGLAS[operacion];
  if (!regla) throw new ErrorHttp(404, `Operación desconocida: ${operacion}`);
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) throw new ErrorHttp(400, "El cuerpo tiene que ser un objeto JSON");
  const errores = [];
  for (const [campo, tipo] of Object.entries(regla.campos)) {
    if (!VALIDADORES[tipo](cuerpo[campo])) errores.push(`${campo} (${tipo})`);
  }
  for (const [campo, tipo] of Object.entries(regla.opcionales ?? {})) {
    if (cuerpo[campo] !== undefined && cuerpo[campo] !== null && !VALIDADORES[tipo](cuerpo[campo])) errores.push(`${campo} (${tipo})`);
  }
  if (errores.length) throw new ErrorHttp(400, `Campos faltantes o inválidos: ${errores.join(", ")}`);
  return regla;
}

export function crearOperaciones({ config, permisos, pagos }) {
  return {
    async ejecutar(operacion, cuerpo, obtenerCuenta) {
      const regla = validarCuerpo(operacion, cuerpo);
      const tipo = regla.tipo(cuerpo);
      const destino = normalizarWallet(regla.destino(cuerpo, config));
      const base = { operacion, tipo, referencia: cuerpo.referencia, monto: cuerpo.monto, periodo: cuerpo.periodo };

      if (config.simuladas.has(operacion)) {
        await pagos.simular({ ...base, origen: normalizarWallet(cuerpo.walletOrigen) ?? `(${tipo})`, destino });
        return regla.respuesta(cuerpo);
      }
      // Sin llaves es un error de configuración de quien llama, no algo que contarle al participante.
      const cuenta = await obtenerCuenta();
      let permiso;
      try {
        permiso = await regla.permiso(cuerpo, permisos, cuenta);
      } catch (error) {
        // Sin permiso no hay pago, pero el participante igual tiene que enterarse de por qué.
        if (error instanceof ErrorHttp) await pagos.rechazar({ ...base, origen: normalizarWallet(cuerpo.walletOrigen) ?? `(${tipo})`, destino }, error.motivo);
        throw error;
      }
      await pagos.ejecutar({ ...base, permiso, destino }, cuenta);
      return regla.respuesta(cuerpo);
    },
  };
}

export { OPERACIONES };
