// Cliente del servicio externo de lógica financiera.
// TODO(#5): las rutas y las formas de respuesta son provisionales hasta que el contrato exista.
// Cuando se definan, ajusta solo este archivo: las pantallas usan la interfaz Servicio.

import type { DecisionCredito, Servicio } from "./tipos";

export class ErrorServicio extends Error {
  constructor(
    message: string,
    readonly estadoHttp?: number,
  ) {
    super(message);
    this.name = "ErrorServicio";
  }
}

export function crearServicioHttp(urlBase: string, apiKey: string): Servicio {
  const base = urlBase.replace(/\/+$/, "");

  async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
    // new Headers() acepta objeto, arreglo o Headers; la llave y el tipo se ponen al final para que
    // ningún llamador los pise.
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    headers.set("X-Api-Key", apiKey);
    const res = await fetch(`${base}${ruta}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new ErrorServicio(`El servicio externo respondió ${res.status} en ${ruta}`, res.status);
    // TODO(#5): validar la respuesta contra el contrato antes de confiar en su forma.
    return (await res.json()) as T;
  }

  return {
    listarNatilleras: () => pedir("/natilleras"),
    async obtenerNatillera(id) {
      try {
        return await pedir(`/natilleras/${encodeURIComponent(id)}`);
      } catch (e) {
        if (e instanceof ErrorServicio && e.estadoHttp === 404) return null;
        throw e;
      }
    },
    listarSolicitudesCredito: () => pedir("/creditos/solicitudes"),
    responderSolicitud: (id: string, decision: DecisionCredito) =>
      pedir(`/creditos/solicitudes/${encodeURIComponent(id)}/respuesta`, { method: "POST", body: JSON.stringify({ decision }) }),
    listarPagos: () => pedir("/pagos"),
    listarBitacora: () => pedir("/bitacora"),
  };
}
