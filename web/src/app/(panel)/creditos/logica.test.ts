import { describe, expect, it } from "vitest";
import type { SolicitudCredito } from "@/lib/servicio/tipos";
import { agruparSolicitudes, mensajeRespuesta, textoAhorro, textoCondiciones, textoPendientes, validarEntrada } from "./logica";

function solicitud(parcial: Partial<SolicitudCredito>): SolicitudCredito {
  return {
    id: "sol-001",
    natilleraId: "los-primos",
    natilleraNombre: "Los Primos",
    participanteId: "marta",
    participanteNombre: "Marta Restrepo",
    cuotasAlDia: 10,
    cuotasTotales: 12,
    cuotasPendientes: 0,
    montoMaximo: 300000,
    montoSolicitado: 200000,
    plazoMeses: 6,
    tasaMensualPct: 2,
    cuotaMensual: 35705,
    estado: "solicitado",
    fechaSolicitud: "2026-10-16T13:20:00Z",
    fechaRespuesta: null,
    ...parcial,
  };
}

describe("validarEntrada", () => {
  it("acepta un id seguro y una decisión válida", () => {
    expect(validarEntrada("sol-001", "aprobar")).toEqual({ ok: true, id: "sol-001", decision: "aprobar" });
    expect(validarEntrada("sol_002", "no_aprobar")).toEqual({ ok: true, id: "sol_002", decision: "no_aprobar" });
  });

  it("rechaza decisiones que no existen", () => {
    expect(validarEntrada("sol-001", "rechazar").ok).toBe(false);
    expect(validarEntrada("sol-001", "").ok).toBe(false);
    expect(validarEntrada("sol-001", null).ok).toBe(false);
  });

  it("rechaza ids vacíos, largos, con caracteres raros o que no son texto", () => {
    expect(validarEntrada("", "aprobar").ok).toBe(false);
    expect(validarEntrada("a".repeat(65), "aprobar").ok).toBe(false);
    expect(validarEntrada("../sol-001", "aprobar").ok).toBe(false);
    expect(validarEntrada("sol 001", "aprobar").ok).toBe(false);
    expect(validarEntrada("<script>", "aprobar").ok).toBe(false);
    expect(validarEntrada(42, "aprobar").ok).toBe(false);
  });
});

describe("agruparSolicitudes", () => {
  it("separa las que esperan respuesta del resto, sin cambiar el orden", () => {
    const lista = [
      solicitud({ id: "a", estado: "solicitado" }),
      solicitud({ id: "b", estado: "por_desembolsar" }),
      solicitud({ id: "c", estado: "solicitado" }),
      solicitud({ id: "d", estado: "rechazado" }),
    ];
    const { porResponder, respondidas } = agruparSolicitudes(lista);
    expect(porResponder.map((s) => s.id)).toEqual(["a", "c"]);
    expect(respondidas.map((s) => s.id)).toEqual(["b", "d"]);
  });

  it("devuelve listas vacías si no hay solicitudes", () => {
    expect(agruparSolicitudes([])).toEqual({ porResponder: [], respondidas: [] });
  });
});

describe("textos", () => {
  it("dice las cuotas pendientes en palabras", () => {
    expect(textoAhorro({ cuotasAlDia: 10, cuotasTotales: 12, cuotasPendientes: 0 })).toBe("10 de 12 cuotas al día");
    expect(textoAhorro({ cuotasAlDia: 9, cuotasTotales: 12, cuotasPendientes: 1 })).toBe("9 de 12 cuotas al día · 1 pendiente");
    expect(textoAhorro({ cuotasAlDia: 8, cuotasTotales: 12, cuotasPendientes: 2 })).toBe("8 de 12 cuotas al día · 2 pendientes");
  });

  it("dice plazo y tasa", () => {
    expect(textoCondiciones({ plazoMeses: 6, tasaMensualPct: 2 })).toBe("6 meses · 2% mensual");
    expect(textoCondiciones({ plazoMeses: 1, tasaMensualPct: 1.5 })).toBe("1 mes · 1,5% mensual");
  });

  it("cuenta las que esperan respuesta", () => {
    expect(textoPendientes(0)).toBe("Ninguna solicitud espera respuesta.");
    expect(textoPendientes(1)).toBe("1 solicitud espera tu respuesta.");
    expect(textoPendientes(3)).toBe("3 solicitudes esperan tu respuesta.");
  });

  it("el aviso dice que se le avisa al participante por el bot", () => {
    const s = solicitud({});
    const aprobado = mensajeRespuesta(s, "aprobar");
    expect(aprobado.ok).toBe(true);
    expect(aprobado.titulo).toBe("Aprobaste el préstamo de Marta Restrepo");
    expect(aprobado.mensaje).not.toContain("bot");
    expect(aprobado.mensaje).toContain("$200.000");
    const noAprobado = mensajeRespuesta(s, "no_aprobar");
    expect(noAprobado.mensaje).not.toContain("bot");
    expect(noAprobado.titulo).not.toMatch(/rechaz/i);
  });
});
