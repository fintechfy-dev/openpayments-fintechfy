import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LectorIndice, RegistroDecision, RegistroNatillera, RegistroParticipacion, RegistroSolicitud } from "@/lib/indice/tipos";

import { EVENTOS_CUENTA } from "./eventos-staging.fixtures";
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
    actividades: async () => [],
    solicitudes: async () => [],
    decisiones: async () => [],
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
      MultiploPrestamo: 3,
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
    // Formas reales de staging: currentStateRaw y los parámetros de los eventos.
    expect(fechaStaging({ type: "Date", value: "2026-11-01T00:00:00", assigned: true })).toBe("2026-11-01T17:00:00Z");
    expect(fechaStaging("2026-11-01T00:00:00.0000000")).toBe("2026-11-01T17:00:00Z");
    expect(fechaStaging("2026-10-16T00:00:00.0000000Z")).toBe("2026-10-16T17:00:00Z");
    expect(fechaStaging({ type: "Date", value: null, assigned: false })).toBeUndefined();
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
    const llamada = (f.mock.calls as unknown as [string, RequestInit][]).find(([u]) => u.includes("c-nat"));
    expect(llamada).toBeDefined();
    const [url, init] = llamada!;
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

  it("pagos: sin la API de pagos dice qué falta, en vez de deducir pagos de otro lado", async () => {
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], participaciones), fetch: fetchFalso(contratos) });
    await expect(s.listarPagos()).rejects.toThrow("Falta configurar la API de pagos");
  });

  it("no repite el mismo GET dentro de la ventana de caché (la lista y el detalle piden lo mismo)", async () => {
    const f = fetchFalso(contratos);
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], participaciones), fetch: f });
    await s.listarNatilleras();
    const despuesDeLaLista = f.mock.calls.length;
    await s.obtenerNatillera("nat-1");
    expect(f.mock.calls.length - despuesDeLaLista).toBe(0);
  });

  it("bitácora: si fallan las actividades, igual muestra lo de la cuenta", async () => {
    const f = fetchFalso({ ...contratos, "c-nat/1/events": EVENTOS_CUENTA }, { "c-act/events": 500 });
    const indice = { ...indiceCon([natillera], []), actividades: async () => [{ natilleraId: "nat-1", actividadId: "a-1", contractId: "c-act", descripcion: "Rifa", obligaciones: [] }] };
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice, fetch: f });
    expect(await s.listarBitacora()).toHaveLength(2);
    expect(registrado()).toContain("Bitácora de nat-1 sin actividades");
  });

  it("bitácora: lee los eventos de la cuenta y el administrador sale del índice", async () => {
    const f = fetchFalso({ ...contratos, "c-nat/1/events": EVENTOS_CUENTA });
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], []), fetch: f });
    const bitacora = await s.listarBitacora();
    expect(bitacora.map((b) => b.accion)).toEqual(["Se validó un participante", "Creó la natillera"]);
    expect(bitacora[1]).toMatchObject({ actor: "Doña Rosa", natilleraNombre: "Natillera del barrio" });
  });

  describe("con la tabla de contratos del motor (/api/contracts/table)", () => {
    // La tabla responde por plantilla; los contratos, por id. Como lo hace staging (16 oct).
    function fetchConTabla(tablas: Record<string, unknown[]>, falla = false) {
      const porId = fetchFalso(contratos);
      return vi.fn(async (url: string | URL | Request) => {
        const u = new URL(String(url));
        if (u.pathname.endsWith("/api/contracts/table")) {
          if (falla) return new Response("{}", { status: 500 });
          return new Response(JSON.stringify({ items: tablas[u.searchParams.get("templateName") ?? ""] ?? [], hasMore: false }), { status: 200 });
        }
        return porId(url);
      });
    }
    const filaNatillera = { contractId: "c-nat/1", createdAt: "2026-10-16T22:00:00Z", concepts: { NatilleraId: "nat-1", NombreNatillera: "Del motor" } };
    const filaParticipacion = (id: string, contractId: string, telegram: string) => ({ contractId, concepts: { ParticipacionId: id, NatilleraId: "nat-1", ParticipanteId: telegram, WalletParticipante: "$motor" } });

    it("el superadmin ve las natilleras del motor aunque el índice esté vacío", async () => {
      const f = fetchConTabla({ "natillera-cuenta": [filaNatillera], "natillera-participacion": [filaParticipacion("p-1", "c-p1", "111")] });
      const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([], []), fetch: f });
      const [n] = await s.listarNatilleras();
      expect(n).toMatchObject({ id: "nat-1", nombre: "Natillera del barrio", administrador: "Sin registrar", numeroParticipantes: 1 });
      const detalle = await s.obtenerNatillera("nat-1");
      expect(detalle?.participantes[0]).toMatchObject({ id: "p-1", nombre: "Telegram 111" });
    });

    it("el índice pone lo que el motor no guarda: administrador y nombres", async () => {
      const f = fetchConTabla({ "natillera-cuenta": [filaNatillera], "natillera-participacion": [filaParticipacion("p-1", "c-p1", "111"), filaParticipacion("p-2", "c-p2", "222")] });
      const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], participaciones.slice(0, 1)), fetch: f });
      const detalle = await s.obtenerNatillera("nat-1");
      expect(detalle).toMatchObject({ administrador: "Doña Rosa", administradorTelegramId: "10" });
      expect(detalle?.participantes.map((p) => p.nombre)).toEqual(["Ana", "Telegram 222"]);
    });

    it("si la tabla falla, sigue con el índice y lo registra", async () => {
      const f = fetchConTabla({}, true);
      const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], []), fetch: f });
      expect(await s.listarNatilleras()).toHaveLength(1);
      expect(registrado()).toContain("se usa solo el índice");
      expect(registrado()).not.toContain(TOKEN);
    });
  });

  it("pagos: con la API de pagos sale su registro, con la referencia ubicada en su natillera", async () => {
    const registro = vi.fn(async () => [
      { id: "op-1", tipo: "cuota", referencia: "p-1", monto: 50000, estado: "completado", creado: "2026-10-16T20:00:00Z", etapas: { solicitud: { en: "2026-10-16T20:00:00Z" }, finalizacion: { en: "2026-10-16T20:00:05Z", estado: "completado" } } },
    ]);
    const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice: indiceCon([natillera], participaciones), fetch: fetchFalso(contratos), pagos: { registro, salud: vi.fn() } });
    const [p] = await s.listarPagos();
    expect(p).toMatchObject({ id: "op-1", natilleraId: "nat-1", natilleraNombre: "Nombre del índice", participanteNombre: "Ana", estado: "completado" });
    expect(registro).toHaveBeenCalledOnce();
  });

  describe("créditos reales", () => {
    const solicitud: RegistroSolicitud = { solicitudId: "sol-1", natilleraId: "nat-1", participacionId: "p-1", montoMaximo: 150000, montoSolicitado: 100000, plazoMeses: 3, fechaSolicitud: "2026-10-16T20:00:00Z" };
    const conWallet = { ...contratos, "c-p1": { currentStateRaw: { ...(contratos["c-p1"] as { currentStateRaw: object }).currentStateRaw, ParticipanteId: "111" } } };

    /** Staging falso: contratos por id, la tabla de créditos y POST /api/contracts. */
    function fetchCreditos(creditos: unknown[] = [], estadoPost: number | "sin-respuesta" | "sin-conexion" = 201) {
      const porId = fetchFalso(conWallet);
      return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const u = new URL(String(url));
        if (init?.method === "POST" && estadoPost === "sin-respuesta") throw new Error("socket hang up");
        if (init?.method === "POST" && estadoPost === "sin-conexion") throw new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } });
        const estado = estadoPost as number;
        if (init?.method === "POST") return new Response(JSON.stringify(estado < 300 ? { contractId: "c-cred-1" } : { detail: "rechazado" }), { status: estado });
        if (u.pathname.endsWith("/api/contracts/table")) {
          const items = u.searchParams.get("templateName") === "natillera-credito-ahorro" ? creditos : [];
          return new Response(JSON.stringify({ items, hasMore: false }), { status: 200 });
        }
        return porId(url);
      });
    }
    function montar(opc: { creditos?: unknown[]; decisiones?: RegistroDecision[]; tasa?: number; estadoPost?: number | "sin-respuesta" | "sin-conexion" } = {}) {
      const guardadas: RegistroDecision[] = [...(opc.decisiones ?? [])];
      const indice = { ...indiceCon([natillera], participaciones), solicitudes: async () => [solicitud], decisiones: async () => guardadas };
      const f = fetchCreditos(opc.creditos, opc.estadoPost);
      const escritor = {
        guardarDecision: vi.fn(async (d: RegistroDecision) => {
          if (guardadas.some((x) => x.solicitudId === d.solicitudId)) return "conflicto" as const;
          guardadas.push(d);
          return "nuevo" as const;
        }),
        quitarDecision: vi.fn(async (id: string) => {
          const i = guardadas.findIndex((x) => x.solicitudId === id);
          if (i >= 0) guardadas.splice(i, 1);
        }),
      };
      const s = crearServicioStaging({ urlBase: URL_BASE, token: TOKEN, indice, fetch: f, decisiones: escritor, tasaMensualCredito: opc.tasa });
      return { s, f, escritor, guardadas };
    }

    it("una solicitud del bot sin respuesta: por responder, con la tasa configurada y sin cuota todavía", async () => {
      const { s } = montar({ tasa: 2 });
      const [c] = await s.listarSolicitudesCredito();
      expect(c).toMatchObject({ id: "sol-1", estado: "solicitado", participanteNombre: "Ana", natilleraNombre: "Natillera del barrio", tasaMensualPct: 2, cuotaMensual: null, cuotasAlDia: 1 });
    });

    it("aprobar crea el contrato natillera-credito-ahorro con los parámetros del motor y guarda la decisión", async () => {
      const { s, f, guardadas } = montar({ tasa: 2 });
      expect(await s.responderSolicitud("sol-1", "aprobar", "Doña Rosa")).toMatchObject({ estado: "por_desembolsar" });
      const post = (f.mock.calls as unknown as [string, RequestInit?][]).find(([, init]) => init?.method === "POST")!;
      expect(post[0]).toBe("https://staging.ejemplo/api/contracts");
      const cuerpo = JSON.parse(String(post[1]!.body));
      expect(cuerpo.templateName).toBe("natillera-credito-ahorro");
      expect(cuerpo.parameters).toMatchObject({
        CreditoId: { type: "Text", value: "sol-1" },
        ParticipanteId: { type: "Text", value: "111" },
        WalletParticipante: { type: "Text", value: "$staging/ana" },
        Capital: { type: "Currency", value: 100000 },
        TasaMensual: { type: "Percentage", value: 0.02 },
        PlazoMeses: { type: "Integer", value: 3 },
      });
      expect(cuerpo.parameters.FechaInicio.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(guardadas[0]).toMatchObject({ solicitudId: "sol-1", decision: "aprobada", creditoId: "sol-1", respondio: "Doña Rosa" });
    });

    it("sin tasa configurada no aprueba ni escribe en staging; no aprobar sí se puede", async () => {
      const { s, f, guardadas } = montar();
      await expect(s.responderSolicitud("sol-1", "aprobar")).rejects.toThrow("CREDITO_TASA_MENSUAL");
      expect((f.mock.calls as unknown as [string, RequestInit?][]).some(([, init]) => init?.method === "POST")).toBe(false);
      expect(await s.responderSolicitud("sol-1", "no_aprobar")).toMatchObject({ estado: "rechazado" });
      expect(guardadas[0]).toMatchObject({ decision: "no_aprobada" });
    });

    it("si staging rechaza el contrato, no se guarda la decisión y el error no lleva el token", async () => {
      const { s, guardadas } = montar({ tasa: 2, estadoPost: 403 });
      const error = await s.responderSolicitud("sol-1", "aprobar").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ErrorServicio);
      expect(String((error as Error).message)).not.toContain(TOKEN);
      expect(guardadas).toHaveLength(0);
    });

    it("dos aprobaciones a la vez crean un solo contrato (cada contrato desembolsa)", async () => {
      const { s, f } = montar({ tasa: 2 });
      const resultados = await Promise.allSettled([s.responderSolicitud("sol-1", "aprobar"), s.responderSolicitud("sol-1", "aprobar")]);
      const posts = (f.mock.calls as unknown as [string, RequestInit?][]).filter(([, init]) => init?.method === "POST");
      expect(posts).toHaveLength(1);
      expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const fallo = resultados.find((r) => r.status === "rejected") as PromiseRejectedResult;
      expect(fallo.reason).toMatchObject({ codigo: "ya_respondida" });
    });

    it("si staging no responde al crear el contrato, la reserva se queda y se avisa que no se sabe", async () => {
      const { s, guardadas } = montar({ tasa: 2, estadoPost: "sin-respuesta" });
      await expect(s.responderSolicitud("sol-1", "aprobar")).rejects.toMatchObject({ codigo: "credito_incierto" });
      expect(guardadas).toHaveLength(1);
      await expect(s.responderSolicitud("sol-1", "aprobar")).rejects.toMatchObject({ codigo: "ya_respondida" });
    });

    it("un 5xx no da certeza: la reserva se queda; sin conexión, la petición no salió y se suelta", async () => {
      const conProxy = montar({ tasa: 2, estadoPost: 504 });
      await expect(conProxy.s.responderSolicitud("sol-1", "aprobar")).rejects.toMatchObject({ codigo: "credito_incierto" });
      expect(conProxy.guardadas).toHaveLength(1);

      const sinRed = montar({ tasa: 2, estadoPost: "sin-conexion" });
      await expect(sinRed.s.responderSolicitud("sol-1", "aprobar")).rejects.toMatchObject({ codigo: "sin_conexion" });
      expect(sinRed.guardadas).toHaveLength(0);
    });

    it("una solicitud respondida no se responde otra vez", async () => {
      const { s } = montar({ tasa: 2, decisiones: [{ solicitudId: "sol-1", decision: "no_aprobada", respondio: "x", fecha: "2026-10-16T21:00:00Z" }] });
      expect((await s.listarSolicitudesCredito())[0]?.estado).toBe("rechazado");
      await expect(s.responderSolicitud("sol-1", "aprobar")).rejects.toThrow(ErrorServicio);
    });

    it("el estado sale del contrato del motor cuando ya existe", async () => {
      const credito = { contractId: "c-cred-1", createdAt: "2026-10-16T21:00:00Z", concepts: { CreditoId: "sol-1", ParticipacionId: "p-1", EstadoCredito: "2", TasaMensual: "0.02", CuotaMensual: "34675" } };
      const { s } = montar({ creditos: [credito], decisiones: [{ solicitudId: "sol-1", decision: "aprobada", creditoId: "sol-1", respondio: "x", fecha: "2026-10-16T21:00:00Z" }] });
      expect((await s.listarSolicitudesCredito())[0]).toMatchObject({ estado: "en_mora", tasaMensualPct: 2, cuotaMensual: 34675 });
    });
  });
});
