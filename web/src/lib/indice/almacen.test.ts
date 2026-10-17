import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { crearAlmacen, IndiceCorrupto } from "./almacen";
import type { RegistroNatillera, RegistroParticipacion } from "./tipos";

let carpeta: string;
let ruta: string;

beforeEach(async () => {
  carpeta = await mkdtemp(path.join(tmpdir(), "indice-"));
  ruta = path.join(carpeta, "sub", "indice.json");
});
afterEach(() => rm(carpeta, { recursive: true, force: true }));

const natillera = (natilleraId: string, nombre = "Los del barrio"): RegistroNatillera => ({
  natilleraId,
  contractId: `c-${natilleraId}`,
  nombre,
  administrador: { telegramId: "1", nombre: "Andrés" },
  creadaEn: "2026-10-16T09:00:00-05:00",
});
const participacion = (participacionId: string, natilleraId: string): RegistroParticipacion => ({
  natilleraId,
  participacionId,
  contractId: `c-${participacionId}`,
  nombre: "Luz",
  telegramId: "9",
  billetera: "https://w/luz",
});

describe("almacén del índice", () => {
  it("sin archivo, el índice está vacío; al guardar crea la carpeta", async () => {
    const almacen = crearAlmacen(ruta);
    expect(await almacen.natilleras()).toEqual([]);
    expect(await almacen.natillera("n1")).toBeNull();
    expect(await almacen.guardar("natilleras", natillera("n1"))).toBe("nuevo");
    expect(JSON.parse(await readFile(ruta, "utf8"))).toEqual({ natilleras: { n1: natillera("n1") }, participaciones: {}, actividades: {}, solicitudes: {}, decisiones: {} });
  });

  it("un id repetido con los mismos datos responde «repetido»; con otros, «conflicto», y no sobrescribe", async () => {
    const almacen = crearAlmacen(ruta);
    await almacen.guardar("natilleras", natillera("n1", "Original"));
    expect(await almacen.guardar("natilleras", natillera("n1", "Original"))).toBe("repetido");
    expect(await almacen.guardar("natilleras", natillera("n1", "Otro nombre"))).toBe("conflicto");
    expect((await almacen.natillera("n1"))?.nombre).toBe("Original");
  });

  it("el mismo id en otro tipo no cuenta como repetido", async () => {
    const almacen = crearAlmacen(ruta);
    await almacen.guardar("natilleras", natillera("x1"));
    expect(await almacen.guardar("participaciones", participacion("x1", "x1"))).toBe("nuevo");
  });

  it("muchas escrituras seguidas no se pisan, y solo una gana con el mismo id", async () => {
    const almacen = crearAlmacen(ruta);
    const otro = crearAlmacen(ruta);
    const resultados = await Promise.all([
      ...Array.from({ length: 20 }, (_, i) => (i % 2 ? almacen : otro).guardar("natilleras", natillera(`n${i}`))),
      almacen.guardar("natilleras", natillera("dup")),
      otro.guardar("natilleras", natillera("dup")),
    ]);
    expect(resultados.slice(-2).sort()).toEqual(["nuevo", "repetido"]);
    expect(await almacen.natilleras()).toHaveLength(21);
    expect((await readdir(path.dirname(ruta))).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("persiste: un almacén nuevo sobre el mismo archivo ve lo guardado", async () => {
    const primero = crearAlmacen(ruta);
    await primero.guardar("natilleras", natillera("n1"));
    await primero.guardar("participaciones", participacion("p1", "n1"));
    await primero.guardar("participaciones", participacion("p2", "n2"));
    const despues = crearAlmacen(ruta);
    expect(await despues.natillera("n1")).toEqual(natillera("n1"));
    expect(await despues.participaciones("n1")).toEqual([participacion("p1", "n1")]);
    expect(await despues.guardar("natilleras", natillera("n1"))).toBe("repetido");
  });

  it("un id como __proto__ se guarda como uno más", async () => {
    const almacen = crearAlmacen(ruta);
    expect(await almacen.guardar("natilleras", natillera("__proto__"))).toBe("nuevo");
    expect(await crearAlmacen(ruta).natillera("__proto__")).toEqual(natillera("__proto__"));
    expect(await almacen.guardar("natilleras", natillera("__proto__"))).toBe("repetido");
  });

  it("un archivo dañado lanza un error claro y no se borra", async () => {
    await crearAlmacen(ruta).guardar("natilleras", natillera("n1"));
    await writeFile(ruta, "{ esto no es json", "utf8");
    const almacen = crearAlmacen(ruta);
    await expect(almacen.natilleras()).rejects.toThrow(IndiceCorrupto);
    await expect(almacen.guardar("natilleras", natillera("n2"))).rejects.toThrow(/está dañado/);
    expect(await readFile(ruta, "utf8")).toBe("{ esto no es json");

    await writeFile(ruta, JSON.stringify({ natilleras: [] }), "utf8");
    await expect(almacen.natilleras()).rejects.toThrow(/«natilleras» no es un objeto/);
  });

  it("después de un error la cola sigue funcionando", async () => {
    await crearAlmacen(ruta).guardar("natilleras", natillera("n1"));
    await writeFile(ruta, "[]", "utf8");
    const almacen = crearAlmacen(ruta);
    await expect(almacen.guardar("natilleras", natillera("n2"))).rejects.toThrow(IndiceCorrupto);
    await writeFile(ruta, "{}", "utf8");
    expect(await almacen.guardar("natilleras", natillera("n2"))).toBe("nuevo");
  });

  it("una decisión se guarda una sola vez y sobrevive a recrear el almacén", async () => {
    const almacen = crearAlmacen(ruta);
    const decision = { solicitudId: "sol-1", decision: "no_aprobada" as const, respondio: "Doña Rosa", fecha: "2026-10-16T21:00:00Z" };
    expect(await almacen.guardarDecision(decision)).toBe("nuevo");
    expect(await almacen.guardarDecision({ ...decision, decision: "aprobada" })).toBe("conflicto");
    expect(await crearAlmacen(ruta).decisiones()).toEqual([decision]);
    // Guardar una decisión no borra lo que el bot ya había guardado, ni al revés.
    expect(await almacen.guardar("natilleras", natillera("n1"))).toBe("nuevo");
    expect(await crearAlmacen(ruta).decisiones()).toHaveLength(1);
  });

  it("quitar una decisión la suelta: la solicitud se puede volver a responder", async () => {
    const almacen = crearAlmacen(ruta);
    const reserva = { solicitudId: "sol-1", decision: "aprobada" as const, creditoId: "cred-sol-1", respondio: "x", fecha: "2026-10-16T21:00:00Z" };
    expect(await almacen.guardarDecision(reserva)).toBe("nuevo");
    await almacen.quitarDecision("sol-1");
    expect(await crearAlmacen(ruta).decisiones()).toEqual([]);
    expect(await almacen.guardarDecision(reserva)).toBe("nuevo");
    await almacen.quitarDecision("no-existe");
    expect(await almacen.decisiones()).toHaveLength(1);
  });
});
