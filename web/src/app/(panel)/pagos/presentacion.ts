// Qué avisos muestra el registro de pagos según de dónde salen los pagos. Lógica pura: la usan
// page.tsx (servidor) y RegistroPagos (cliente, con los pagos de cada refresco).

import type { SaludPagos } from "@/lib/servicio/pagos-api";
import type { Pago } from "@/lib/servicio/tipos";

/** Las operaciones de la API de pagos (pagos/src/pagos.js) en palabras del panel. */
const OPERACION_EN_PALABRAS: Record<string, string> = {
  "cobrar-cuota": "cobros de cuotas",
  cobrar: "cobros",
  pagar: "pagos a participantes",
  desembolsar: "desembolsos de préstamos",
  "pagar-con-permiso": "pagos con permiso guardado",
  "aportar-con-permiso": "aportes con permiso guardado",
};

/** "a", "a y b", "a, b y c". */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/** ["desembolsar", "pagar"] → "desembolsos de préstamos y pagos a participantes". Una operación nueva sale con su nombre. */
export function textoOperacionesSimuladas(simuladas: string[]): string {
  const palabras = simuladas.map((op) => OPERACION_EN_PALABRAS[op] ?? op.replace(/-/g, " "));
  return enumerar([...new Set(palabras)]);
}

export interface AvisoPagos {
  tipo: "exito" | "info" | "alerta";
  titulo: string;
  texto?: string;
}

/** El estado de la API de pagos para el jurado; null si la web no la tiene configurada (no se muestra nada). */
export function avisoEstadoApi(salud: SaludPagos | null): AvisoPagos | null {
  if (!salud) return null;
  if (!salud.alcanzable) return { tipo: "info", titulo: "No pudimos consultar el estado de la API de pagos", texto: "Lo intentamos de nuevo cuando recargues la página." };
  if (!salud.ok) {
    // El error es texto de configuración de la API ("Faltan o están mal: …"), sin secretos: se muestra tal cual.
    return { tipo: "alerta", titulo: "La API de pagos todavía no puede pagar", texto: salud.error || "No dijo qué le falta. Revisa su configuración." };
  }
  if (salud.simuladas.length === 0) return { tipo: "exito", titulo: "Pagos reales por Open Payments" };
  return { tipo: "info", titulo: `Estas operaciones se simulan: ${textoOperacionesSimuladas(salud.simuladas)}` };
}

export function hayPagoSimulado(pagos: Pago[]): boolean {
  return pagos.some((p) => p.simulado === true);
}

/**
 * El aviso de que los cobros no pasan por Open Payments. `sinRegistroDePagos` = staging sin la API de pagos
 * (el motor da los cobros por hechos); si no, solo aparece cuando algún pago a la vista vino simulado.
 */
export function avisoSinOpenPayments(sinRegistroDePagos: boolean, pagos: Pago[]): AvisoPagos | null {
  if (sinRegistroDePagos) {
    return {
      tipo: "info",
      titulo: "Estos cobros todavía no pasan por Open Payments",
      texto: "Staging los da por hechos. La ejecución real, con cotización y pago saliente, llega con el servicio de pagos.",
    };
  }
  if (hayPagoSimulado(pagos)) {
    return {
      tipo: "info",
      titulo: "Algunos pagos no pasan por Open Payments",
      texto: "Los marcados como Simulado los dio por hechos la API de pagos. Los demás van por Open Payments.",
    };
  }
  return null;
}
