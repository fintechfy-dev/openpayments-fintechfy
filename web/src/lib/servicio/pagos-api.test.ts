import { describe, expect, it, vi } from "vitest";

import { ErrorServicio } from "./http";
import { crearClientePagos } from "./pagos-api";

const LLAVE = "llave-de-prueba-que-no-debe-salir";
const BASE = "https://pagos.ejemplo/";

function fetchCon(estado: number, cuerpo: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(cuerpo), { status: estado }));
}

describe("crearClientePagos", () => {
  it("registro: manda la llave en X-Api-Key, sin caché, y devuelve la lista", async () => {
    const f = fetchCon(200, [{ id: "p1" }]);
    const cliente = crearClientePagos({ urlBase: BASE, apiKey: LLAVE, fetch: f });
    expect(await cliente.registro()).toEqual([{ id: "p1" }]);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://pagos.ejemplo/api/registro");
    expect(new Headers(init.headers).get("X-Api-Key")).toBe(LLAVE);
    expect(init.cache).toBe("no-store");
  });

  it("registro: un 401 o algo que no es lista es un error claro, sin la llave", async () => {
    const cliente = crearClientePagos({ urlBase: BASE, apiKey: LLAVE, fetch: fetchCon(401, { error: LLAVE }) });
    const error = await cliente.registro().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorServicio);
    expect(String((error as Error).message)).toContain("401");
    expect(String((error as Error).message)).not.toContain(LLAVE);
    await expect(crearClientePagos({ urlBase: BASE, apiKey: LLAVE, fetch: fetchCon(200, { no: "lista" }) }).registro()).rejects.toThrow("no devolvió una lista");
  });

  it("un fallo de red no deja salir la llave aunque venga en el mensaje", async () => {
    const f = vi.fn(async () => {
      throw new Error(`ECONNREFUSED ${LLAVE}`);
    });
    const error = await crearClientePagos({ urlBase: BASE, apiKey: LLAVE, fetch: f }).registro().catch((e: unknown) => e);
    expect(String((error as Error).message)).not.toContain(LLAVE);
  });

  it("salud: es pública (sin llave) y lee lo que falta aunque responda 503", async () => {
    const f = fetchCon(503, { ok: false, error: "Faltan o están mal: OP_WALLET_GRUPO, OP_WALLET_FINANCIERA" });
    const salud = await crearClientePagos({ urlBase: BASE, apiKey: LLAVE, fetch: f }).salud();
    expect(salud).toEqual({ alcanzable: true, ok: false, error: "Faltan o están mal: OP_WALLET_GRUPO, OP_WALLET_FINANCIERA", simuladas: [] });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("X-Api-Key")).toBeNull();
  });

  it("salud: las operaciones simuladas son una lista (como la devuelve pagos/src/servidor.js)", async () => {
    const salud = await crearClientePagos({ urlBase: BASE, apiKey: LLAVE, fetch: fetchCon(200, { ok: true, simuladas: ["desembolsar", 3] }) }).salud();
    expect(salud).toEqual({ alcanzable: true, ok: true, error: undefined, simuladas: ["desembolsar"] });
  });
});
