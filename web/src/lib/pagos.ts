// Lógica pura para mostrar pagos: nombres de etapas, textos, conteos, filtros y detección de cambios.
// Solo importa tipos y constantes de @/lib/servicio/tipos: se puede usar en el cliente y en el servidor.

import { ampm } from "@/lib/fechas";
import { formatoCOP, type NombreIcono } from "@/lib/natillera";
import { ETAPAS, type EstadoEtapa, type EtapaPago, type NombreEtapa, type Pago, type TipoPago } from "@/lib/servicio/tipos";

/** Nombres técnicos de las etapas de Open Payments (el panel es para el jurado y la financiera). */
export const NOMBRE_ETAPA: Record<NombreEtapa, string> = {
  solicitud: "Solicitud",
  autorizacion: "Autorización",
  ejecucion: "Ejecución",
  finalizacion: "Finalización",
};

/** Estado de una etapa en palabras, para lectores de pantalla y la línea de tiempo. */
export const TEXTO_ESTADO_ETAPA: Record<EstadoEtapa, string> = {
  hecha: "hecha",
  actual: "en curso",
  fallida: "falló",
  pendiente: "pendiente",
};

/** Ícono de cada estado de etapa: check = hecha, alerta = falló, reloj = en curso o pendiente (el color y el texto los distinguen). */
export const ICONO_ETAPA: Record<EstadoEtapa, NombreIcono> = { hecha: "check", actual: "reloj", fallida: "alerta", pendiente: "reloj" };

export const TEXTO_TIPO: Record<TipoPago, string> = {
  cuota: "Cuota",
  deuda: "Pago de deuda",
  actividad: "Actividad",
  premio: "Premio",
  liquidacion: "Liquidación",
  desembolso: "Desembolso de préstamo",
  reembolso: "Reembolso",
  venta: "Compra entre participantes",
  comision: "Comisión de una compra",
};

/** El tipo en palabras; si el servicio externo manda uno nuevo, "Pago" en vez de romper la pantalla. */
export function textoTipo(tipo: TipoPago | string): string {
  return (TEXTO_TIPO as Record<string, string>)[tipo] ?? "Pago";
}

export const TEXTO_DIRECCION: Record<Pago["direccion"], string> = {
  entrante: "Entra a la natillera",
  saliente: "Sale a la billetera",
};

/** Las cuatro etapas siempre en el mismo orden; si el servicio no manda una, queda pendiente. */
export function etapasOrdenadas(pago: Pago): EtapaPago[] {
  return ETAPAS.map((nombre) => pago.etapas.find((e) => e.nombre === nombre) ?? { nombre, estado: "pendiente", fecha: null });
}

/** La etapa en que falló el pago, si falló en alguna. */
export function etapaFallida(pago: Pago): EtapaPago | undefined {
  return pago.etapas.find((e) => e.estado === "fallida");
}

/** "Solicitud: hecha. Autorización: hecha. Ejecución: falló. Finalización: pendiente." */
export function describirEtapas(pago: Pago): string {
  return etapasOrdenadas(pago)
    .map((e) => `${NOMBRE_ETAPA[e.nombre]}: ${TEXTO_ESTADO_ETAPA[e.estado]}.`)
    .join(" ");
}

export type FiltroPagos = "todos" | "completados" | "fallidos" | "en_curso";

export const FILTROS: { valor: FiltroPagos; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "completados", texto: "Completados" },
  { valor: "fallidos", texto: "Fallidos" },
  { valor: "en_curso", texto: "En curso" },
];

/** En curso = todavía no termina (pendiente o autorizado). */
export function enCurso(pago: Pago): boolean {
  return pago.estado === "pendiente" || pago.estado === "autorizado";
}

export function cumpleFiltro(pago: Pago, filtro: FiltroPagos): boolean {
  switch (filtro) {
    case "todos":
      return true;
    case "completados":
      return pago.estado === "completado";
    case "fallidos":
      return pago.estado === "fallido";
    case "en_curso":
      return enCurso(pago);
  }
}

export function filtrarPagos(pagos: Pago[], filtro: FiltroPagos): Pago[] {
  return pagos.filter((p) => cumpleFiltro(p, filtro));
}

export interface ConteoPagos {
  procesados: number;
  completados: number;
  fallidos: number;
  enCurso: number;
}

export function contarPagos(pagos: Pago[]): ConteoPagos {
  return {
    procesados: pagos.length,
    completados: pagos.filter((p) => p.estado === "completado").length,
    fallidos: pagos.filter((p) => p.estado === "fallido").length,
    enCurso: pagos.filter(enCurso).length,
  };
}

/** Cuántos pagos hay en cada filtro, para los botones ("Fallidos (2)"). */
export function contarPorFiltro(pagos: Pago[]): Record<FiltroPagos, number> {
  const c = contarPagos(pagos);
  return { todos: c.procesados, completados: c.completados, fallidos: c.fallidos, en_curso: c.enCurso };
}

/** Más recientes primero (la vista lo exige aunque el servicio ya los mande así). */
export function ordenarRecientes(pagos: Pago[]): Pago[] {
  return [...pagos].sort((a, b) => b.creado.localeCompare(a.creado));
}

const terminado = (p: Pago) => p.estado === "completado" || p.estado === "fallido";

/**
 * Pagos que terminaron (completados o fallidos) entre dos lecturas: los nuevos que ya llegan terminados
 * y los que estaban en curso y ahora terminaron. Es lo único que se anuncia a lectores de pantalla.
 */
export function pagosRecienTerminados(antes: Pago[], despues: Pago[]): Pago[] {
  const previo = new Map(antes.map((p) => [p.id, p.estado]));
  return despues.filter((p) => terminado(p) && previo.get(p.id) !== p.estado);
}

/** "Pago completado: cuota de Marta Restrepo por $50.000." */
export function anunciarPago(pago: Pago): string {
  const que = `${textoTipo(pago.tipo).toLowerCase()} de ${pago.participanteNombre} por ${formatoCOP(pago.monto)}`;
  if (pago.estado === "fallido") {
    const etapa = etapaFallida(pago);
    const donde = etapa ? ` en ${NOMBRE_ETAPA[etapa.nombre]}` : "";
    return `Pago fallido${donde}: ${que}. Motivo: ${pago.motivo ?? "sin motivo informado"}.`;
  }
  // Un pago simulado no pasó por Open Payments: quien usa lector de pantalla también debe saberlo.
  return pago.simulado ? `Pago simulado, no pasó por Open Payments: ${que}.` : `Pago completado: ${que}.`;
}

const fmtHoraExacta = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: "America/Bogota",
});

/** "9:00:06 a. m." en hora de Bogotá: la hora exacta de cada etapa. */
export function horaExacta(iso: string): string {
  return ampm(fmtHoraExacta.format(new Date(iso)));
}
