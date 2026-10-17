import { describe, expect, it } from "vitest";

import { creditoIdDe, creditosDeStaging, cuerpoContratoCredito, estadoCreditoDeStaging, hoyEnBogota } from "./creditos-staging";

const ubicar = (id: string) =>
  id === "p-1" ? { natilleraId: "nat-1", natilleraNombre: "Los amigos", participanteNombre: "Ana", cuotasAlDia: 1, cuotasTotales: 2, cuotasPendientes: 0 } : null;

describe("estadoCreditoDeStaging", () => {
  it("traduce EstadoCredito del contrato por número o por nombre", () => {
    expect([0, 1, 2, 3].map(estadoCreditoDeStaging)).toEqual(["por_desembolsar", "al_dia", "en_mora", "pagado"]);
    expect(estadoCreditoDeStaging("MORA")).toBe("en_mora");
    expect(estadoCreditoDeStaging("2")).toBe("en_mora");
    expect(estadoCreditoDeStaging(9)).toBeNull();
  });
});

describe("creditosDeStaging", () => {
  it("un crédito del motor que no salió de una solicitud del índice también se ve, con su estado", () => {
    const fila = { contractId: "c-9", creadoEn: "2026-10-16T21:00:00Z", conceptos: { CreditoId: "cred-x", ParticipacionId: "p-1", Capital: "200000", PlazoMeses: "6", EstadoCredito: "1", TasaMensual: "0.025" } };
    const [c] = creditosDeStaging({ solicitudes: [], decisiones: [], creditos: [fila], ubicar });
    expect(c).toMatchObject({ id: "cred-x", participanteNombre: "Ana", montoSolicitado: 200000, plazoMeses: 6, estado: "al_dia", tasaMensualPct: 2.5, cuotaMensual: null });
  });

  it("aprobada pero la tabla todavía no la lista: aprobado, no por responder", () => {
    const solicitud = { solicitudId: "s", natilleraId: "nat-1", participacionId: "p-1", montoMaximo: 1, montoSolicitado: 1, plazoMeses: 1, fechaSolicitud: "2026-10-16T20:00:00Z" };
    const [c] = creditosDeStaging({ solicitudes: [solicitud], decisiones: [{ solicitudId: "s", decision: "aprobada", respondio: "x", fecha: "f" }], creditos: [], ubicar, tasaConfiguradaPct: 2 });
    expect(c).toMatchObject({ estado: "aprobado", tasaMensualPct: null, fechaRespuesta: "f" });
  });
});

describe("cuerpoContratoCredito", () => {
  it("la tasa va como fracción (2 % = 0.02) y el CreditoId sale de la solicitud", () => {
    const solicitud = { solicitudId: "s-1", natilleraId: "nat-1", participacionId: "p-1", montoMaximo: 1, montoSolicitado: 100000, plazoMeses: 3, fechaSolicitud: "x" };
    const c = cuerpoContratoCredito({ solicitud, natilleraId: "nat-real", participanteId: "111", wallet: "$w", tasaMensualPct: 2.5, hoy: "2026-10-16" });
    expect(c.parameters.TasaMensual).toEqual({ type: "Percentage", value: 0.025 });
    expect(c.parameters.CreditoId).toEqual({ type: "Text", value: creditoIdDe("s-1") });
    // La natillera del contrato es la de la participación en staging, no la que dijo el bot.
    expect(c.parameters.NatilleraId).toEqual({ type: "Text", value: "nat-real" });
  });

  it("hoy en Bogotá: a las 11 p. m. del 16 en Bogotá ya es 17 en UTC, pero la fecha sigue siendo 16", () => {
    expect(hoyEnBogota(new Date("2026-10-17T04:00:00Z"))).toBe("2026-10-16");
  });
});
