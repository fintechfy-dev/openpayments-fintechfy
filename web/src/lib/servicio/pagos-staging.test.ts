import { afterEach, describe, expect, it, vi } from "vitest";
import { leerEventos, type CambioConcepto, type EventoContrato } from "./eventos-staging";
import { EVENTOS_PARTICIPACION } from "./eventos-staging.fixtures";
import { pagosDeParticipacion } from "./pagos-staging";
import type { Pago } from "./tipos";

const NATILLERA = { id: "prueba-web-53-a", nombre: "Prueba web #53" };

function pagos(eventos: EventoContrato[], valorCuota = 50000, deudaActual = 0): Pago[] {
  return pagosDeParticipacion({ natillera: NATILLERA, participanteNombre: "Ana", valorCuota, deudaActual, eventos });
}

function etapa(pago: Pago, nombre: string) {
  return pago.etapas.find((e) => e.nombre === nombre)!;
}

let secuencia = 0;
function ev(
  funcion: string,
  opciones: { parametros?: Record<string, unknown>; cambios?: CambioConcepto[]; disparador?: string; minuto?: number } = {},
): EventoContrato {
  secuencia += 1;
  const minuto = String(opciones.minuto ?? secuencia).padStart(2, "0");
  return {
    contractId: "c",
    secuencia,
    fecha: `2026-10-16T22:${minuto}:00Z`,
    tipo: "StateChanged",
    funcion,
    disparador: opciones.disparador ?? funcion,
    cambios: opciones.cambios ?? [],
    parametros: opciones.parametros ?? {},
    actor: null,
  };
}

const autorizar = () => ev("ConfirmarAutorizacion", { cambios: [{ concepto: "GrantId", antes: "", despues: "grant-a" }] });
const cobrada = (periodo: number) =>
  ev("PrimeraCuotaCobrada", { disparador: "CuotaCobrada", parametros: { Periodo: periodo, MontoCobrado: 50000 } });

afterEach(() => {
  secuencia = 0;
  vi.restoreAllMocks();
});

describe("pagosDeParticipacion con los eventos reales de staging", () => {
  const eventos = leerEventos("30acc57f", EVENTOS_PARTICIPACION);
  const resultado = pagos(eventos);

  it("da un solo pago: la cuota de $50.000, completada", () => {
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      id: "30acc57f-3",
      tipo: "cuota",
      direccion: "entrante",
      monto: 50000,
      estado: "completado",
      natilleraId: "prueba-web-53-a",
      participanteNombre: "Ana",
      creado: "2026-10-16T22:34:21.7844947Z",
    });
    expect(resultado[0]!.motivo).toBeUndefined();
  });

  it("tiene las cuatro etapas hechas, en orden, con el permiso y la función que lo cerró", () => {
    const p = resultado[0]!;
    expect(p.etapas.map((e) => [e.nombre, e.estado])).toEqual([
      ["solicitud", "hecha"],
      ["autorizacion", "hecha"],
      ["ejecucion", "hecha"],
      ["finalizacion", "hecha"],
    ]);
    expect(etapa(p, "autorizacion")).toMatchObject({ detalle: "Permiso grant-prueba-web-53", fecha: "2026-10-16T22:33:52.3823415Z" });
    expect(etapa(p, "ejecucion")).toMatchObject({ detalle: "Staging lo dio por cobrado; sin cotización ni pago saliente de Open Payments hasta el servicio de pagos (#4)", fecha: "2026-10-16T22:34:24.0000763Z" });
    expect(etapa(p, "finalizacion").detalle).toBe("PrimeraCuotaCobrada");
  });

  it("toma el monto cobrado de la respuesta, no solo el valor de la cuota", () => {
    expect(pagos(eventos, 1)[0]!.monto).toBe(50000);
  });
});

describe("pagosDeParticipacion con casos armados", () => {
  it("un cobro sin respuesta queda en ejecución", () => {
    const [p] = pagos([autorizar(), ev("CobrarCuota", { parametros: { Periodo: 1 } })]);
    expect(p!.estado).toBe("autorizado");
    expect(etapa(p!, "ejecucion")).toMatchObject({ estado: "actual", fecha: null });
    expect(etapa(p!, "finalizacion").estado).toBe("pendiente");
  });

  it("un cobro fallido muestra el motivo en palabras simples", () => {
    const [p] = pagos([
      autorizar(),
      ev("CobrarCuota", { parametros: { Periodo: 1 } }),
      ev("RespuestaCobro", { parametros: { Periodo: 1 }, cambios: [{ concepto: "PagoFallidoPendiente", antes: "0", despues: "1" }] }),
    ]);
    expect(p!.estado).toBe("fallido");
    expect(p!.motivo).toBe("El cobro no se pudo hacer");
    expect(etapa(p!, "ejecucion").estado).toBe("fallida");
    expect(etapa(p!, "finalizacion").estado).toBe("pendiente");
  });

  it("reconoce el fallo por el nombre de la función aunque no cambie PagoFallidoPendiente", () => {
    const [p] = pagos([autorizar(), ev("PagarDeuda", { parametros: { Monto: 1000 } }), ev("CobroDeudaFallo")]);
    expect(p!.estado).toBe("fallido");
  });

  it("sin permiso previo, la autorización falla y lo dice", () => {
    const [p] = pagos([ev("CobrarCuota", { parametros: { Periodo: 1 } }), autorizar()]);
    expect(etapa(p!, "autorizacion")).toMatchObject({ estado: "fallida", fecha: null });
    expect(p!.estado).toBe("fallido");
    expect(p!.motivo).toBe("El participante no ha autorizado el cobro");
  });

  it("un permiso borrado antes del cobro no cuenta", () => {
    const [p] = pagos([
      autorizar(),
      ev("RechazarAutorizacion", { cambios: [{ concepto: "GrantId", antes: "grant-a", despues: "" }] }),
      ev("CobrarCuota", { parametros: { Periodo: 1 } }),
    ]);
    expect(etapa(p!, "autorizacion").estado).toBe("fallida");
  });

  it("dos periodos no se cruzan las respuestas", () => {
    const resultado = pagos([
      autorizar(),
      ev("CobrarCuota", { parametros: { Periodo: 1 } }),
      ev("CobrarCuota", { parametros: { Periodo: 2 } }),
      cobrada(2),
    ]);
    expect(resultado.map((p) => p.id)).toEqual(["c-3", "c-2"]);
    const [periodo2, periodo1] = resultado;
    expect(periodo2!.estado).toBe("completado");
    expect(etapa(periodo2!, "finalizacion").fecha).toBe("2026-10-16T22:04:00Z");
    expect(periodo1!.estado).toBe("autorizado");
    expect(etapa(periodo1!, "ejecucion").estado).toBe("actual");
  });

  it("una respuesta solo cierra un cobro, aunque se reintente el mismo periodo", () => {
    const resultado = pagos([
      autorizar(),
      ev("CobrarCuota", { parametros: { Periodo: 1 } }),
      cobrada(1),
      ev("CobrarCuota", { parametros: { Periodo: 1 } }),
    ]);
    expect(resultado.map((p) => [p.id, p.estado])).toEqual([
      ["c-4", "autorizado"],
      ["c-2", "completado"],
    ]);
  });

  it("si se pide dos veces antes de la respuesta, la respuesta cierra solo el primero", () => {
    const resultado = pagos([
      autorizar(),
      ev("CobrarCuota", { parametros: { Periodo: 1 } }),
      ev("CobrarCuota", { parametros: { Periodo: 1 } }),
      cobrada(1),
    ]);
    expect(resultado.map((p) => [p.id, p.estado])).toEqual([
      ["c-3", "autorizado"],
      ["c-2", "completado"],
    ]);
  });

  it("una respuesta de deuda no cierra una cuota", () => {
    const [p] = pagos([autorizar(), ev("CobrarCuota", { parametros: { Periodo: 1 } }), ev("DeudaPagada")]);
    expect(etapa(p!, "ejecucion").estado).toBe("actual");
  });

  it("PagarDeuda es un pago de deuda con el monto de sus parámetros", () => {
    const [p] = pagos([autorizar(), ev("PagarDeuda", { parametros: { Monto: 12500 } }), ev("DeudaPagada")]);
    expect(p).toMatchObject({ tipo: "deuda", monto: 12500, estado: "completado", direccion: "entrante" });
  });

  it("PagarDeuda sin monto (como lo declara staging) usa la deuda actual de la participación", () => {
    const [p] = pagos([autorizar(), ev("PagarDeuda")], 50000, 51250);
    expect(p).toMatchObject({ tipo: "deuda", monto: 51250, estado: "autorizado" });
  });

  it("una deuda pagada sin MontoCobrado muestra lo que bajó la deuda, no la deuda de hoy (0)", () => {
    const permiso = autorizar();
    const solicitud = ev("PagarDeuda");
    const pagada = ev("DeudaPagada", {
      cambios: [
        { concepto: "DeudaCuotas", antes: "$50.000,00", despues: "$0,00" },
        { concepto: "MoraAcumulada", antes: "$1.250,00", despues: "$0,00" },
      ],
    });
    const [p] = pagos([permiso, solicitud, pagada], 50000, 0);
    expect(p).toMatchObject({ tipo: "deuda", monto: 51250, estado: "completado" });
  });

  it("una respuesta sin «Deuda» en el nombre ni Periodo no cierra una deuda", () => {
    const [p] = pagos([autorizar(), ev("PagarDeuda"), ev("RegistrarPagoFallido")]);
    expect(etapa(p!, "ejecucion").estado).toBe("actual");
  });

  it("sin permiso no sale completado aunque staging lo haya cobrado", () => {
    const [p] = pagos([ev("CobrarCuota", { parametros: { Periodo: 1 } }), cobrada(1)]);
    expect(p).toMatchObject({ estado: "fallido", motivo: "El participante no ha autorizado el cobro" });
  });

  it("una respuesta de cuota no cierra una deuda", () => {
    const [p] = pagos([autorizar(), ev("PagarDeuda", { parametros: { Monto: 1 } }), cobrada(1)]);
    expect(etapa(p!, "ejecucion").estado).toBe("actual");
  });

  it("ordena del más reciente al más antiguo aunque los eventos lleguen desordenados", () => {
    const a = autorizar();
    const c1 = ev("CobrarCuota", { parametros: { Periodo: 1 } });
    const c2 = ev("CobrarCuota", { parametros: { Periodo: 2 } });
    expect(pagos([c2, c1, a]).map((p) => p.id)).toEqual(["c-3", "c-2"]);
  });

  it("con la misma fecha, va primero la solicitud de mayor secuencia", () => {
    const a = autorizar();
    const c1 = ev("CobrarCuota", { parametros: { Periodo: 1 }, minuto: 30 });
    const c2 = ev("CobrarCuota", { parametros: { Periodo: 2 }, minuto: 30 });
    expect(pagos([c1, c2, a]).map((p) => p.id)).toEqual(["c-3", "c-2"]);
  });
});
