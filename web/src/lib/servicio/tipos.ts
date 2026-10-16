// Forma de los datos que la web pide al servicio externo de lógica financiera.
// Sigue los estados de docs/discovery/4-logica-financiera/especificacion-funcional.md
// y de design-system/docs/estados.md. El contrato definitivo sale del issue #5.

import type { EstadoDe } from "@/lib/natillera";

export type EstadoNatillera = EstadoDe<"natillera">;
export type EstadoParticipante = EstadoDe<"participante">;
export type EstadoPago = EstadoDe<"pago">;
export type EstadoCredito = EstadoDe<"credito">;

export type Periodicidad = "quincenal" | "mensual";

/** Fechas en ISO 8601 (UTC). Montos en pesos, como número. */
export type FechaISO = string;

export interface Participante {
  id: string;
  nombre: string;
  estado: EstadoParticipante;
  /** Payment pointer de su billetera. Solo para la financiera y el panel técnico. */
  billetera: string;
  cuotasPagadas: number;
  /** Todo lo que ha entrado de esta persona: cuotas, deudas pagadas y mora. */
  aportado: number;
  /** Lo que debe hoy: cuotas en mora más su mora. 0 si está al día. */
  deuda: number;
}

export interface NatilleraResumen {
  id: string;
  nombre: string;
  estado: EstadoNatillera;
  administrador: string;
  valorCuota: number;
  periodicidad: Periodicidad;
  fechaInicio: FechaISO;
  fechaFinal: FechaISO;
  cuotasTotales: number;
  /** Periodo en curso (1 = primera cuota). 0 si aún no arranca. */
  periodoActual: number;
  cupoMinimo: number;
  numeroParticipantes: number;
  participantesEnMora: number;
  /** Saldo de la cuenta de la natillera, que custodia la financiera. */
  saldoCustodia: number;
  proximoCobro: FechaISO | null;
}

export interface Natillera extends NatilleraResumen {
  moraDiariaPct: number;
  /** Billetera del grupo a nombre de la financiera. */
  billeteraGrupo: string;
  participantes: Participante[];
}

export interface SolicitudCredito {
  id: string;
  natilleraId: string;
  natilleraNombre: string;
  participanteId: string;
  participanteNombre: string;
  cuotasAlDia: number;
  cuotasTotales: number;
  cuotasPendientes: number;
  /** N × cuota: lo máximo que la financiera le puede prestar. */
  montoMaximo: number;
  montoSolicitado: number;
  plazoMeses: number;
  tasaMensualPct: number;
  /** Cuota fija (francesa) que calcula el servicio externo. */
  cuotaMensual: number;
  estado: EstadoCredito;
  fechaSolicitud: FechaISO;
  fechaRespuesta: FechaISO | null;
}

export type DecisionCredito = "aprobar" | "no_aprobar";

export type TipoPago = "cuota" | "deuda" | "actividad" | "premio" | "liquidacion" | "desembolso" | "reembolso";

/** Las cuatro etapas de un pago de Open Payments, en este orden. */
export const ETAPAS = ["solicitud", "autorizacion", "ejecucion", "finalizacion"] as const;
export type NombreEtapa = (typeof ETAPAS)[number];
export type EstadoEtapa = "hecha" | "actual" | "fallida" | "pendiente";

export interface EtapaPago {
  nombre: NombreEtapa;
  estado: EstadoEtapa;
  fecha: FechaISO | null;
  /** Detalle técnico corto para el jurado: id del grant, del quote, del pago saliente. */
  detalle?: string;
}

export interface Pago {
  id: string;
  tipo: TipoPago;
  natilleraId: string;
  natilleraNombre: string;
  /** A quién se le cobra o a quién se le paga. */
  participanteNombre: string;
  /** "entrante" = entra a la cuenta de la natillera; "saliente" = sale hacia una billetera. */
  direccion: "entrante" | "saliente";
  monto: number;
  estado: EstadoPago;
  etapas: EtapaPago[];
  /** Solo si falló: en palabras simples ("Fondos insuficientes"). */
  motivo?: string;
  creado: FechaISO;
}

export interface EventoBitacora {
  id: string;
  natilleraId: string;
  natilleraNombre: string;
  actor: string;
  accion: string;
  detalle: string;
  fecha: FechaISO;
}

/** Contrato que cumplen tanto los datos de prueba como el cliente HTTP. */
export interface Servicio {
  listarNatilleras(): Promise<NatilleraResumen[]>;
  obtenerNatillera(id: string): Promise<Natillera | null>;
  listarSolicitudesCredito(): Promise<SolicitudCredito[]>;
  responderSolicitud(id: string, decision: DecisionCredito): Promise<SolicitudCredito>;
  listarPagos(): Promise<Pago[]>;
  listarBitacora(): Promise<EventoBitacora[]>;
}
