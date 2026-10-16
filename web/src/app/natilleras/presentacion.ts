// Cálculos de presentación de las pantallas de natilleras (#9). Sin reglas de dinero:
// solo suma y ordena lo que ya manda el servicio externo para mostrarlo.

import type { Natillera, NatilleraResumen, Periodicidad } from "@/lib/servicio/tipos";

export interface ResumenNatilleras {
  total: number;
  activas: number;
  enCustodia: number;
  participantes: number;
  conCuotasPendientes: number;
}

/** Totales de la lista: cuántas natilleras, cuántas activas, plata en custodia y participantes. */
export function resumirNatilleras(natilleras: NatilleraResumen[]): ResumenNatilleras {
  return natilleras.reduce<ResumenNatilleras>(
    (r, n) => ({
      total: r.total + 1,
      activas: r.activas + (n.estado === "activa" ? 1 : 0),
      enCustodia: r.enCustodia + n.saldoCustodia,
      participantes: r.participantes + n.numeroParticipantes,
      conCuotasPendientes: r.conCuotasPendientes + n.participantesEnMora,
    }),
    { total: 0, activas: 0, enCustodia: 0, participantes: 0, conCuotasPendientes: 0 },
  );
}

const PERIODICIDAD: Record<Periodicidad, string> = { quincenal: "quincenal", mensual: "mensual" };

export function textoPeriodicidad(p: Periodicidad): string {
  return PERIODICIDAD[p];
}

/** "1 natillera" / "3 natilleras". */
export function plural(n: number, singular: string, pluralTexto = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

export type EstadoSegmento = "pagada" | "hoy" | "pendiente";

/**
 * Segmentos de nt-cuotas para el grupo: las cuotas ya cobradas van llenas y la próxima
 * se marca como "hoy" mientras la natillera siga cobrando.
 */
export function segmentosCuotas(n: Pick<NatilleraResumen, "cuotasTotales" | "periodoActual" | "proximoCobro" | "estado">): EstadoSegmento[] {
  const cobradas = Math.min(Math.max(n.periodoActual, 0), n.cuotasTotales);
  const siguePagando = n.proximoCobro !== null && n.estado !== "cerrada" && n.estado !== "liquidando";
  return Array.from({ length: n.cuotasTotales }, (_, i) => {
    if (i < cobradas) return "pagada";
    if (i === cobradas && siguePagando) return "hoy";
    return "pendiente";
  });
}

export interface AvanceAhorro {
  /** Todo lo que ha entrado de los participantes. */
  ahorrado: number;
  /** Lo que se juntaría si todos pagan todas las cuotas. */
  meta: number;
  /** 0 a 100, entero. */
  porcentaje: number;
  cuotasFaltantes: number;
}

/** Avance del ahorro del grupo frente a la meta (cuota × cuotas × participantes). */
export function avanceAhorro(n: Pick<Natillera, "participantes" | "valorCuota" | "cuotasTotales" | "periodoActual">): AvanceAhorro {
  const ahorrado = n.participantes.reduce((s, p) => s + p.aportado, 0);
  const meta = n.valorCuota * n.cuotasTotales * n.participantes.length;
  const porcentaje = meta > 0 ? Math.min(100, Math.round((ahorrado / meta) * 100)) : 0;
  return { ahorrado, meta, porcentaje, cuotasFaltantes: Math.max(0, n.cuotasTotales - n.periodoActual) };
}
