import { afterEach, describe, expect, it, vi } from "vitest";

import { motivoSimple, pagosDelRegistro, type UbicacionReferencia } from "./registro-pagos";

// Forma de un pago de la API de pagos, escrita a mano según pagos/src/pagos.js (nuevoPago y pago.etapas.*).
const COMPLETADO = {
  id: "11111111-1111-4111-8111-111111111111",
  operacion: "cobrar-cuota",
  tipo: "cuota",
  referencia: "par-1",
  monto: 50000,
  periodo: 1,
  simulado: false,
  estado: "completado",
  creado: "2026-10-16T20:00:00.000Z",
  etapas: {
    solicitud: { en: "2026-10-16T20:00:00.000Z" },
    autorizacion: { en: "2026-10-16T20:00:01.000Z", permisoId: "perm-abc", tipoPermiso: "recurrente", aprobado: true },
    ejecucion: {
      en: "2026-10-16T20:00:02.000Z",
      cobroId: "https://ilp.interledger-test.dev/incoming-payments/aaaa1111",
      cotizacionId: "https://ilp.interledger-test.dev/quotes/bbbb2222",
      pagoSalienteId: "https://ilp.interledger-test.dev/outgoing-payments/cccc3333",
      debitado: { value: "5000000", assetCode: "COP", assetScale: 2 },
      recibido: null,
    },
    finalizacion: { en: "2026-10-16T20:00:05.000Z", estado: "completado", motivo: null },
  },
};

const ANA: UbicacionReferencia = { natilleraId: "nat-1", natilleraNombre: "Los amigos", participanteNombre: "Ana" };
const buscar = (r: string) => (r === "par-1" ? ANA : null);

afterEach(() => vi.restoreAllMocks());

describe("pagosDelRegistro", () => {
  it("un pago real completado: las 4 etapas hechas, con el permiso y los ids de Open Payments", () => {
    const [p] = pagosDelRegistro([COMPLETADO], buscar);
    expect(p).toMatchObject({ id: COMPLETADO.id, tipo: "cuota", direccion: "entrante", monto: 50000, estado: "completado", simulado: false, ...ANA });
    expect(p!.etapas.map((e) => e.estado)).toEqual(["hecha", "hecha", "hecha", "hecha"]);
    expect(p!.etapas[1]!.detalle).toBe("Permiso perm-abc (recurrente)");
    expect(p!.etapas[2]!.detalle).toBe("Cobro …aaaa1111 · Cotización …bbbb2222 · Pago saliente …cccc3333");
    expect(p!.motivo).toBeUndefined();
  });

  it("en curso sin ejecución: la ejecución es la actual y lo demás pendiente", () => {
    const enCurso = { ...COMPLETADO, id: "en-curso", estado: "en-curso", etapas: { ...COMPLETADO.etapas, ejecucion: null, finalizacion: null } };
    const [p] = pagosDelRegistro([enCurso], buscar);
    expect(p!.estado).toBe("autorizado");
    expect(p!.etapas.map((e) => e.estado)).toEqual(["hecha", "hecha", "actual", "pendiente"]);
  });

  it("fallido en la ejecución: ahí se marca la falla y el motivo queda sin lo técnico", () => {
    const fallido = {
      ...COMPLETADO,
      id: "fallido",
      estado: "fallido",
      etapas: { ...COMPLETADO.etapas, ejecucion: null, finalizacion: { en: "2026-10-16T20:00:03.000Z", estado: "fallido", motivo: "Sin fondos o tope del permiso superado: insufficient balance" } },
    };
    const [p] = pagosDelRegistro([fallido], buscar);
    expect(p).toMatchObject({ estado: "fallido", motivo: "Sin fondos o tope del permiso superado" });
    expect(p!.etapas.map((e) => e.estado)).toEqual(["hecha", "hecha", "fallida", "fallida"]);
  });

  it("simulado: se marca y la etapa lo dice", () => {
    const simulado = { ...COMPLETADO, id: "sim", tipo: "desembolso", simulado: true, etapas: { ...COMPLETADO.etapas, autorizacion: { en: "x", simulado: true }, ejecucion: { en: "x", simulado: true } } };
    const [p] = pagosDelRegistro([simulado], buscar);
    expect(p).toMatchObject({ simulado: true, direccion: "saliente" });
    expect(p!.etapas[2]!.detalle).toBe("Simulada: no pasó por Open Payments");
  });

  it("basta con que una etapa venga simulada para marcar el pago, aunque el pago no lo diga", () => {
    const [p] = pagosDelRegistro([{ ...COMPLETADO, simulado: false, etapas: { ...COMPLETADO.etapas, ejecucion: { en: "x", simulado: true } } }], buscar);
    expect(p!.simulado).toBe(true);
  });

  it("una referencia que no es una participación se ve como «Sin identificar», no se esconde", () => {
    const [p] = pagosDelRegistro([{ ...COMPLETADO, referencia: "cred-9", tipo: "desembolso" }], buscar);
    expect(p).toMatchObject({ natilleraId: "", natilleraNombre: "Sin identificar", participanteNombre: "cred-9" });
  });

  it("descarta lo malformado y los tipos desconocidos sin tumbar la lista, y ordena del más nuevo al más viejo", () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const viejo = { ...COMPLETADO, id: "viejo", creado: "2026-10-15T20:00:00.000Z" };
    const lista = pagosDelRegistro([viejo, { id: "x" }, null, { ...COMPLETADO, id: "raro", tipo: "regalo" }, COMPLETADO], buscar);
    expect(lista.map((p) => p.id)).toEqual([COMPLETADO.id, "viejo"]);
    expect(aviso).toHaveBeenCalledTimes(3);
  });
});

describe("motivoSimple", () => {
  it("se queda con lo que va antes de «:» y tiene un texto por defecto", () => {
    expect(motivoSimple("Open Payments negó el pago saliente: 403")).toBe("Open Payments negó el pago saliente");
    expect(motivoSimple(null)).toBe("El pago no se pudo hacer");
  });
});
