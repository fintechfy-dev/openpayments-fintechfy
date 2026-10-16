import { describe, expect, it } from "vitest";
import { leerEventos } from "./eventos-staging";
import { EVENTOS_PARTICIPACION } from "./eventos-staging.fixtures";

describe("leerEventos", () => {
  const eventos = leerEventos("c-part", EVENTOS_PARTICIPACION);

  it("lee los eventos reales en orden de secuencia", () => {
    expect(eventos.map((e) => e.funcion)).toEqual([null, "ConfirmarAutorizacion", "CobrarCuota", "PrimeraCuotaCobrada"]);
    expect(eventos[0]).toMatchObject({ contractId: "c-part", secuencia: 1, tipo: "Initialized" });
  });

  it("quita el envoltorio de los parámetros, que llegan como texto JSON", () => {
    expect(eventos[3]!.parametros).toEqual({ Periodo: 1, CurrentDate: "2026-10-16T00:00:00.0000000Z", MontoCobrado: 50000 });
  });

  it("guarda los cambios y quién lo pidió (null si fue el motor)", () => {
    expect(eventos[1]!.cambios).toContainEqual({ concepto: "EstadoParticipacion", antes: "0", despues: "1" });
    expect(eventos[1]!.actor).toBe("user_prueba");
    expect(eventos[3]!.actor).toBeNull();
  });

  it("ordena aunque lleguen desordenados y descarta lo que no es un evento", () => {
    const cuerpo = { events: [{ sequenceNumber: 2, occurredAt: "2026-10-16T01:00:00Z" }, { nada: 1 }, { sequenceNumber: 1, occurredAt: "2026-10-16T00:00:00Z" }] };
    expect(leerEventos("c", cuerpo).map((e) => e.secuencia)).toEqual([1, 2]);
    expect(leerEventos("c", { error: "x" })).toEqual([]);
  });
});
