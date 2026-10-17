import { createHash } from "node:crypto";
import { ErrorHttp } from "./errores.js";

const VIGENCIA_MS = 5 * 60 * 1000;

// La llave es la ruta más el cuerpo completo, no la referencia sola: la misma referencia viaja en
// varias llamadas legítimas (una venta paga al vendedor y la comisión; la deuda se repite cada mes).
export function llaveIdempotencia(ruta, cuerpo) {
  return createHash("sha256").update(`${ruta}\n${canonico(cuerpo)}`).digest("hex");
}

function canonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  if (valor && typeof valor === "object") {
    const claves = Object.keys(valor).sort();
    return `{${claves.map((k) => `${JSON.stringify(k)}:${canonico(valor[k])}`).join(",")}}`;
  }
  return JSON.stringify(valor);
}

// Reglas de staging: mientras un pago sigue en curso, el reintento recibe 503 (nunca 409, que sería
// un fallo definitivo). Solo se guarda la respuesta de un pago exitoso: si falló por falta de fondos
// y el participante recarga, el mismo cuerpo tiene que intentarse de nuevo.
export function crearIdempotencia({ almacen, ahora = () => Date.now() }) {
  const enCurso = new Set();
  return {
    async ejecutar(llave, trabajo) {
      if (enCurso.has(llave)) throw new ErrorHttp(503, "El pago sigue en curso");
      enCurso.add(llave);
      let guardado;
      try {
        guardado = await almacen.obtener("idem", llave);
      } catch (error) {
        enCurso.delete(llave);
        throw error;
      }
      if (guardado && guardado.vence > ahora()) {
        enCurso.delete(llave);
        return guardado.respuesta;
      }
      const promesa = (async () => {
        const respuesta = await trabajo();
        await almacen.guardar("idem", llave, { respuesta, vence: ahora() + VIGENCIA_MS });
        return respuesta;
      })();
      promesa.then(
        () => enCurso.delete(llave),
        () => enCurso.delete(llave),
      );
      return promesa;
    },
  };
}
