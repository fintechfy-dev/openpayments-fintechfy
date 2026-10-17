import { describe, expect, it } from "vitest";

import type { Pago } from "@/lib/servicio/tipos";

import { avisoEstadoApi, avisoSinOpenPayments, textoOperacionesSimuladas } from "./presentacion";

const pago = (simulado?: boolean) => ({ id: "p", simulado }) as Pago;

describe("avisoEstadoApi", () => {
  it("sin la API configurada no muestra nada", () => {
    expect(avisoEstadoApi(null)).toBeNull();
  });

  it("si no puede pagar, alerta con lo que le falta tal como lo dice", () => {
    expect(avisoEstadoApi({ alcanzable: true, ok: false, error: "Faltan o están mal: OP_WALLET_GRUPO", simuladas: [] })).toEqual({
      tipo: "alerta",
      titulo: "La API de pagos todavía no puede pagar",
      texto: "Faltan o están mal: OP_WALLET_GRUPO",
    });
  });

  it("sin respuesta no culpa a la configuración: solo dice que no se pudo consultar", () => {
    expect(avisoEstadoApi({ alcanzable: false, ok: false, simuladas: [] })?.titulo).toBe("No pudimos consultar el estado de la API de pagos");
  });

  it("lista: éxito si nada se simula; info con las operaciones simuladas en palabras", () => {
    expect(avisoEstadoApi({ alcanzable: true, ok: true, simuladas: [] })).toEqual({ tipo: "exito", titulo: "Pagos reales por Open Payments" });
    expect(avisoEstadoApi({ alcanzable: true, ok: true, simuladas: ["desembolsar", "pagar"] })?.titulo).toBe(
      "Estas operaciones se simulan: desembolsos de préstamos y pagos a participantes",
    );
  });
});

describe("textoOperacionesSimuladas", () => {
  it("enumera en español y deja con su nombre una operación nueva", () => {
    expect(textoOperacionesSimuladas(["cobrar-cuota", "cobrar", "algo-nuevo"])).toBe("cobros de cuotas, cobros y algo nuevo");
  });
});

describe("avisoSinOpenPayments", () => {
  it("solo avisa si algún pago a la vista vino simulado", () => {
    expect(avisoSinOpenPayments([pago(false), pago()])).toBeNull();
    expect(avisoSinOpenPayments([pago(false), pago(true)])?.titulo).toBe("Algunos pagos no pasan por Open Payments");
  });
});
