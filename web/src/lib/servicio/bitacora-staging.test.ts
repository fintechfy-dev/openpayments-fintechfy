import { describe, expect, it } from "vitest";
import type { RegistroActividad } from "@/lib/indice/tipos";
import { bitacoraDeNatillera } from "./bitacora-staging";
import { leerEventos, type EventoContrato } from "./eventos-staging";
import { EVENTOS_CUENTA, EVENTOS_PARTICIPACION } from "./eventos-staging.fixtures";

const natillera = { id: "prueba-web-53-a", nombre: "Prueba web #53", administrador: "Andrés Restrepo", valorCuota: 50000 };

const actividad: RegistroActividad = {
  natilleraId: natillera.id,
  actividadId: "rifa-1",
  contractId: "c-act",
  descripcion: "Rifa de diciembre",
  obligaciones: [],
};

let secuencia = 0;
function evento(parcial: Partial<EventoContrato>): EventoContrato {
  secuencia += 1;
  return {
    contractId: "c-cuenta",
    secuencia,
    fecha: `2026-10-16T23:${String(secuencia).padStart(2, "0")}:00Z`,
    tipo: "StateChanged",
    funcion: null,
    disparador: null,
    cambios: [],
    parametros: {},
    actor: "user_prueba",
    ...parcial,
  };
}

describe("bitacoraDeNatillera", () => {
  it("con los eventos reales de la cuenta: creación y validación, del más reciente al más antiguo", () => {
    const cuenta = leerEventos(EVENTOS_CUENTA.contractId, EVENTOS_CUENTA);
    const bitacora = bitacoraDeNatillera({ natillera, eventosCuenta: cuenta, actividades: [] });

    expect(bitacora.map((b) => b.accion)).toEqual(["Se validó un participante", "Creó la natillera"]);
    expect(bitacora[0]).toMatchObject({
      id: `${EVENTOS_CUENTA.contractId}-2`,
      actor: "Sistema",
      natilleraId: natillera.id,
      natilleraNombre: "Prueba web #53",
      fecha: "2026-10-16T22:33:52.5429947Z",
    });
    expect(bitacora[1]).toMatchObject({
      id: `${EVENTOS_CUENTA.contractId}-1`,
      actor: "Andrés Restrepo",
      detalle: "Cuota de $50.000",
    });
  });

  it("los pagos reales de una participación no entran: son de /pagos", () => {
    const pagos = leerEventos("c-part", EVENTOS_PARTICIPACION).filter((e) => e.funcion === "PrimeraCuotaCobrada");
    expect(pagos).toHaveLength(1);
    const bitacora = bitacoraDeNatillera({ natillera, eventosCuenta: [], actividades: [{ registro: actividad, eventos: pagos }] });
    expect(bitacora).toEqual([]);
  });

  it("omite RegistrarAporte y los demás Registrar* de la cuenta, salvo RegistrarValidado", () => {
    const bitacora = bitacoraDeNatillera({
      natillera,
      eventosCuenta: [
        evento({ funcion: "RegistrarAporte", disparador: "RegistrarAporte" }),
        evento({ funcion: "RegistrarComision", disparador: "RegistrarComision" }),
        evento({ funcion: "RegistrarValidado", disparador: "RegistrarValidado" }),
      ],
      actividades: [],
    });
    expect(bitacora.map((b) => b.accion)).toEqual(["Se validó un participante"]);
  });

  it("actividad creada, ganador y cierres, con la descripción del índice", () => {
    const eventos = [
      evento({ contractId: "c-act", tipo: "Initialized" }),
      evento({ contractId: "c-act", funcion: "IndicarGanadorConPremioCompleto", disparador: "IndicarGanador" }),
      evento({ contractId: "c-act", funcion: "AcumularEnLiquidacion", disparador: "CerrarEnLiquidacion", actor: null }),
      evento({ contractId: "c-act", funcion: "CerrarSinPremioOSinGanador", disparador: "CerrarSinPremioOSinGanador" }),
    ];
    const bitacora = bitacoraDeNatillera({ natillera, eventosCuenta: [], actividades: [{ registro: actividad, eventos }] });

    expect(bitacora.map((b) => [b.accion, b.actor])).toEqual([
      ["Cerró la actividad sin premio", "Andrés Restrepo"],
      ["Cerró la actividad al liquidar", "Sistema"],
      ["Indicó al ganador", "Andrés Restrepo"],
      ["Creó una actividad", "Andrés Restrepo"],
    ]);
    expect(bitacora.at(-1)).toMatchObject({ detalle: "Rifa de diciembre", id: `c-act-${eventos[0]!.secuencia}` });
  });

  it("una función desconocida entra con su nombre, sin inventar texto", () => {
    const bitacora = bitacoraDeNatillera({
      natillera,
      eventosCuenta: [evento({ funcion: "ReintentarPagoPremio", disparador: "ReintentarPagoPremio" })],
      actividades: [],
    });
    expect(bitacora).toEqual([expect.objectContaining({ accion: "Acción en staging", detalle: "ReintentarPagoPremio" })]);
  });

  it("estados de la cuenta: arranque, periodo, liquidación, cierre sin cupo y cierre", () => {
    const bitacora = bitacoraDeNatillera({
      natillera,
      eventosCuenta: [
        evento({ funcion: "Iniciar" }),
        evento({ funcion: "AbrirPeriodo", cambios: [{ concepto: "PeriodoActual", antes: "0", despues: "1" }] }),
        evento({ funcion: "IniciarLiquidacionTrasPrepararDevoluciones", disparador: "IniciarLiquidacion" }),
        evento({ funcion: "VerificarCupo", actor: null, cambios: [{ concepto: "EstadoNatillera", antes: "0", despues: "6" }] }),
        evento({ funcion: "RegistrarOperacionTerminada", actor: null, cambios: [{ concepto: "EstadoNatillera", antes: "4", despues: "5" }] }),
      ],
      actividades: [],
    });
    expect(bitacora.map((b) => [b.accion, b.actor])).toEqual([
      ["Cerró la natillera", "Sistema"],
      ["Cerró sin cupo", "Sistema"],
      ["Inició la liquidación", "Andrés Restrepo"],
      ["Abrió el periodo 1", "Andrés Restrepo"],
      ["La natillera arrancó", "Andrés Restrepo"],
    ]);
  });

  it("omite las respuestas de pago reconocidas por sus cambios, aunque el nombre no esté en la especificación", () => {
    const bitacora = bitacoraDeNatillera({
      natillera,
      eventosCuenta: [
        evento({ funcion: "CuotaNoCobrada", actor: null, cambios: [{ concepto: "PagoFallidoPendiente", antes: "0", despues: "1" }] }),
        evento({ funcion: "CobroFallido", actor: null }),
        evento({ funcion: "SegundaCuotaCobrada", actor: null, parametros: { Periodo: 2, MontoCobrado: 50000 } }),
        evento({ funcion: "CuotaCobradaOtraVez", actor: null, cambios: [{ concepto: "CuotasPagadas", antes: "1", despues: "2" }] }),
      ],
      actividades: [],
    });
    expect(bitacora).toEqual([]);
  });
});
