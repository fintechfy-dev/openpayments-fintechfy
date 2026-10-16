import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

vi.mock("server-only", () => ({}));
const { POST } = await import("./route");

const LLAVE = "llave-de-prueba-del-indice-0123456789";
const natillera = {
  natilleraId: "nat_01",
  contractId: "c1",
  nombre: "Los del barrio",
  administrador: { telegramId: "1", nombre: "Andrés" },
  creadaEn: "2026-10-16T09:00:00-05:00",
};

let carpeta: string;
beforeEach(async () => {
  carpeta = await mkdtemp(path.join(tmpdir(), "indice-ruta-"));
  vi.stubEnv("INDICE_RUTA", path.join(carpeta, "indice.json"));
  vi.stubEnv("WEB_INDICE_API_KEY", LLAVE);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(carpeta, { recursive: true, force: true });
});

function enviar(tipo: string, cuerpo: unknown, { llave = LLAVE as string | null, crudo = false } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (llave !== null) headers.set("X-Api-Key", llave);
  const body = crudo ? (cuerpo as string) : JSON.stringify(cuerpo);
  return POST(new Request(`http://localhost/api/indice/${tipo}`, { method: "POST", headers, body }), { params: Promise.resolve({ tipo }) });
}

describe("POST /api/indice/[tipo]", () => {
  it("un id ya registrado con otros datos responde 409 y no se cambia", async () => {
    const primero = { natilleraId: "nat-409", contractId: "c-409", nombre: "Original", administrador: { telegramId: "1", nombre: "Rosa" }, creadaEn: "2026-10-16T14:00:00Z" };
    expect((await enviar("natilleras", primero)).status).toBe(201);
    const r = await enviar("natilleras", { ...primero, nombre: "Otro" });
    expect(r.status).toBe(409);
    expect((await r.json()).resultado).toBe("conflicto");
  });

  it("guarda lo nuevo con 201 y responde 200 al repetido, sin caché", async () => {
    const r1 = await enviar("natilleras", natillera);
    expect(r1.status).toBe(201);
    expect(await r1.json()).toEqual({ resultado: "nuevo" });
    expect(r1.headers.get("Cache-Control")).toBe("no-store");
    const r2 = await enviar("natilleras", natillera);
    expect(r2.status).toBe(200);
    expect(await r2.json()).toEqual({ resultado: "repetido" });
    const guardado = JSON.parse(await readFile(path.join(carpeta, "indice.json"), "utf8"));
    expect(guardado.natilleras.nat_01.nombre).toBe("Los del barrio");
  });

  it("tipo desconocido: 404", async () => {
    expect((await enviar("pagos", natillera)).status).toBe(404);
  });

  it("sin llave configurada: 503; llave mala o ausente: 401", async () => {
    expect((await enviar("natilleras", natillera, { llave: "otra" })).status).toBe(401);
    expect((await enviar("natilleras", natillera, { llave: null })).status).toBe(401);
    vi.stubEnv("WEB_INDICE_API_KEY", "");
    const r = await enviar("natilleras", natillera);
    expect(r.status).toBe(503);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });

  it("cuerpo de más de 32 KB: 413", async () => {
    expect((await enviar("natilleras", { ...natillera, relleno: "x".repeat(33 * 1024) })).status).toBe(413);
  });

  it("rechaza sin leer un Content-Length declarado de más de 32 KB", async () => {
    const request = new Request("http://localhost/api/indice/natilleras", {
      method: "POST",
      headers: { "X-Api-Key": LLAVE, "Content-Length": String(64 * 1024) },
      body: JSON.stringify(natillera),
    });
    expect((await POST(request, { params: Promise.resolve({ tipo: "natilleras" }) })).status).toBe(413);
  });

  it("también corta un cuerpo grande que llega en trozos sin Content-Length", async () => {
    const trozo = new TextEncoder().encode("x".repeat(8 * 1024));
    let enviados = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        if (enviados++ < 5) c.enqueue(trozo);
        else c.close();
      },
    });
    const request = new Request("http://localhost/api/indice/natilleras", { method: "POST", headers: { "X-Api-Key": LLAVE }, body, duplex: "half" } as RequestInit);
    expect(request.headers.get("content-length")).toBeNull();
    expect((await POST(request, { params: Promise.resolve({ tipo: "natilleras" }) })).status).toBe(413);
  });

  it("JSON inválido: 400; validación fallida: 400 con errores", async () => {
    expect((await enviar("natilleras", "{ no", { crudo: true })).status).toBe(400);
    const r = await enviar("natilleras", { ...natillera, nombre: "" });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ errores: ["nombre: no puede estar vacío."] });
  });

  it("un error interno da 500 sin detalles", async () => {
    await writeFile(path.join(carpeta, "indice.json"), "{ dañado", "utf8");
    const r = await enviar("natilleras", natillera);
    expect(r.status).toBe(500);
    const cuerpo = JSON.stringify(await r.json());
    expect(cuerpo).not.toContain(carpeta);
    expect(cuerpo).not.toContain("dañado");
    expect(console.error).toHaveBeenCalled();
  });
});

describe("proxy y el índice", () => {
  const sinCookie = (ruta: string) => proxy(new NextRequest(`http://localhost${ruta}`, { method: "POST" }));

  it("deja pasar al bot (sin cookie) solo a /api/indice/", () => {
    expect(sinCookie("/api/indice/natilleras").status).toBe(200);
    expect(sinCookie("/api/indice/natilleras").headers.get("x-middleware-next")).toBe("1");
  });

  it("el resto de /api sigue exigiendo sesión", () => {
    expect(sinCookie("/api/pagos").status).toBe(401);
    expect(sinCookie("/api/indice").status).toBe(401);
    expect(sinCookie("/api/indicex/natilleras").status).toBe(401);
    expect(sinCookie("/api/indice/../pagos").status).toBe(401);
  });

  it("la excepción es solo para POST: un GET a /api/indice/ sin cookie sigue exigiendo sesión", () => {
    expect(proxy(new NextRequest("http://localhost/api/indice/natilleras", { method: "GET" })).status).toBe(401);
  });
});
