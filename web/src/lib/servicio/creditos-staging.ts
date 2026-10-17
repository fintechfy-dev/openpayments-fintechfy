// Créditos reales: las solicitudes que deja el bot en el índice, lo que respondió la financiera o el
// administrador (también en el índice) y los contratos natillera-credito-ahorro del motor (CONT-003,
// integracion/FND-20261015-natillera-2.openapi.json). Lógica pura: staging.ts lee y escribe.
// El préstamo lo hace la financiera: al crear el contrato, el motor pide el desembolso y la API de pagos
// lo paga desde la billetera de la financiera (pagos/API.md, /desembolsar).

import type { RegistroDecision, RegistroSolicitud } from "@/lib/indice/tipos";
import type { FilaTabla } from "./tabla-staging";
import type { EstadoCredito, SolicitudCredito } from "./tipos";

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

/** El CreditoId es el mismo solicitudId del bot: así la web reconoce el crédito del motor sin guardar nada
 *  más, y el bot sabe de quién es cada aviso del crédito (telegram/src/avisos/despachar.js). */
export const creditoIdDe = (solicitudId: string) => solicitudId;

export interface UbicacionCredito {
  natilleraId: string;
  natilleraNombre: string;
  participanteNombre: string;
  cuotasAlDia: number;
  cuotasTotales: number;
  cuotasPendientes: number;
}

function numero(texto: string | undefined): number | null {
  if (texto === undefined || texto.trim() === "") return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

export interface EntradaCreditos {
  solicitudes: RegistroSolicitud[];
  decisiones: RegistroDecision[];
  /** Filas de /api/contracts/table para natillera-credito-ahorro. */
  creditos: FilaTabla[];
  ubicar: (participacionId: string) => UbicacionCredito | null;
  /** CREDITO_TASA_MENSUAL en porcentaje, para mostrar la tasa de lo que aún no se aprueba. */
  tasaConfiguradaPct?: number;
}

/** Cada solicitud con su estado real, y los créditos del motor que no salieron de una solicitud del índice. */
export function creditosDeStaging(e: EntradaCreditos): SolicitudCredito[] {
  const decisiones = new Map(e.decisiones.map((d) => [d.solicitudId, d]));
  const porCredito = new Map(e.creditos.map((f) => [f.conceptos.CreditoId, f]));
  const usados = new Set<string>();

  const sinUbicar = (participacionId: string): UbicacionCredito => ({
    natilleraId: "",
    natilleraNombre: "Sin identificar",
    participanteNombre: participacionId,
    cuotasAlDia: 0,
    cuotasTotales: 0,
    cuotasPendientes: 0,
  });

  /** Lo que dice el contrato del motor: estado, tasa y cuota (Percentage es fracción: 0.02 = 2 %). */
  function delMotor(f: FilaTabla) {
    const estadoCrudo = f.conceptos.EstadoCredito;
    const tasa = numero(f.conceptos.TasaMensual);
    return {
      estado: (estadoCrudo !== undefined ? estadoCreditoDeStaging(estadoCrudo) : null) ?? ("aprobado" as const),
      tasaMensualPct: tasa === null ? null : Math.round(tasa * 100 * 100) / 100,
      cuotaMensual: numero(f.conceptos.CuotaMensual),
    };
  }

  const desdeSolicitudes = e.solicitudes.map((s): SolicitudCredito => {
    const u = e.ubicar(s.participacionId) ?? sinUbicar(s.participacionId);
    const d = decisiones.get(s.solicitudId);
    const fila = porCredito.get(d?.creditoId ?? creditoIdDe(s.solicitudId));
    if (fila) usados.add(fila.contractId);
    const motor = fila ? delMotor(fila) : null;
    // Sin contrato todavía: lo que se decidió en la web; aprobada sin contrato = la tabla aún no lo lista.
    const estado: EstadoCredito = motor?.estado ?? (d?.decision === "no_aprobada" ? "rechazado" : d?.decision === "aprobada" ? "aprobado" : "solicitado");
    return {
      id: s.solicitudId,
      natilleraId: u.natilleraId || s.natilleraId,
      natilleraNombre: u.natilleraNombre,
      participanteId: s.participacionId,
      participanteNombre: u.participanteNombre,
      cuotasAlDia: u.cuotasAlDia,
      cuotasTotales: u.cuotasTotales,
      cuotasPendientes: u.cuotasPendientes,
      montoMaximo: s.montoMaximo,
      montoSolicitado: s.montoSolicitado,
      plazoMeses: s.plazoMeses,
      tasaMensualPct: motor?.tasaMensualPct ?? (estado === "solicitado" ? (e.tasaConfiguradaPct ?? null) : null),
      cuotaMensual: motor?.cuotaMensual ?? null,
      estado,
      fechaSolicitud: s.fechaSolicitud,
      fechaRespuesta: d?.fecha ?? null,
    };
  });

  // Créditos creados por otro camino (staging a mano, el bot): se ven igual, con lo que trae el contrato.
  const sueltos = e.creditos
    .filter((f) => !usados.has(f.contractId))
    .map((f): SolicitudCredito => {
      const participacionId = f.conceptos.ParticipacionId ?? "";
      const u = e.ubicar(participacionId) ?? sinUbicar(participacionId);
      const motor = delMotor(f);
      return {
        id: f.conceptos.CreditoId || f.contractId,
        natilleraId: u.natilleraId || (f.conceptos.NatilleraId ?? ""),
        natilleraNombre: u.natilleraNombre,
        participanteId: participacionId,
        participanteNombre: u.participanteNombre,
        cuotasAlDia: u.cuotasAlDia,
        cuotasTotales: u.cuotasTotales,
        cuotasPendientes: u.cuotasPendientes,
        // El tope (N × cuota) lo calcula la financiera al pedir; un crédito sin solicitud no lo trae.
        montoMaximo: null,
        montoSolicitado: numero(f.conceptos.Capital) ?? 0,
        plazoMeses: numero(f.conceptos.PlazoMeses) ?? 0,
        ...motor,
        fechaSolicitud: f.creadoEn,
        fechaRespuesta: f.creadoEn,
      };
    });

  return [...desdeSolicitudes, ...sueltos];
}

/** "AAAA-MM-DD" de hoy en Bogotá: la fecha que el motor entiende como FechaInicio. */
export function hoyEnBogota(ahora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/** El cuerpo de POST /api/contracts para natillera-credito-ahorro, con los parámetros tipados del contrato. */
export function cuerpoContratoCredito(p: {
  solicitud: RegistroSolicitud;
  /** La natillera real de la participación (staging), no la que dijo el bot en la solicitud. */
  natilleraId: string;
  participanteId: string;
  wallet: string;
  tasaMensualPct: number;
  hoy: string;
}) {
  const texto = (value: string) => ({ type: "Text", value });
  return {
    templateName: "natillera-credito-ahorro",
    parameters: {
      CreditoId: texto(creditoIdDe(p.solicitud.solicitudId)),
      ParticipacionId: texto(p.solicitud.participacionId),
      ParticipanteId: texto(p.participanteId),
      NatilleraId: texto(p.natilleraId),
      WalletParticipante: texto(p.wallet),
      Capital: { type: "Currency", value: p.solicitud.montoSolicitado },
      // Percentage en staging es una fracción: 2 % = 0.02.
      TasaMensual: { type: "Percentage", value: Math.round(p.tasaMensualPct * 100) / 10_000 },
      PlazoMeses: { type: "Integer", value: p.solicitud.plazoMeses },
      FechaInicio: { type: "Date", value: p.hoy },
    },
  };
}
