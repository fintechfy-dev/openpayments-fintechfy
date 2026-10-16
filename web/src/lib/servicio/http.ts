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
    const res = await fetch(`${base}${ruta}`, {
      ...init,
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey, ...init?.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
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
