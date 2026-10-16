// El índice: lo que staging no lista ni guarda y la web necesita para armar sus pantallas.
// El bot lo alimenta con las cuatro rutas de /api/indice/* (web/INTEGRACION.md, sección 1, y
// telegram/INTEGRACION.md, sección 3). Los nombres de los campos son los de esos mapas.

/** Fecha y hora ISO 8601 tal como la manda el bot. */
type FechaISO = string;

export interface RegistroNatillera {
  natilleraId: string;
  /** El contrato `natillera-cuenta` en staging. */
  contractId: string;
  nombre: string;
  administrador: { telegramId: string; nombre: string };
  creadaEn: FechaISO;
  /** Billetera del grupo a nombre de la financiera; staging no la guarda. Opcional mientras el bot no la mande. */
  billeteraGrupo?: string;
}

export interface RegistroParticipacion {
  natilleraId: string;
  participacionId: string;
  /** El contrato `natillera-participacion` en staging. */
  contractId: string;
  nombre: string;
  telegramId: string;
  billetera: string;
}

export interface RegistroActividad {
  natilleraId: string;
  actividadId: string;
  contractId: string;
  descripcion: string;
  obligaciones: { participacionId: string; contractId: string }[];
}

export interface RegistroSolicitud {
  solicitudId: string;
  natilleraId: string;
  participacionId: string;
  montoMaximo: number;
  montoSolicitado: number;
  plazoMeses: number;
  fechaSolicitud: FechaISO;
}

export type TipoRegistro = "natilleras" | "participaciones" | "actividades" | "solicitudes";

/** Resultado de guardar: `repetido` cuando el id ya estaba con los mismos datos (el bot reintenta;
 *  no se duplica); `conflicto` cuando ya estaba con otros datos (no se sobrescribe sin avisar). */
export type ResultadoGuardar = "nuevo" | "repetido" | "conflicto";

/** Lo que la capa de datos (lib/servicio/staging.ts) lee del índice. Lo implementa lib/indice. */
export interface LectorIndice {
  natilleras(): Promise<RegistroNatillera[]>;
  natillera(natilleraId: string): Promise<RegistroNatillera | null>;
  participaciones(natilleraId: string): Promise<RegistroParticipacion[]>;
}
