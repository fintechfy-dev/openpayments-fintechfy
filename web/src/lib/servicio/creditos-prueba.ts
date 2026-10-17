// Créditos de prueba sobre las natilleras y participantes reales de staging. El motor tiene el contrato
// natillera-credito-ahorro (CONT-003, integracion/FND-20261015-natillera-2.openapi.json), pero las
// solicitudes las pide el participante por el bot y hoy no hay ninguna: estas muestran la pantalla con
// un crédito en cada estado. Se ven como prueba (aviso en /creditos) y aprobar no crea nada en staging.
// TODO(#53): con solicitudes reales del índice, crear el contrato al aprobar y leer EstadoCredito.

import type { EstadoCredito, EstadoParticipante, FechaISO, SolicitudCredito } from "./tipos";

/**
 * Montos de ejemplo, fijos y escritos a mano: la web no calcula cuotas (la lógica financiera es del
 * motor). 34.675 es la cuota francesa de $100.000 a 3 meses al 2 % mensual, la que daría el contrato.
 */
export const ESCENARIO_PRUEBA = { montoSolicitado: 100_000, plazoMeses: 3, tasaMensualPct: 2, cuotaMensual: 34_675 } as const;

/** Un crédito por estado; los dos primeros quedan por responder para probar aprobar y no aprobar. */
export const ESTADOS_PRUEBA: readonly EstadoCredito[] = [
  "solicitado",
  "solicitado",
  "por_desembolsar",
  "al_dia",
  "en_mora",
  "pagado",
  "rechazado",
  "descontado",
];

// EstadoCredito del contrato (web/INTEGRACION.md): el índice del arreglo es el valor numérico.
const ESTADOS_STAGING: readonly [string, EstadoCredito][] = [
  ["DESEMBOLSO_PENDIENTE", "por_desembolsar"],
  ["ACTIVO", "al_dia"],
  ["MORA", "en_mora"],
  ["PAGADO", "pagado"],
];

/** EstadoCredito de staging (0-3 o su nombre) al estado de la web; null si no se reconoce. */
export function estadoCreditoDeStaging(valor: number | string): EstadoCredito | null {
  const n = typeof valor === "number" ? valor : /^\d+$/.test(valor) ? Number(valor) : undefined;
  if (n !== undefined) return ESTADOS_STAGING[n]?.[1] ?? null;
  return ESTADOS_STAGING.find(([nombre]) => nombre === valor)?.[1] ?? null;
}

export interface NatilleraParaCreditos {
  id: string;
  nombre: string;
  valorCuota: number;
  /** MultiploPrestamo del contrato: el tope es N × cuota (E-15). */
  multiploPrestamo: number;
  cuotasTotales: number;
  periodoActual: number;
  participantes: { id: string; nombre: string; estado: EstadoParticipante; cuotasPagadas: number }[];
}

/** Solo quien ya autorizó el cobro puede pedir un préstamo. */
const PUEDE_PEDIR: readonly EstadoParticipante[] = ["validado", "activo", "en_mora"];

const RESPONDIDO: readonly EstadoCredito[] = ["solicitado"];

export function solicitudesDePrueba(natilleras: NatilleraParaCreditos[], ahora: Date): SolicitudCredito[] {
  const candidatos = natilleras.flatMap((n) => {
    const montoMaximo = n.multiploPrestamo * n.valorCuota;
    if (montoMaximo < ESCENARIO_PRUEBA.montoSolicitado) return [];
    return n.participantes.filter((p) => PUEDE_PEDIR.includes(p.estado)).map((p) => ({ n, p, montoMaximo }));
  });

  return candidatos.slice(0, ESTADOS_PRUEBA.length).map(({ n, p, montoMaximo }, i) => {
    const estado = ESTADOS_PRUEBA[i]!;
    // Una hora entre una y otra, la más nueva primero; las respondidas, media hora después de pedirse.
    const pedida = new Date(ahora.getTime() - (i + 1) * 3_600_000);
    const respondida: FechaISO | null = RESPONDIDO.includes(estado) ? null : new Date(pedida.getTime() + 1_800_000).toISOString();
    return {
      id: `prueba-${n.id}-${p.id}`,
      natilleraId: n.id,
      natilleraNombre: n.nombre,
      participanteId: p.id,
      participanteNombre: p.nombre,
      cuotasAlDia: p.cuotasPagadas,
      cuotasTotales: n.cuotasTotales,
      cuotasPendientes: Math.max(0, n.periodoActual - p.cuotasPagadas),
      montoMaximo,
      ...ESCENARIO_PRUEBA,
      estado,
      fechaSolicitud: pedida.toISOString(),
      fechaRespuesta: respondida,
    };
  });
}
