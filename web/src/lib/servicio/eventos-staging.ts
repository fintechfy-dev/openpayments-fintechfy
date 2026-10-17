// Lectura de GET /api/contracts/{id}/events de staging. Forma vista el 16 oct (web/INTEGRACION.md):
// { events: [{ sequenceNumber, occurredAt, type, functionName, trigger, changes, parameters, actorId }] }.
// Los eventos de negocio (CobroCuotaSolicitado…) no salen aquí: solo la función que corrió y lo que cambió.

// Sin importar de ./staging: staging.ts importa este módulo y el ciclo rompería al cargar.
import type { FechaISO } from "./tipos";

function leerTexto(valor: unknown): string | undefined {
  if (typeof valor === "number") return String(valor);
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : undefined;
}

export interface CambioConcepto {
  concepto: string;
  /** En formato para mostrar ("$50.000,00"): sirve para saber qué cambió, no para calcular. */
  antes: string | null;
  despues: string | null;
}

export interface EventoContrato {
  contractId: string;
  secuencia: number;
  fecha: FechaISO;
  /** "Initialized" al crear el contrato; "StateChanged" en cada función que cambia algo. */
  tipo: string;
  /** La función que corrió (null en la creación). */
  funcion: string | null;
  disparador: string | null;
  cambios: CambioConcepto[];
  /** Parámetros ya sin envoltorio: staging los manda como texto JSON ('{"type": "Integer", "value": 1}'). */
  parametros: Record<string, unknown>;
  /** Usuario del JWT que lo pidió; null cuando lo disparó el motor (una cascada o la respuesta de un pago). */
  actor: string | null;
}

function objeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

function textoONulo(valor: unknown): string | null {
  return typeof valor === "string" ? valor : valor === null || valor === undefined ? null : String(valor);
}

function parametro(valor: unknown): unknown {
  let v = valor;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return valor;
    }
  }
  const o = objeto(v);
  return "value" in o ? o.value : v;
}

/** Convierte la respuesta cruda en eventos ordenados por secuencia. Lo que no tenga forma de evento se descarta. */
export function leerEventos(contractId: string, cuerpo: unknown): EventoContrato[] {
  const lista = objeto(cuerpo).events;
  if (!Array.isArray(lista)) return [];
  const eventos: EventoContrato[] = [];
  for (const crudo of lista) {
    const e = objeto(crudo);
    const fecha = leerTexto(e.occurredAt);
    if (typeof e.sequenceNumber !== "number" || !fecha) continue;
    eventos.push({
      contractId,
      secuencia: e.sequenceNumber,
      fecha,
      tipo: leerTexto(e.type) ?? "",
      funcion: leerTexto(e.functionName) ?? null,
      disparador: leerTexto(e.trigger) ?? null,
      cambios: (Array.isArray(e.changes) ? e.changes : []).map((c) => {
        const o = objeto(c);
        return { concepto: leerTexto(o.concept) ?? "", antes: textoONulo(o.previousValue), despues: textoONulo(o.newValue) };
      }),
      parametros: Object.fromEntries(Object.entries(objeto(e.parameters)).map(([k, v]) => [k, parametro(v)])),
      actor: leerTexto(e.actorId) ?? null,
    });
  }
  return eventos.sort((a, b) => a.secuencia - b.secuencia);
}
