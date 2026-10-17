// GET /api/contracts/table?templateName=…&concepts=…&skip=…&take=…: la lista de contratos de una plantilla.
// No está en la especificación OpenAPI; la confirmó el equipo y respondió con el JWT admin el 16 oct
// (web/INTEGRACION.md). Con ella el superadmin ve todas las natilleras del motor, no solo las del índice.
// Forma vista: { items: [{ contractId, createdAt, concepts: { Nombre: "texto" }, conceptLabels }], hasMore }.

import type { LectorIndice, RegistroActividad, RegistroNatillera, RegistroParticipacion } from "@/lib/indice/tipos";

export interface FilaTabla {
  contractId: string;
  creadoEn: string;
  /** Los conceptos pedidos, como texto (la tabla no los tipa). */
  conceptos: Record<string, string>;
}

/** El motor no guarda quién administra la natillera: sin el índice no se sabe. Ningún usuario se llama
 *  así, de modo que el control de acceso por nombre nunca le abre una natillera ajena a un administrador. */
export const ADMINISTRADOR_SIN_REGISTRAR = "Sin registrar";

function objeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

/** Las filas de una página de la tabla y si hay más. Lo que no tenga contractId se descarta. */
export function leerPaginaTabla(cuerpo: unknown): { filas: FilaTabla[]; hayMas: boolean } {
  const c = objeto(cuerpo);
  const items = Array.isArray(c.items) ? c.items : [];
  const filas: FilaTabla[] = [];
  for (const crudo of items) {
    const i = objeto(crudo);
    if (typeof i.contractId !== "string" || i.contractId === "") continue;
    const conceptos: Record<string, string> = {};
    for (const [k, v] of Object.entries(objeto(i.concepts))) if (typeof v === "string" || typeof v === "number") conceptos[k] = String(v);
    filas.push({ contractId: i.contractId, creadoEn: typeof i.createdAt === "string" ? i.createdAt : "", conceptos });
  }
  return { filas, hayMas: c.hasMore === true };
}

export interface ContratosDelMotor {
  natilleras: FilaTabla[];
  participaciones: FilaTabla[];
  actividades: FilaTabla[];
}

/**
 * Un lector que cubre todo lo que hay en el motor y toma del índice lo que el motor no guarda: el
 * administrador, el nombre de cada persona, la billetera del grupo y las obligaciones de cada actividad.
 * Lo que esté solo en el índice (su contrato ya no sale en la tabla) se conserva: el GET del contrato
 * decide después si existe.
 */
export function combinarConIndice(motor: ContratosDelMotor, indice: LectorIndice): LectorIndice {
  const natillerasMotor = (): RegistroNatillera[] =>
    motor.natilleras.flatMap((f) => {
      const natilleraId = f.conceptos.NatilleraId;
      if (!natilleraId) return [];
      return [{
        natilleraId,
        contractId: f.contractId,
        nombre: f.conceptos.NombreNatillera ?? natilleraId,
        administrador: { telegramId: "", nombre: ADMINISTRADOR_SIN_REGISTRAR },
        creadaEn: f.creadoEn,
      }];
    });

  const participacionesMotor = (natilleraId: string): RegistroParticipacion[] =>
    motor.participaciones.flatMap((f) => {
      const participacionId = f.conceptos.ParticipacionId;
      if (!participacionId || f.conceptos.NatilleraId !== natilleraId) return [];
      // ParticipanteId es el id de Telegram de la persona (la especificación lo describe así).
      const telegramId = f.conceptos.ParticipanteId ?? "";
      return [{ natilleraId, participacionId, contractId: f.contractId, nombre: telegramId ? `Telegram ${telegramId}` : participacionId, telegramId, billetera: f.conceptos.WalletParticipante ?? "" }];
    });

  const actividadesMotor = (natilleraId: string): RegistroActividad[] =>
    motor.actividades.flatMap((f) => {
      const actividadId = f.conceptos.ActividadId;
      if (!actividadId || f.conceptos.NatilleraId !== natilleraId) return [];
      return [{ natilleraId, actividadId, contractId: f.contractId, descripcion: f.conceptos.Descripcion ?? "", obligaciones: [] }];
    });

  /** Del motor, con el registro del índice encima cuando lo hay; y lo que solo está en el índice, al final. */
  function unir<T>(delMotor: T[], delIndice: T[], llave: (r: T) => string): T[] {
    const enIndice = new Map(delIndice.map((r) => [llave(r), r]));
    const unidos = delMotor.map((r) => enIndice.get(llave(r)) ?? r);
    const vistos = new Set(delMotor.map(llave));
    return [...unidos, ...delIndice.filter((r) => !vistos.has(llave(r)))];
  }

  return {
    async natilleras() {
      return unir(natillerasMotor(), await indice.natilleras(), (r) => r.natilleraId);
    },
    async natillera(natilleraId) {
      return (await indice.natillera(natilleraId)) ?? natillerasMotor().find((r) => r.natilleraId === natilleraId) ?? null;
    },
    async participaciones(natilleraId) {
      return unir(participacionesMotor(natilleraId), await indice.participaciones(natilleraId), (r) => r.participacionId);
    },
    async actividades(natilleraId) {
      return unir(actividadesMotor(natilleraId), await indice.actividades(natilleraId), (r) => r.actividadId);
    },
    // Las solicitudes y las respuestas solo existen en el índice: el motor no las guarda.
    solicitudes: () => indice.solicitudes(),
    decisiones: () => indice.decisiones(),
  };
}
