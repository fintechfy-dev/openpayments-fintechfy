import { describe, expect, it } from "vitest";
import type { EstadoEtapa, Pago } from "@/lib/servicio/tipos";
import {
  anunciarPago,
  contarPagos,
  contarPorFiltro,
  describirEtapas,
  etapaFallida,
  etapasOrdenadas,
  filtrarPagos,
  horaExacta,
  ordenarRecientes,
  pagosRecienTerminados,
} from "./pagos";

function pago(id: string, estado: Pago["estado"], extra: Partial<Pago> = {}): Pago {
  const estados: EstadoEtapa[] =
    estado === "completado" ? ["hecha", "hecha", "hecha", "hecha"] : estado === "fallido" ? ["hecha", "hecha", "fallida", "pendiente"] : ["hecha", "actual", "pendiente", "pendiente"];
  return {
    id,
    tipo: "cuota",
    natilleraId: "n",
    natilleraNombre: "Los Primos",
    participanteNombre: "Marta Restrepo",
    direccion: "entrante",
    monto: 50000,
    estado,
    etapas: (["solicitud", "autorizacion", "ejecucion", "finalizacion"] as const).map((nombre, i) => ({ nombre, estado: estados[i]!, fecha: null })),
    creado: "2026-10-15T14:00:00Z",
    ...extra,
  };
}

const lista = [pago("a", "completado"), pago("b", "fallido", { motivo: "Fondos insuficientes" }), pago("c", "pendiente"), pago("d", "autorizado"), pago("e", "completado")];

describe("conteo y filtros", () => {
  it("cuenta procesados, completados, fallidos y en curso", () => {
    expect(contarPagos(lista)).toEqual({ procesados: 5, completados: 2, fallidos: 1, enCurso: 2 });
    expect(contarPorFiltro(lista)).toEqual({ todos: 5, completados: 2, fallidos: 1, en_curso: 2 });
    expect(contarPagos([])).toEqual({ procesados: 0, completados: 0, fallidos: 0, enCurso: 0 });
  });

  it("filtra por estado; en curso = pendiente o autorizado", () => {
    expect(filtrarPagos(lista, "todos")).toHaveLength(5);
    expect(filtrarPagos(lista, "completados").map((p) => p.id)).toEqual(["a", "e"]);
    expect(filtrarPagos(lista, "fallidos").map((p) => p.id)).toEqual(["b"]);
    expect(filtrarPagos(lista, "en_curso").map((p) => p.id)).toEqual(["c", "d"]);
  });

  it("ordena los más recientes primero sin cambiar la lista original", () => {
    const viejo = pago("v", "completado", { creado: "2026-06-01T14:00:00Z" });
    const nuevo = pago("n", "completado", { creado: "2026-10-16T14:00:00Z" });
    const original = [viejo, nuevo];
    expect(ordenarRecientes(original).map((p) => p.id)).toEqual(["n", "v"]);
    expect(original.map((p) => p.id)).toEqual(["v", "n"]);
  });
});

describe("etapas", () => {
  it("las devuelve en el orden fijo y completa las que falten como pendientes", () => {
    const p = pago("x", "pendiente");
    p.etapas = [p.etapas[2]!, p.etapas[0]!];
    expect(etapasOrdenadas(p).map((e) => `${e.nombre}:${e.estado}`)).toEqual([
      "solicitud:hecha",
      "autorizacion:pendiente",
      "ejecucion:pendiente",
      "finalizacion:pendiente",
    ]);
  });

  it("encuentra la etapa en que falló y describe todas en palabras", () => {
    const p = pago("b", "fallido");
    expect(etapaFallida(p)?.nombre).toBe("ejecucion");
    expect(etapaFallida(pago("a", "completado"))).toBeUndefined();
    expect(describirEtapas(p)).toBe("Solicitud: hecha. Autorización: hecha. Ejecución: falló. Finalización: pendiente.");
  });
});

describe("pagos recién terminados (lo que se anuncia)", () => {
  it("no anuncia nada si nada cambió", () => {
    expect(pagosRecienTerminados(lista, lista)).toEqual([]);
  });

  it("anuncia los que pasan de en curso a completado o fallido", () => {
    const despues = [pago("c", "completado"), pago("d", "fallido"), ...lista.slice(0, 2)];
    expect(pagosRecienTerminados(lista, despues).map((p) => p.id)).toEqual(["c", "d"]);
  });

  it("anuncia los nuevos que ya llegan terminados, pero no los nuevos en curso", () => {
    const despues = [pago("z", "completado"), pago("y", "pendiente"), ...lista];
    expect(pagosRecienTerminados(lista, despues).map((p) => p.id)).toEqual(["z"]);
  });

  it("arma el mensaje con tipo, persona, monto y, si falló, etapa y motivo", () => {
    expect(anunciarPago(pago("a", "completado"))).toBe("Pago completado: cuota de Marta Restrepo por $50.000.");
    expect(anunciarPago(pago("b", "fallido", { motivo: "Fondos insuficientes" }))).toBe(
      "Pago fallido en Ejecución: cuota de Marta Restrepo por $50.000. Motivo: Fondos insuficientes.",
    );
  });
});

describe("hora exacta", () => {
  it("incluye segundos y usa la hora de Bogotá", () => {
    expect(horaExacta("2026-10-15T14:00:06Z")).toBe("9:00:06 a. m.");
    expect(horaExacta("2026-10-15T20:30:45Z")).toBe("3:30:45 p. m.");
  });
});
