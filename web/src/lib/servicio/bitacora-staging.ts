// La bitácora (US-012-AUD) armada con los eventos de staging de la cuenta y de las actividades de una
// natillera. Lógica pura: recibe los eventos ya leídos (leerEventos) y no consulta nada.
// Los movimientos de dinero no entran aquí: son del registro de pagos (/pagos).

import type { RegistroActividad } from "@/lib/indice/tipos";
import { formatoCOP } from "@/lib/natillera";
import type { EventoContrato } from "./eventos-staging";
import type { EventoBitacora } from "./tipos";

export interface EntradaBitacora {
  natillera: { id: string; nombre: string; administrador: string; valorCuota: number };
  eventosCuenta: EventoContrato[];
  actividades: { registro: RegistroActividad; eventos: EventoContrato[] }[];
}

const SISTEMA = "Sistema";

// EstadoNatillera (web/INTEGRACION.md, "Los estados"): 5 CERRADA · 6 CERRADA_SIN_CUPO.
const CERRADA = "5";
const CERRADA_SIN_CUPO = "6";

/** Staging guarda la función que corrió (`functionName`) y el disparador (`trigger`), y no siempre
 *  coinciden: el trigger IndicarGanador corre IndicarGanadorConPremioCompleto. Se mira cualquiera de los dos. */
function nombres(evento: EventoContrato): string[] {
  return [evento.funcion, evento.disparador].filter((n): n is string => typeof n === "string" && n !== "");
}

function es(evento: EventoContrato, ...candidatos: string[]): boolean {
  return nombres(evento).some((n) => candidatos.includes(n));
}

function cambio(evento: EventoContrato, concepto: string) {
  return evento.cambios.find((c) => c.concepto === concepto);
}

function estadoNatilleraPasaA(evento: EventoContrato, valor: string): boolean {
  const c = cambio(evento, "EstadoNatillera");
  return c !== undefined && c.despues === valor && c.antes !== valor;
}

function sube(evento: EventoContrato, concepto: string): boolean {
  const c = cambio(evento, concepto);
  return c !== undefined && Number(c.despues) > Number(c.antes ?? 0);
}

/** Lo que es de /pagos y no de la bitácora. Las funciones que registran la respuesta de un pago
 *  (como PrimeraCuotaCobrada) no están en la especificación: se reconocen por lo que cambian o
 *  por sus parámetros, no por una lista cerrada de nombres. */
function esDeDinero(evento: EventoContrato): boolean {
  const n = nombres(evento);
  if (n.some((x) => x.startsWith("Registrar"))) return true;
  if (n.some((x) => /Fallo|Fallid[ao]/.test(x))) return true;
  if ("MontoCobrado" in evento.parametros) return true;
  return sube(evento, "CuotasPagadas") || sube(evento, "PagoFallidoPendiente");
}

function numeroDePeriodo(evento: EventoContrato): string | undefined {
  const despues = cambio(evento, "PeriodoActual")?.despues;
  if (despues) return despues;
  const p = evento.parametros.Periodo;
  return typeof p === "number" || typeof p === "string" ? String(p) : undefined;
}

interface Asiento {
  accion: string;
  detalle: string;
  /** Fuerza el actor cuando el evento no lo dice bien (RegistrarValidado lo provoca el participante al autorizar). */
  actor?: string;
}

function asientoCuenta(evento: EventoContrato, valorCuota: number): Asiento | null {
  if (estadoNatilleraPasaA(evento, CERRADA_SIN_CUPO)) {
    return { accion: "Cerró sin cupo", detalle: "No se juntaron los participantes mínimos a tiempo" };
  }
  if (estadoNatilleraPasaA(evento, CERRADA)) return { accion: "Cerró la natillera", detalle: "" };
  if (evento.tipo === "Initialized") return { accion: "Creó la natillera", detalle: `Cuota de ${formatoCOP(valorCuota)}` };
  // Antes de esDeDinero: RegistrarValidado empieza por "Registrar" pero no mueve plata.
  if (es(evento, "RegistrarValidado")) return { accion: "Se validó un participante", detalle: "", actor: SISTEMA };
  if (esDeDinero(evento)) return null;
  if (es(evento, "Iniciar")) return { accion: "La natillera arrancó", detalle: "" };
  if (es(evento, "AbrirPeriodo")) {
    const n = numeroDePeriodo(evento);
    return { accion: n ? `Abrió el periodo ${n}` : "Abrió un periodo", detalle: "" };
  }
  if (es(evento, "IniciarLiquidacion", "IniciarLiquidacionTrasPrepararDevoluciones")) {
    return { accion: "Inició la liquidación", detalle: "" };
  }
  return desconocido(evento);
}

function asientoActividad(evento: EventoContrato, registro: RegistroActividad): Asiento | null {
  if (evento.tipo === "Initialized") return { accion: "Creó una actividad", detalle: registro.descripcion };
  if (esDeDinero(evento)) return null;
  if (es(evento, "IndicarGanador", "IndicarGanadorConPremioCompleto")) {
    return { accion: "Indicó al ganador", detalle: registro.descripcion };
  }
  if (es(evento, "CerrarSinPremioOSinGanador")) return { accion: "Cerró la actividad sin premio", detalle: registro.descripcion };
  if (es(evento, "CerrarEnLiquidacion", "AcumularEnLiquidacion")) {
    return { accion: "Cerró la actividad al liquidar", detalle: registro.descripcion };
  }
  return desconocido(evento);
}

/** Una función que la web no conoce se muestra con su nombre: ni se inventa un texto ni se esconde. */
function desconocido(evento: EventoContrato): Asiento {
  return { accion: "Acción en staging", detalle: evento.funcion ?? evento.disparador ?? evento.tipo };
}

export function bitacoraDeNatillera(entrada: EntradaBitacora): EventoBitacora[] {
  const { natillera } = entrada;
  const salida: { evento: EventoBitacora; orden: number }[] = [];

  const agregar = (evento: EventoContrato, asiento: Asiento | null) => {
    if (!asiento) return;
    salida.push({
      orden: evento.secuencia,
      evento: {
        id: `${evento.contractId}-${evento.secuencia}`,
        natilleraId: natillera.id,
        natilleraNombre: natillera.nombre,
        // Con actor, lo pidió alguien con el JWT del administrador; sin actor, lo disparó el motor.
        actor: asiento.actor ?? (evento.actor ? natillera.administrador : SISTEMA),
        accion: asiento.accion,
        detalle: asiento.detalle,
        fecha: evento.fecha,
      },
    });
  };

  for (const e of entrada.eventosCuenta) agregar(e, asientoCuenta(e, natillera.valorCuota));
  for (const { registro, eventos } of entrada.actividades) {
    for (const e of eventos) agregar(e, asientoActividad(e, registro));
  }

  return salida
    .sort((a, b) => Date.parse(b.evento.fecha) - Date.parse(a.evento.fecha) || b.orden - a.orden)
    .map((s) => s.evento);
}
