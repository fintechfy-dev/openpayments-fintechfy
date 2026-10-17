// La única puerta de la web a la API de pagos (pagos/, publicada en Azure; contrato en
// https://natillera-pagos.azurewebsites.net/api/openapi.json). La web solo lee: GET /api/registro (los
// pagos con sus cuatro etapas, con API_KEY_CLIENTES) y GET /api/salud (pública). Sin server-only aquí:
// las pruebas lo importan; index.ts es la barrera.

import { ErrorServicio } from "./http";

const TIEMPO_LIMITE_MS = 10_000;

export interface SaludPagos {
  /** false si no hubo respuesta que leer (red, tiempo, HTML de un 502): no dice nada de su configuración. */
  alcanzable: boolean;
  ok: boolean;
  /** Lo que le falta configurar, tal como lo dice la API ("Faltan o están mal: OP_WALLET_GRUPO, …"). */
  error?: string;
  /** Operaciones que la API simula en vez de pasar por Open Payments (OPERACIONES_SIMULADAS), p. ej. ["desembolsar"]. */
  simuladas: string[];
}

export interface ClientePagos {
  /** Los pagos tal como los guarda la API; los traduce registro-pagos.ts. */
  registro(): Promise<unknown[]>;
  salud(): Promise<SaludPagos>;
}

export function crearClientePagos(opciones: { urlBase: string; apiKey: string; fetch?: typeof fetch }): ClientePagos {
  const base = opciones.urlBase.replace(/\/+$/, "");
  const { apiKey } = opciones;
  const pedirHttp = opciones.fetch ?? fetch;

  /** Ningún mensaje que salga de aquí lleva la llave. */
  const sinLlave = (texto: string) => (apiKey ? texto.split(apiKey).join("<llave>") : texto);

  async function pedir(ruta: string, conLlave: boolean): Promise<Response> {
    try {
      return await pedirHttp(`${base}${ruta}`, {
        headers: conLlave ? { "X-Api-Key": apiKey } : {},
        cache: "no-store",
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      });
    } catch (e) {
      const motivo = e instanceof Error && e.name === "TimeoutError" ? "no respondió en 10 s" : `no se pudo conectar (${e instanceof Error ? e.message : String(e)})`;
      throw new ErrorServicio(sinLlave(`La API de pagos ${motivo} en ${ruta}`));
    }
  }

  async function json(res: Response, ruta: string): Promise<unknown> {
    try {
      return (await res.json()) as unknown;
    } catch {
      throw new ErrorServicio(`La API de pagos respondió algo que no es JSON en ${ruta}`, res.status);
    }
  }

  return {
    async registro() {
      const ruta = "/api/registro";
      const res = await pedir(ruta, true);
      if (!res.ok) throw new ErrorServicio(sinLlave(`La API de pagos respondió ${res.status} en ${ruta}`), res.status);
      const cuerpo = await json(res, ruta);
      if (!Array.isArray(cuerpo)) throw new ErrorServicio(`La API de pagos no devolvió una lista en ${ruta}`);
      return cuerpo;
    },
    async salud() {
      const ruta = "/api/salud";
      const res = await pedir(ruta, false);
      // Con configuración incompleta responde 503 y en el cuerpo dice qué falta: eso es lo que interesa.
      const cuerpo = await json(res, ruta);
      const c = cuerpo !== null && typeof cuerpo === "object" ? (cuerpo as Record<string, unknown>) : {};
      return {
        alcanzable: true,
        ok: c.ok === true,
        error: typeof c.error === "string" ? c.error : undefined,
        simuladas: Array.isArray(c.simuladas) ? c.simuladas.filter((x): x is string => typeof x === "string") : [],
      };
    },
  };
}
