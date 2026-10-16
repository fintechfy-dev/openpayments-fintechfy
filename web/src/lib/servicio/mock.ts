// Datos de prueba con la forma del servicio externo. Se usan mientras SERVICIO_URL esté vacía.
// Viven en memoria: un reinicio del servidor los devuelve a su estado inicial.

import type {
  DecisionCredito,
  EtapaPago,
  EventoBitacora,
  Natillera,
  NatilleraResumen,
  Pago,
  Servicio,
  SolicitudCredito,
} from "./tipos";
import { ETAPAS } from "./tipos";
import { formatoCOP } from "@/lib/natillera";

const BILLETERAS = "https://ilp.interledger-test.dev";

function participante(id: string, nombre: string, estado: Natillera["participantes"][number]["estado"], cuotasPagadas: number, cuota: number, deuda = 0) {
  return { id, nombre, estado, billetera: `${BILLETERAS}/${id}`, cuotasPagadas, aportado: cuotasPagadas * cuota, deuda };
}

const natilleras: Natillera[] = [
  {
    id: "los-primos",
    nombre: "Los Primos",
    estado: "activa",
    administrador: "Andrés Restrepo",
    valorCuota: 50000,
    periodicidad: "mensual",
    fechaInicio: "2026-01-15T14:00:00Z",
    fechaFinal: "2026-12-15T14:00:00Z",
    cuotasTotales: 12,
    periodoActual: 10,
    cupoMinimo: 3,
    numeroParticipantes: 0,
    participantesEnMora: 0,
    saldoCustodia: 0,
    proximoCobro: "2026-11-15T14:00:00Z",
    moraDiariaPct: 0.1,
    billeteraGrupo: `${BILLETERAS}/natillera-los-primos`,
    participantes: [
      participante("andres", "Andrés Restrepo", "activo", 10, 50000),
      participante("marta", "Marta Restrepo", "activo", 10, 50000),
      participante("jairo", "Don Jairo Gómez", "en_mora", 9, 50000, 51500),
      participante("luisa", "Luisa Fernanda Ríos", "activo", 10, 50000),
      participante("camilo", "Camilo Restrepo", "activo", 10, 50000),
    ],
  },
  {
    id: "companeros-del-taller",
    nombre: "Compañeros del taller",
    estado: "activa",
    administrador: "Gloria Patiño",
    valorCuota: 40000,
    periodicidad: "quincenal",
    fechaInicio: "2026-03-01T14:00:00Z",
    fechaFinal: "2026-11-30T14:00:00Z",
    cuotasTotales: 18,
    periodoActual: 16,
    cupoMinimo: 3,
    numeroParticipantes: 0,
    participantesEnMora: 0,
    saldoCustodia: 0,
    proximoCobro: "2026-11-01T14:00:00Z",
    moraDiariaPct: 0.1,
    billeteraGrupo: `${BILLETERAS}/natillera-taller`,
    participantes: [
      participante("gloria", "Gloria Patiño", "activo", 16, 40000),
      participante("hernan", "Hernán Mejía", "activo", 16, 40000),
      participante("yuli", "Yuliana Cardona", "activo", 16, 40000),
      participante("ospina", "Carlos Ospina", "en_mora", 14, 40000, 82400),
    ],
  },
  {
    id: "familia-zapata",
    nombre: "Familia Zapata",
    estado: "creada",
    administrador: "Rosa Zapata",
    valorCuota: 30000,
    periodicidad: "mensual",
    fechaInicio: "2026-11-01T14:00:00Z",
    fechaFinal: "2027-10-01T14:00:00Z",
    cuotasTotales: 12,
    periodoActual: 0,
    cupoMinimo: 3,
    numeroParticipantes: 0,
    participantesEnMora: 0,
    saldoCustodia: 0,
    proximoCobro: "2026-11-01T14:00:00Z",
    moraDiariaPct: 0.1,
    billeteraGrupo: `${BILLETERAS}/natillera-zapata`,
    participantes: [
      participante("rosa", "Rosa Zapata", "validado", 0, 30000),
      participante("tomas", "Tomás Zapata", "validado", 0, 30000),
    ],
  },
  {
    id: "vecinos-la-floresta",
    nombre: "Vecinos de La Floresta",
    estado: "cerrada",
    administrador: "Beatriz Londoño",
    valorCuota: 20000,
    periodicidad: "quincenal",
    fechaInicio: "2025-12-01T14:00:00Z",
    fechaFinal: "2026-06-01T14:00:00Z",
    cuotasTotales: 13,
    periodoActual: 13,
    cupoMinimo: 3,
    numeroParticipantes: 0,
    participantesEnMora: 0,
    saldoCustodia: 0,
    proximoCobro: null,
    moraDiariaPct: 0.1,
    billeteraGrupo: `${BILLETERAS}/natillera-floresta`,
    participantes: [
      participante("beatriz", "Beatriz Londoño", "liquidado", 13, 20000),
      participante("ramiro", "Ramiro Vélez", "liquidado", 13, 20000),
      participante("sofia", "Sofía Arango", "liquidado", 13, 20000),
    ],
  },
];

// Los totales se derivan de los participantes para que nunca se contradigan.
for (const n of natilleras) {
  n.numeroParticipantes = n.participantes.length;
  n.participantesEnMora = n.participantes.filter((p) => p.estado === "en_mora").length;
  n.saldoCustodia = n.estado === "cerrada" ? 0 : n.participantes.reduce((s, p) => s + p.aportado, 0);
}

const solicitudes: SolicitudCredito[] = [
  {
    id: "sol-001",
    natilleraId: "los-primos",
    natilleraNombre: "Los Primos",
    participanteId: "marta",
    participanteNombre: "Marta Restrepo",
    cuotasAlDia: 10,
    cuotasTotales: 12,
    cuotasPendientes: 0,
    montoMaximo: 300000,
    montoSolicitado: 200000,
    plazoMeses: 6,
    tasaMensualPct: 2,
    cuotaMensual: 35705,
    estado: "solicitado",
    fechaSolicitud: "2026-10-16T13:20:00Z",
    fechaRespuesta: null,
  },
  {
    id: "sol-002",
    natilleraId: "los-primos",
    natilleraNombre: "Los Primos",
    participanteId: "jairo",
    participanteNombre: "Don Jairo Gómez",
    cuotasAlDia: 9,
    cuotasTotales: 12,
    cuotasPendientes: 1,
    montoMaximo: 300000,
    montoSolicitado: 300000,
    plazoMeses: 6,
    tasaMensualPct: 2,
    cuotaMensual: 53558,
    estado: "solicitado",
    fechaSolicitud: "2026-10-16T14:05:00Z",
    fechaRespuesta: null,
  },
  {
    id: "sol-003",
    natilleraId: "companeros-del-taller",
    natilleraNombre: "Compañeros del taller",
    participanteId: "yuli",
    participanteNombre: "Yuliana Cardona",
    cuotasAlDia: 16,
    cuotasTotales: 18,
    cuotasPendientes: 0,
    montoMaximo: 240000,
    montoSolicitado: 150000,
    plazoMeses: 6,
    tasaMensualPct: 2,
    cuotaMensual: 26779,
    estado: "por_desembolsar",
    fechaSolicitud: "2026-10-15T16:40:00Z",
    fechaRespuesta: "2026-10-16T12:10:00Z",
  },
  {
    id: "sol-004",
    natilleraId: "companeros-del-taller",
    natilleraNombre: "Compañeros del taller",
    participanteId: "hernan",
    participanteNombre: "Hernán Mejía",
    cuotasAlDia: 16,
    cuotasTotales: 18,
    cuotasPendientes: 0,
    montoMaximo: 240000,
    montoSolicitado: 240000,
    plazoMeses: 6,
    tasaMensualPct: 2,
    cuotaMensual: 42846,
    estado: "al_dia",
    fechaSolicitud: "2026-08-10T15:00:00Z",
    fechaRespuesta: "2026-08-10T18:30:00Z",
  },
];

function etapas(estados: EtapaPago["estado"][], inicio: string, detalles: string[] = []): EtapaPago[] {
  const base = Date.parse(inicio);
  return ETAPAS.map((nombre, i) => ({
    nombre,
    estado: estados[i] ?? "pendiente",
    fecha: estados[i] === "hecha" || estados[i] === "fallida" ? new Date(base + i * 2000).toISOString() : null,
    detalle: detalles[i],
  }));
}

const pagosBase: Pago[] = [
  {
    id: "pag-101",
    tipo: "cuota",
    natilleraId: "los-primos",
    natilleraNombre: "Los Primos",
    participanteNombre: "Marta Restrepo",
    direccion: "entrante",
    monto: 50000,
    estado: "completado",
    etapas: etapas(["hecha", "hecha", "hecha", "hecha"], "2026-10-15T14:00:02Z", ["incoming payment creado", "grant recurrente vigente", "outgoing payment enviado", "recibido en la billetera del grupo"]),
    creado: "2026-10-15T14:00:02Z",
  },
  {
    id: "pag-102",
    tipo: "cuota",
    natilleraId: "los-primos",
    natilleraNombre: "Los Primos",
    participanteNombre: "Don Jairo Gómez",
    direccion: "entrante",
    monto: 50000,
    estado: "fallido",
    etapas: etapas(["hecha", "hecha", "fallida", "pendiente"], "2026-10-15T14:00:05Z", ["incoming payment creado", "grant recurrente vigente", "sin saldo en la billetera"]),
    motivo: "Fondos insuficientes",
    creado: "2026-10-15T14:00:05Z",
  },
  {
    id: "pag-103",
    tipo: "cuota",
    natilleraId: "companeros-del-taller",
    natilleraNombre: "Compañeros del taller",
    participanteNombre: "Carlos Ospina",
    direccion: "entrante",
    monto: 40000,
    estado: "fallido",
    etapas: etapas(["hecha", "fallida", "pendiente", "pendiente"], "2026-10-15T14:01:00Z", ["incoming payment creado", "el permiso fue revocado"]),
    motivo: "Autorización vencida",
    creado: "2026-10-15T14:01:00Z",
  },
  {
    id: "pag-104",
    tipo: "desembolso",
    natilleraId: "companeros-del-taller",
    natilleraNombre: "Compañeros del taller",
    participanteNombre: "Hernán Mejía",
    direccion: "saliente",
    monto: 240000,
    estado: "completado",
    etapas: etapas(["hecha", "hecha", "hecha", "hecha"], "2026-08-10T18:31:00Z", ["quote creado", "grant de la financiera", "outgoing payment enviado", "recibido en su billetera"]),
    creado: "2026-08-10T18:31:00Z",
  },
  {
    id: "pag-105",
    tipo: "liquidacion",
    natilleraId: "vecinos-la-floresta",
    natilleraNombre: "Vecinos de La Floresta",
    participanteNombre: "Sofía Arango",
    direccion: "saliente",
    monto: 260000,
    estado: "completado",
    etapas: etapas(["hecha", "hecha", "hecha", "hecha"], "2026-06-01T14:05:00Z", ["quote creado", "grant de la cuenta de la natillera", "outgoing payment enviado", "recibido en su billetera"]),
    creado: "2026-06-01T14:05:00Z",
  },
];

/**
 * Un pago "en vivo" que avanza una etapa cada 5 segundos y vuelve a empezar cada 30,
 * para que el registro del jurado muestre movimiento sin el servicio real.
 */
function pagoEnVivo(ahora = Date.now()): Pago {
  const ciclo = 30_000;
  const inicio = ahora - (ahora % ciclo);
  const paso = Math.min(Math.floor((ahora - inicio) / 5000), 4);
  const estados = ETAPAS.map((_, i) => (i < paso ? "hecha" : i === paso ? "actual" : "pendiente")) as EtapaPago["estado"][];
  const creado = new Date(inicio).toISOString();
  return {
    id: `pag-vivo-${inicio}`,
    tipo: "cuota",
    natilleraId: "companeros-del-taller",
    natilleraNombre: "Compañeros del taller",
    participanteNombre: "Yuliana Cardona",
    direccion: "entrante",
    monto: 40000,
    estado: paso >= 4 ? "completado" : paso >= 2 ? "autorizado" : "pendiente",
    etapas: ETAPAS.map((nombre, i) => ({
      nombre,
      estado: estados[i] ?? "pendiente",
      fecha: estados[i] === "hecha" ? new Date(inicio + (i + 1) * 5000).toISOString() : null,
    })),
    creado,
  };
}

const bitacora: EventoBitacora[] = [
  { id: "bit-1", natilleraId: "los-primos", natilleraNombre: "Los Primos", actor: "Andrés Restrepo", accion: "Creó la natillera", detalle: "Cuota de $50.000 mensual, del 15 de enero al 15 de diciembre", fecha: "2026-01-02T15:00:00Z" },
  { id: "bit-2", natilleraId: "los-primos", natilleraNombre: "Los Primos", actor: "Andrés Restrepo", accion: "Compartió el enlace de invitación", detalle: "Enlace válido mientras la natillera esté Creada", fecha: "2026-01-02T15:03:00Z" },
  { id: "bit-3", natilleraId: "companeros-del-taller", natilleraNombre: "Compañeros del taller", actor: "Gloria Patiño", accion: "Creó una actividad", detalle: "Rifa de diciembre: $10.000 por persona, premio de $30.000", fecha: "2026-10-01T20:15:00Z" },
  { id: "bit-4", natilleraId: "companeros-del-taller", natilleraNombre: "Compañeros del taller", actor: "Gloria Patiño", accion: "Indicó al ganador", detalle: "Rifa de diciembre: ganó Hernán Mejía", fecha: "2026-10-10T21:00:00Z" },
  { id: "bit-5", natilleraId: "vecinos-la-floresta", natilleraNombre: "Vecinos de La Floresta", actor: "Sistema", accion: "Liquidó la natillera", detalle: "3 participantes liquidados; la cuenta cerró en $0", fecha: "2026-06-01T14:10:00Z" },
];

function resumen(n: Natillera): NatilleraResumen {
  const { id, nombre, estado, administrador, valorCuota, periodicidad, fechaInicio, fechaFinal, cuotasTotales, periodoActual, cupoMinimo, numeroParticipantes, participantesEnMora, saldoCustodia, proximoCobro } = n;
  return { id, nombre, estado, administrador, valorCuota, periodicidad, fechaInicio, fechaFinal, cuotasTotales, periodoActual, cupoMinimo, numeroParticipantes, participantesEnMora, saldoCustodia, proximoCobro };
}

const copia = <T>(v: T): T => structuredClone(v);

export const servicioDePrueba: Servicio = {
  async listarNatilleras() {
    return natilleras.map((n) => copia(resumen(n)));
  },
  async obtenerNatillera(id) {
    const n = natilleras.find((x) => x.id === id);
    return n ? copia(n) : null;
  },
  async listarSolicitudesCredito() {
    return copia(solicitudes).sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud));
  },
  async responderSolicitud(id: string, decision: DecisionCredito) {
    const s = solicitudes.find((x) => x.id === id);
    if (!s) throw new Error(`No existe la solicitud ${id}`);
    if (s.estado !== "solicitado") throw new Error(`La solicitud ${id} ya fue respondida`);
    s.estado = decision === "aprobar" ? "por_desembolsar" : "rechazado";
    s.fechaRespuesta = new Date().toISOString();
    bitacora.unshift({
      id: `bit-${Date.now()}`,
      natilleraId: s.natilleraId,
      natilleraNombre: s.natilleraNombre,
      actor: "Financiera Aliada",
      accion: decision === "aprobar" ? "Aprobó un préstamo" : "No aprobó un préstamo",
      detalle: `${s.participanteNombre}: ${formatoCOP(s.montoSolicitado)} a ${s.plazoMeses} meses`,
      fecha: s.fechaRespuesta,
    });
    return copia(s);
  },
  async listarPagos() {
    return [pagoEnVivo(), ...copia(pagosBase)].sort((a, b) => b.creado.localeCompare(a.creado));
  },
  async listarBitacora() {
    return copia(bitacora).sort((a, b) => b.fecha.localeCompare(a.fecha));
  },
};
