import { describe, expect, it } from "vitest";

import { ESCENARIO_PRUEBA, ESTADOS_PRUEBA, estadoCreditoDeStaging, solicitudesDePrueba, type NatilleraParaCreditos } from "./creditos-prueba";

const AHORA = new Date("2026-10-16T23:00:00Z");

function natillera(id: string, participantes: NatilleraParaCreditos["participantes"], multiploPrestamo = 3): NatilleraParaCreditos {
  return { id, nombre: `Natillera ${id}`, valorCuota: 50000, multiploPrestamo, cuotasTotales: 2, periodoActual: 1, participantes };
}
const persona = (id: string, estado: NatilleraParaCreditos["participantes"][number]["estado"] = "validado", cuotasPagadas = 0) => ({ id, nombre: `Persona ${id}`, estado, cuotasPagadas });

describe("solicitudesDePrueba", () => {
  it("con suficientes participantes hay un crédito en cada estado, en orden", () => {
    const n = natillera("a", Array.from({ length: 9 }, (_, i) => persona(`p${i}`)));
    const s = solicitudesDePrueba([n], AHORA);
    expect(s.map((x) => x.estado)).toEqual(ESTADOS_PRUEBA);
    expect(new Set(s.map((x) => x.estado))).toEqual(new Set(["solicitado", "por_desembolsar", "al_dia", "en_mora", "pagado", "rechazado", "descontado"]));
  });

  it("usa el tope del contrato (N × cuota) y los montos de ejemplo fijos", () => {
    const [s] = solicitudesDePrueba([natillera("a", [persona("p", "activo", 1)])], AHORA);
    expect(s).toMatchObject({ montoMaximo: 150000, ...ESCENARIO_PRUEBA, cuotasAlDia: 1, cuotasTotales: 2, cuotasPendientes: 0 });
  });

  it("solo pide quien ya autorizó el cobro, y no si el tope no alcanza el monto de ejemplo", () => {
    expect(solicitudesDePrueba([natillera("a", [persona("p", "por_validar")])], AHORA)).toEqual([]);
    expect(solicitudesDePrueba([natillera("a", [persona("p")], 1)], AHORA)).toEqual([]);
  });

  it("las por responder no tienen fecha de respuesta; las demás sí, después de pedirse", () => {
    const s = solicitudesDePrueba([natillera("a", Array.from({ length: 4 }, (_, i) => persona(`p${i}`)))], AHORA);
    expect(s[0]!.fechaRespuesta).toBeNull();
    expect(s[2]!.fechaRespuesta! > s[2]!.fechaSolicitud).toBe(true);
    expect(s[0]!.fechaSolicitud > s[1]!.fechaSolicitud).toBe(true);
  });

  it("los ids son estables entre lecturas (la respuesta de la financiera se guarda por id)", () => {
    const n = natillera("a", [persona("p")]);
    expect(solicitudesDePrueba([n], AHORA)[0]!.id).toBe(solicitudesDePrueba([n], new Date())[0]!.id);
  });
});

describe("estadoCreditoDeStaging", () => {
  it("traduce EstadoCredito del contrato por número o por nombre", () => {
    expect([0, 1, 2, 3].map(estadoCreditoDeStaging)).toEqual(["por_desembolsar", "al_dia", "en_mora", "pagado"]);
    expect(estadoCreditoDeStaging("MORA")).toBe("en_mora");
    expect(estadoCreditoDeStaging("2")).toBe("en_mora");
    expect(estadoCreditoDeStaging(9)).toBeNull();
  });
});
