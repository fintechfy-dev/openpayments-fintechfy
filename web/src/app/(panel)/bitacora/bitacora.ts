// Lógica pura de la bitácora: orden y quién hizo cada acción.
import type { NombreIcono, Variante } from "@/lib/natillera";
import type { EventoBitacora } from "@/lib/servicio/tipos";

export type TipoActor = "sistema" | "financiera" | "administrador";

/**
 * Las acciones automáticas (cobros, mora, liquidación) se distinguen de las del administrador.
 * TODO(#5): el contrato debería traer el tipo de actor explícito; mientras tanto se deduce del nombre.
 */
export function tipoActor(actor: string): TipoActor {
  const nombre = actor.trim().toLowerCase();
  if (nombre === "sistema") return "sistema";
  if (nombre.startsWith("financiera")) return "financiera";
  return "administrador";
}

export const ACTOR: Record<TipoActor, { texto: string; variante: Variante; icono: NombreIcono }> = {
  sistema: { texto: "Automática", variante: "neutro", icono: "reloj" },
  financiera: { texto: "Financiera", variante: "info", icono: "candado" },
  administrador: { texto: "Administrador", variante: "neutro", icono: "grupo" },
};

/** Lo más reciente primero, sin cambiar la lista original. */
export function ordenarBitacora(eventos: EventoBitacora[]): EventoBitacora[] {
  return [...eventos].sort((a, b) => b.fecha.localeCompare(a.fecha));
}
