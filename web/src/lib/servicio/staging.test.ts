import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LectorIndice, RegistroNatillera, RegistroParticipacion } from "@/lib/indice/tipos";

import { ErrorServicio } from "./http";
import {
  crearServicioStaging,
  estadoNatillera,
  estadoParticipacion,
  fechaStaging,
  leerNumero,
  leerTexto,
  porcentajeDeFraccion,
} from "./staging";

const TOKEN = "jwt-de-prueba-que-no-debe-salir";
const URL_BASE = "https://staging.ejemplo/";

const natillera: RegistroNatillera = {
  natilleraId: "nat-1",
  contractId: "c-nat/1",
  nombre: "Nombre del índice",
  administrador: { telegramId: "10", nombre: "Doña Rosa" },
  creadaEn: "2026-10-16T14:00:00Z",
};

const participaciones: RegistroParticipacion[] = [
  { natilleraId: "nat-1", participacionId: "p-1", contractId: "c-p1", nombre: "Ana", telegramId: "1", billetera: "$indice/ana" },
  { natilleraId: "nat-1", participacionId: "p-2", contractId: "c-p2", nombre: "Beto", telegramId: "2", billetera: "$indice/beto" },
  { natilleraId: "nat-1", participacionId: "p-3", contractId: "c-p3", nombre: "Caro", telegramId: "3", billetera: "$indice/caro" },
];

function indiceCon(nats: RegistroNatillera[], parts: RegistroParticipacion[]): LectorIndice {
  return {
    natilleras: async () => nats,
    natillera: async (id) => nats.find((n) => n.natilleraId === id) ?? null,
    participaciones: async (id) => parts.filter((p) => p.natilleraId === id),
  };
}

const contratos: Record<string, unknown> = {
  "c-nat/1": {
    currentStateRaw: {
      NombreNatillera: { type: "Text", value: "Natillera del barrio" },
      EstadoNatillera: 2,
      ValorCuota: "50000",
      PeriodicidadMeses: 1,
      FechaInicio: "2026-10-01",
      FechaFinal: { type: "Date", value: "2027-09-01" },
      NumeroCuotas: 12,
      PeriodoActual: 1,
      CupoMinimo: 3,
      SaldoNatillera: 150000,
      FechaProximoCobro: "",
      PorcentajeMoraDiaria: { type: "Percentage", value: 0.025 },
    },
    currentStateLabels: { EstadoNatillera: "ACTIVA" },
  },
  "c-p1": {
    currentStateRaw: { EstadoParticipacion: "MORA", CuotasPagadas: 1, TotalAportado: 50000, DeudaCuotas: 50000, MoraAcumulada: "1250", WalletParticipante: "$staging/ana" },
  },
  "c-p2": { currentStateRaw: { EstadoParticipacion: 2, CuotasPagadas: 2, TotalAportado: 100000, DeudaCuotas: 0, MoraAcumulada: 0 } },
  "c-p3": { currentStateRaw: { EstadoParticipacion: { type: "Integer", value: 3 }, DeudaCuotas: 50000 } },
};

function fetchFalso(respuestas: Record<string, unknown>, estados: Record<string, number> = {}) {
  return vi.fn(async (url: string | URL | Request) => {
    const id = decodeURIComponent(String(url).split("/api/contracts/")[1] ?? "");
    const estado = estados[id] ?? (id in respuestas ? 200 : 404);
    return new Response(JSON.stringify(respuestas[id] ?? {}), { status: estado });
  });
}

let errores: ReturnType<typeof vi.spyOn>;
let avisos: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errores = vi.spyOn(console, "error").mockImplementation(() => {});
  avisos = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

function registrado(): string {
  return [...errores.mock.calls, ...avisos.mock.calls].flat().map(String).join("\n");
}

describe("lectura tolerante de valores", () => {
  it("lee números crudos, como texto y tipados", () => {
    expect(leerNumero(5000)).toBe(5000);
    expect(leerNumero("5000")).toBe(5000);
    expect(leerNumero({ type: "Currency", value: 5000 })).toBe(5000);
    expect(leerNumero({ type: "Currency", value: "5000" })).toBe(5000);
    expect(leerNumero("")).toBeUndefined();
    expect(leerNumero("ACTIVA")).toBeUndefined();
    expect(leerNumero(undefined)).toBeUndefined();
  });

  it("lee textos crudos y tipados", () => {
    expect(leerTexto("ACTIVA")).toBe("ACTIVA");
    expect(leerTexto({ type: "Text", value: "nat-001" })).toBe("nat-001");
    expect(leerTexto("  ")).toBeUndefined();
  });
});

describe("estados", () => {
  it.each([
    [0, "CREADA", "creada"],
    [1, "INICIADA", "iniciada"],
    [2, "ACTIVA", "activa"],
    [3, "LIQUIDANDO", "liquidando"],
    [4, "REEMBOLSANDO", "liquidando"],
    [5, "CERRADA", "cerrada"],
    [6, "CERRADA_SIN_CUPO", "cerrada"],
  ])("EstadoNatillera %s / %s → %s", (num, nombre, esperado) => {
    expect(estadoNatillera(num)).toBe(esperado);
    expect(estadoNatillera(String(num))).toBe(esperado);
    expect(estadoNatillera(nombre)).toBe(esperado);
    expect(estadoNatillera({ type: "Text", value: nombre })).toBe(esperado);
  });

  it.each([
    [0, "PENDIENTE_VALIDACION", "por_validar"],
    [1, "VALIDADA", "validado"],
    [2, "ACTIVA", "activo"],
    [3, "MORA", "en_mora"],
    [4, "EN_LIQUIDACION", "activo"],
    [5, "EN_REEMBOLSO", "activo"],
    [6, "LIQUIDADA", "liquidado"],
    [7, "REEMBOLSADA", "liquidado"],
  ])("EstadoParticipacion %s / %s → %s", (num, nombre, esperado) => {
    expect(estadoParticipacion(num)).toBe(esperado);
    expect(estadoParticipacion(nombre)).toBe(esperado);
    expect(estadoParticipacion({ type: "Integer", value: num })).toBe(esperado);
  });

  it("un estado desconocido da el neutro y se registra, sin lanzar", () => {
    expect(estadoNatillera(9)).toBe("creada");
    expect(estadoNatillera("RARO")).toBe("creada");
    expect(estadoParticipacion(8)).toBe("por_validar");
    expect(estadoParticipacion(undefined)).toBe("por_validar");
    expect(errores).toHaveBeenCalledTimes(4);
  });
});

describe("fechas y porcentajes", () => {
  it("AAAA-MM-DD pasa a mediodía de Bogotá; con hora se deja igual", () => {
    expect(fechaStaging("2026-10-16")).toBe("2026-10-16T17:00:00Z");
    expect(fechaStaging({ type: "Date", value: "2026-10-16" })).toBe("2026-10-16T17:00:00Z");
    expect(fechaStaging("2026-10-16T09:30:00Z")).toBe("2026-10-16T09:30:00Z");
    expect(fechaStaging("")).toBeUndefined();
  });

  it("el porcentaje de staging es una fracción", () => {
    expect(porcentajeDeFraccion(0.01)).toBe(1);
    expect(porcentajeDeFraccion(0.025)).toBe(2.5);
    expect(porcentajeDeFraccion(0.0033)).toBe(0.33);
  });
});

describe("crearServicioStaging", () => {
  it("manda Authorization: Bearer, sin caché, a la URL del contrato codificada", async () => {
    const f = fetchFalso(contratos);
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], []), fetch: f });
    await s.listarNatilleras();
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://staging.ejemplo/api/contracts/c-nat%2F1");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("arma el resumen de la lista desde staging y el índice", async () => {
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], participaciones), fetch: fetchFalso(contratos) });
    const [r] = await s.listarNatilleras();
    expect(r).toEqual({
      id: "nat-1",
      nombre: "Natillera del barrio",
      estado: "activa",
      administrador: "Doña Rosa",
      administradorTelegramId: "10",
      valorCuota: 50000,
      periodicidad: "mensual",
      fechaInicio: "2026-10-01T17:00:00Z",
      fechaFinal: "2027-09-01T17:00:00Z",
      cuotasTotales: 12,
      periodoActual: 1,
      cupoMinimo: 3,
      numeroParticipantes: 3,
      participantesEnMora: 2,
      saldoCustodia: 150000,
      proximoCobro: null,
    });
  });

  it("una natillera con un dato malo se omite y las demás se muestran; si fallan todas, se ve el error", async () => {
    const otra: RegistroNatillera = { ...natillera, natilleraId: "nat-2", contractId: "c-nat-2" };
    const raw = (contratos["c-nat/1"] as { currentStateRaw: object }).currentStateRaw;
    const respuestas = { ...contratos, "c-nat-2": { currentStateRaw: { ...raw, ValorCuota: { type: "Currency", value: null } } } };
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera, otra], []), fetch: fetchFalso(respuestas) });
    expect((await s.listarNatilleras()).map((n) => n.id)).toEqual(["nat-1"]);
    expect(registrado()).toContain("nat-2");

    const soloMala = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([otra], []), fetch: fetchFalso(respuestas) });
    await expect(soloMala.listarNatilleras()).rejects.toThrow(/no tiene ValorCuota/);
  });

  it("NumeroCuotas sale de la cuenta o, si no lo trae, de sus participaciones; sin ninguna, 0", async () => {
    const raw = { ...(contratos["c-nat/1"] as { currentStateRaw: Record<string, unknown> }).currentStateRaw };
    delete raw.NumeroCuotas;
    const cuenta = { "c-nat/1": { currentStateRaw: raw } };
    const conParticipacion = { ...contratos, ...cuenta, "c-p2": { currentStateRaw: { EstadoParticipacion: 2, NumeroCuotas: { type: "Integer", value: 10 } } } };
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], participaciones), fetch: fetchFalso(conParticipacion) });
    expect((await s.listarNatilleras())[0]?.cuotasTotales).toBe(10);

    const sinNinguna = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], []), fetch: fetchFalso(cuenta) });
    expect((await sinNinguna.listarNatilleras())[0]?.cuotasTotales).toBe(0);
    expect(registrado()).toContain("NumeroCuotas");
  });

  it("sin NombreNatillera usa el nombre del índice", async () => {
    const sinNombre = { "c-nat/1": { currentStateRaw: { ...(contratos["c-nat/1"] as { currentStateRaw: object }).currentStateRaw, NombreNatillera: "" } } };
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], []), fetch: fetchFalso(sinNombre) });
    expect((await s.listarNatilleras())[0]?.nombre).toBe("Nombre del índice");
  });

  it("sin FechaInicio lanza un error claro en vez de inventar una fecha", async () => {
    const sinFecha = { "c-nat/1": { currentStateRaw: { ...(contratos["c-nat/1"] as { currentStateRaw: object }).currentStateRaw, FechaInicio: "" } } };
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], []), fetch: fetchFalso(sinFecha) });
    await expect(s.listarNatilleras()).rejects.toThrow(/no tiene FechaInicio/);
  });

  it("el detalle trae mora en %, billetera del grupo y participantes con deuda = cuotas + mora", async () => {
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], participaciones), fetch: fetchFalso(contratos) });
    const n = await s.obtenerNatillera("nat-1");
    expect(n?.moraDiariaPct).toBe(2.5);
    expect(n?.billeteraGrupo).toBe("Por registrar");
    expect(n?.participantes).toEqual([
      { id: "p-1", nombre: "Ana", billetera: "$staging/ana", estado: "en_mora", cuotasPagadas: 1, aportado: 50000, deuda: 51250 },
      { id: "p-2", nombre: "Beto", billetera: "$indice/beto", estado: "activo", cuotasPagadas: 2, aportado: 100000, deuda: 0 },
      { id: "p-3", nombre: "Caro", billetera: "$indice/caro", estado: "en_mora", cuotasPagadas: 0, aportado: 0, deuda: 50000 },
    ]);
  });

  it("usa la billetera del grupo del índice si la tiene", async () => {
    const conBilletera = { ...natillera, billeteraGrupo: "$financiera/grupo" };
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([conBilletera], []), fetch: fetchFalso(contratos) });
    expect((await s.obtenerNatillera("nat-1"))?.billeteraGrupo).toBe("$financiera/grupo");
  });

  it("un contrato que no existe (404) se omite de la lista y da null en el detalle", async () => {
    const huerfana: RegistroNatillera = { ...natillera, natilleraId: "nat-2", contractId: "c-no-existe" };
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera, huerfana], []), fetch: fetchFalso(contratos) });
    expect((await s.listarNatilleras()).map((n) => n.id)).toEqual(["nat-1"]);
    expect(await s.obtenerNatillera("nat-2")).toBeNull();
    expect(await s.obtenerNatillera("nat-que-no-esta")).toBeNull();
    expect(errores).toHaveBeenCalled();
    expect(registrado()).not.toContain(TOKEN);
  });

  it("otro fallo lanza ErrorServicio con el código y sin el token", async () => {
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], []), fetch: fetchFalso(contratos, { "c-nat/1": 500 }) });
    const error = await s.listarNatilleras().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorServicio);
    expect((error as ErrorServicio).estadoHttp).toBe(500);
    expect((error as Error).message).toContain("500");
    expect((error as Error).message).not.toContain(TOKEN);
  });

  it("un error de red que mencione el token no lo deja salir", async () => {
    const f = vi.fn(async () => {
      throw new TypeError(`fetch failed: Bearer ${TOKEN}`);
    });
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], []), fetch: f });
    const error = await s.obtenerNatillera("nat-1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorServicio);
    expect((error as Error).message).not.toContain(TOKEN);
    expect(registrado()).not.toContain(TOKEN);
  });

  it("las pantallas sin conectar avisan con #53", async () => {
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([], []), fetch: fetchFalso({}) });
    await expect(s.listarPagos()).rejects.toThrow("#53");
    await expect(s.listarBitacora()).rejects.toThrow(ErrorServicio);
    await expect(s.listarSolicitudesCredito()).rejects.toThrow(ErrorServicio);
    await expect(s.responderSolicitud("x", "aprobar")).rejects.toThrow(ErrorServicio);
  });
});
