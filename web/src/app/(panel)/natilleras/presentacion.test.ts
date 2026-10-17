import { describe, expect, it } from "vitest";
import { avanceAhorro, plural, resumirNatilleras, segmentosCuotas } from "./presentacion";
import type { NatilleraResumen, Participante } from "@/lib/servicio/tipos";

function resumen(parcial: Partial<NatilleraResumen>): NatilleraResumen {
  return {
    id: "x",
    nombre: "X",
    estado: "activa",
    administrador: "A",
    valorCuota: 50000,
    periodicidad: "mensual",
    fechaInicio: "2026-01-15T14:00:00Z",
    fechaFinal: "2026-12-15T14:00:00Z",
    cuotasTotales: 12,
    periodoActual: 3,
    cupoMinimo: 3,
    numeroParticipantes: 4,
    participantesEnMora: 1,
    saldoCustodia: 100000,
    proximoCobro: "2026-04-15T14:00:00Z",
    ...parcial,
  };
}

function persona(cuotasPagadas: number, aportado = cuotasPagadas * 50000): Participante {
  return { id: "p", nombre: "P", estado: "activo", billetera: "", cuotasPagadas, aportado, deuda: 0 };
}

describe("resumirNatilleras", () => {
  it("suma custodia, participantes y cuotas pendientes; cuenta solo las activas", () => {
    const r = resumirNatilleras([resumen({}), resumen({ estado: "cerrada", saldoCustodia: 0, participantesEnMora: 0 }), resumen({ saldoCustodia: 50000 })]);
    expect(r).toEqual({ total: 3, activas: 2, enCustodia: 150000, participantes: 12, conCuotasPendientes: 2 });
  });

  it("sin natilleras todo es cero", () => {
    expect(resumirNatilleras([])).toEqual({ total: 0, activas: 0, enCustodia: 0, participantes: 0, conCuotasPendientes: 0 });
  });
});

describe("segmentosCuotas", () => {
  it("marca las cobradas y la próxima", () => {
    const s = segmentosCuotas(resumen({ cuotasTotales: 4, periodoActual: 2 }));
    expect(s).toEqual(["pagada", "pagada", "hoy", "pendiente"]);
  });

  it("antes de arrancar, la primera es la próxima", () => {
    expect(segmentosCuotas(resumen({ cuotasTotales: 3, periodoActual: 0 }))).toEqual(["hoy", "pendiente", "pendiente"]);
  });

  it("una natillera cerrada no tiene próxima cuota", () => {
    expect(segmentosCuotas(resumen({ estado: "cerrada", cuotasTotales: 2, periodoActual: 2, proximoCobro: null }))).toEqual(["pagada", "pagada"]);
  });
});

describe("avanceAhorro", () => {
  it("compara las cuotas pagadas con la meta del grupo", () => {
    const a = avanceAhorro({ participantes: [persona(3), persona(2)], valorCuota: 50000, cuotasTotales: 12, periodoActual: 3 });
    expect(a).toEqual({ ahorrado: 250000, meta: 1200000, porcentaje: 21, cuotasFaltantes: 9 });
  });

  it("la mora pagada no infla el avance del ahorro", () => {
    // Pagó 2 cuotas tarde, con $1.500 de mora: el ahorro son las 2 cuotas, no lo aportado.
    const a = avanceAhorro({ participantes: [persona(2, 101500)], valorCuota: 50000, cuotasTotales: 2, periodoActual: 2 });
    expect(a.ahorrado).toBe(100000);
    expect(a.porcentaje).toBe(100);
  });

  it("sin participantes no divide entre cero", () => {
    expect(avanceAhorro({ participantes: [], valorCuota: 50000, cuotasTotales: 12, periodoActual: 0 }).porcentaje).toBe(0);
  });
});

describe("plural", () => {
  it("usa singular solo para 1", () => {
    expect(plural(1, "natillera")).toBe("1 natillera");
    expect(plural(0, "natillera")).toBe("0 natilleras");
  });
});
