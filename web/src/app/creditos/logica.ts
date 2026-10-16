// Lógica pura de la pantalla de créditos: validar la respuesta, agrupar y textos de presentación.
// Sin dependencias de servidor: se prueba con Vitest y se puede usar desde el cliente.

import { formatoCOP } from "@/lib/natillera";
import type { DecisionCredito, SolicitudCredito } from "@/lib/servicio/tipos";

/** Lo que devuelve la Server Action y muestra el formulario con un Aviso. */
export type ResultadoRespuesta = { ok: true; titulo: string; mensaje: string } | { ok: false; titulo: string; mensaje: string };

export const DECISIONES: readonly DecisionCredito[] = ["aprobar", "no_aprobar"];

/** Ids como "sol-001": cortos y solo con letras, números, guion y guion bajo. */
const ID_SEGURO = /^[A-Za-z0-9_-]{1,64}$/;

export type EntradaValidada = { ok: true; id: string; decision: DecisionCredito } | { ok: false };

/** Valida en el servidor lo que manda el formulario. Nunca confíes en el navegador. */
export function validarEntrada(id: unknown, decision: unknown): EntradaValidada {
  if (typeof id !== "string" || !ID_SEGURO.test(id)) return { ok: false };
  if (typeof decision !== "string" || !(DECISIONES as readonly string[]).includes(decision)) return { ok: false };
  return { ok: true, id, decision: decision as DecisionCredito };
}

/** "Por responder" (Solicitado) y "Respondidas" (todo lo demás). Conserva el orden recibido. */
export function agruparSolicitudes(solicitudes: SolicitudCredito[]) {
  const porResponder: SolicitudCredito[] = [];
  const respondidas: SolicitudCredito[] = [];
  for (const s of solicitudes) (s.estado === "solicitado" ? porResponder : respondidas).push(s);
  return { porResponder, respondidas };
}

/** "10 de 12 cuotas al día" o "9 de 12 cuotas al día · 1 pendiente". En palabras, sin rojo. */
export function textoAhorro(s: Pick<SolicitudCredito, "cuotasAlDia" | "cuotasTotales" | "cuotasPendientes">): string {
  const base = `${s.cuotasAlDia} de ${s.cuotasTotales} cuotas al día`;
  if (s.cuotasPendientes <= 0) return base;
  return `${base} · ${s.cuotasPendientes} ${s.cuotasPendientes === 1 ? "pendiente" : "pendientes"}`;
}

const fmtTasa = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/** "6 meses · 2% mensual". */
export function textoCondiciones(s: Pick<SolicitudCredito, "plazoMeses" | "tasaMensualPct">): string {
  const plazo = `${s.plazoMeses} ${s.plazoMeses === 1 ? "mes" : "meses"}`;
  return `${plazo} · ${fmtTasa.format(s.tasaMensualPct)}% mensual`;
}

/** "2 solicitudes esperan tu respuesta." */
export function textoPendientes(n: number): string {
  if (n === 0) return "Ninguna solicitud espera respuesta.";
  if (n === 1) return "1 solicitud espera tu respuesta.";
  return `${n} solicitudes esperan tu respuesta.`;
}

/** Aviso tras responder, en la voz del design system: se le avisa al participante por el bot. */
export function mensajeRespuesta(s: Pick<SolicitudCredito, "participanteNombre" | "montoSolicitado">, decision: DecisionCredito): ResultadoRespuesta {
  const monto = formatoCOP(s.montoSolicitado);
  if (decision === "aprobar") {
    return {
      ok: true,
      titulo: `Aprobaste el préstamo de ${s.participanteNombre}`,
      mensaje: `Le avisamos por el bot. Los ${monto} quedan por desembolsar a su billetera.`,
    };
  }
  return {
    ok: true,
    titulo: `No aprobaste el préstamo de ${s.participanteNombre}`,
    mensaje: "Le avisamos por el bot que su ahorro en la natillera sigue igual y que puede volver a pedirlo más adelante.",
  };
}

export const ERROR_ENTRADA: ResultadoRespuesta = {
  ok: false,
  titulo: "No pudimos leer tu respuesta",
  mensaje: "Recarga la página y vuelve a intentarlo.",
};

export const ERROR_YA_RESPONDIDA: ResultadoRespuesta = {
  ok: false,
  titulo: "Esta solicitud ya tiene respuesta",
  mensaje: "Recarga la página para ver cómo quedó.",
};

export const ERROR_SERVICIO: ResultadoRespuesta = {
  ok: false,
  titulo: "No pudimos guardar tu respuesta",
  mensaje: "El participante todavía no sabe nada. Espera un momento y vuelve a intentarlo.",
};
