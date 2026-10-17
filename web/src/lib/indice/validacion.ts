// Validación de lo que el bot manda a /api/indice/*. Lógica pura: recibe `unknown` y devuelve el
// registro con solo los campos de tipos.ts (lo demás se descarta) o la lista de errores en español,
// que el bot registra tal cual para saber qué corregir.
import type { RegistroActividad, RegistroNatillera, RegistroParticipacion, RegistroSolicitud, TipoRegistro } from "./tipos";

export type ResultadoValidacion<T> = { ok: true; registro: T } | { ok: false; errores: string[] };

export interface RegistroPorTipo {
  natilleras: RegistroNatillera;
  participaciones: RegistroParticipacion;
  actividades: RegistroActividad;
  solicitudes: RegistroSolicitud;
}

export const TIPOS_REGISTRO: readonly TipoRegistro[] = ["natilleras", "participaciones", "actividades", "solicitudes"];

export function esTipoRegistro(valor: string): valor is TipoRegistro {
  return (TIPOS_REGISTRO as readonly string[]).includes(valor);
}

const PATRON_ID = /^[A-Za-z0-9_-]{1,64}$/;
const PATRON_CONTRATO = /^[A-Za-z0-9_.:-]{1,128}$/;
export const MAX_TEXTO = 200;
export const MAX_BILLETERA = 300;
export const MAX_OBLIGACIONES = 100;

type Objeto = Record<string, unknown>;

const esObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);

/** Junta los errores de un registro; cada lectura devuelve el valor limpio (o uno vacío si falló). */
class Lector {
  constructor(
    private readonly datos: Objeto,
    private readonly prefijo = "",
    readonly errores: string[] = [],
  ) {}

  private nombre(campo: string) {
    return this.prefijo + campo;
  }

  private falla(campo: string, problema: string) {
    this.errores.push(`${this.nombre(campo)}: ${problema}`);
  }

  id(campo: string): string {
    const v = this.datos[campo];
    if (typeof v !== "string") this.falla(campo, "falta o no es texto.");
    else if (!PATRON_ID.test(v)) this.falla(campo, "debe tener de 1 a 64 caracteres entre letras sin tilde, números, guion (-) o guion bajo (_).");
    else return v;
    return "";
  }

  contrato(campo: string): string {
    const v = this.datos[campo];
    if (typeof v !== "string") this.falla(campo, "falta o no es texto.");
    else if (!PATRON_CONTRATO.test(v)) this.falla(campo, "debe tener de 1 a 128 caracteres entre letras sin tilde, números, punto (.), dos puntos (:), guion (-) o guion bajo (_).");
    else return v;
    return "";
  }

  texto(campo: string, maximo = MAX_TEXTO): string {
    const v = this.datos[campo];
    if (typeof v !== "string") {
      this.falla(campo, "falta o no es texto.");
      return "";
    }
    const limpio = v.trim();
    if (!limpio) this.falla(campo, "no puede estar vacío.");
    else if (limpio.length > maximo) this.falla(campo, `tiene ${limpio.length} caracteres; el máximo es ${maximo}.`);
    else return limpio;
    return "";
  }

  /** `undefined` o `null` = no vino; cualquier otro valor se valida como texto. */
  textoOpcional(campo: string, maximo = MAX_TEXTO): string | undefined {
    const v = this.datos[campo];
    if (v === undefined || v === null) return undefined;
    return this.texto(campo, maximo);
  }

  positivo(campo: string, { entero = false } = {}): number {
    const v = this.datos[campo];
    if (typeof v !== "number" || !Number.isFinite(v)) this.falla(campo, "falta o no es un número.");
    else if (v <= 0) this.falla(campo, "debe ser mayor que 0.");
    else if (entero && !Number.isInteger(v)) this.falla(campo, "debe ser un número entero.");
    else return v;
    return 0;
  }

  fecha(campo: string): string {
    const v = this.datos[campo];
    if (typeof v !== "string" || !v.trim()) this.falla(campo, "falta o no es texto.");
    else if (Number.isNaN(Date.parse(v.trim()))) this.falla(campo, "no es una fecha válida; usa ISO 8601, por ejemplo 2026-10-16T09:00:00-05:00.");
    else return v.trim();
    return "";
  }

  objeto(campo: string): Lector | null {
    const v = this.datos[campo];
    if (!esObjeto(v)) {
      this.falla(campo, "falta o no es un objeto.");
      return null;
    }
    return this.hijo(v, `${this.nombre(campo)}.`);
  }

  arreglo(campo: string, maximo: number): unknown[] {
    const v = this.datos[campo];
    if (!Array.isArray(v)) this.falla(campo, "falta o no es una lista.");
    else if (v.length > maximo) this.falla(campo, `tiene ${v.length} elementos; el máximo es ${maximo}.`);
    else return v;
    return [];
  }

  /** Lector de un objeto anidado cuyos errores se suman a los de este. */
  hijo(datos: Objeto, prefijo: string): Lector {
    return new Lector(datos, prefijo, this.errores);
  }

  resultado<T>(registro: T): ResultadoValidacion<T> {
    return this.errores.length ? { ok: false, errores: [...this.errores] } : { ok: true, registro };
  }
}

const NO_ES_OBJETO = { ok: false as const, errores: ["El cuerpo debe ser un objeto JSON con los campos del registro."] };

export function validarNatillera(cuerpo: unknown): ResultadoValidacion<RegistroNatillera> {
  if (!esObjeto(cuerpo)) return NO_ES_OBJETO;
  const l = new Lector(cuerpo);
  const natilleraId = l.id("natilleraId");
  const contractId = l.contrato("contractId");
  const nombre = l.texto("nombre");
  const admin = l.objeto("administrador");
  const administrador = { telegramId: admin?.texto("telegramId") ?? "", nombre: admin?.texto("nombre") ?? "" };
  const creadaEn = l.fecha("creadaEn");
  const billeteraGrupo = l.textoOpcional("billeteraGrupo", MAX_BILLETERA);
  const registro: RegistroNatillera = { natilleraId, contractId, nombre, administrador, creadaEn };
  if (billeteraGrupo !== undefined) registro.billeteraGrupo = billeteraGrupo;
  return l.resultado(registro);
}

export function validarParticipacion(cuerpo: unknown): ResultadoValidacion<RegistroParticipacion> {
  if (!esObjeto(cuerpo)) return NO_ES_OBJETO;
  const l = new Lector(cuerpo);
  return l.resultado({
    natilleraId: l.id("natilleraId"),
    participacionId: l.id("participacionId"),
    contractId: l.contrato("contractId"),
    nombre: l.texto("nombre"),
    telegramId: l.texto("telegramId"),
    billetera: l.texto("billetera", MAX_BILLETERA),
  });
}

export function validarActividad(cuerpo: unknown): ResultadoValidacion<RegistroActividad> {
  if (!esObjeto(cuerpo)) return NO_ES_OBJETO;
  const l = new Lector(cuerpo);
  const natilleraId = l.id("natilleraId");
  const actividadId = l.id("actividadId");
  const contractId = l.contrato("contractId");
  const descripcion = l.texto("descripcion");
  const obligaciones = l.arreglo("obligaciones", MAX_OBLIGACIONES).map((o, i) => {
    if (!esObjeto(o)) {
      l.errores.push(`obligaciones[${i}]: no es un objeto.`);
      return { participacionId: "", contractId: "" };
    }
    const lo = l.hijo(o, `obligaciones[${i}].`);
    return { participacionId: lo.id("participacionId"), contractId: lo.contrato("contractId") };
  });
  return l.resultado({ natilleraId, actividadId, contractId, descripcion, obligaciones });
}

export function validarSolicitud(cuerpo: unknown): ResultadoValidacion<RegistroSolicitud> {
  if (!esObjeto(cuerpo)) return NO_ES_OBJETO;
  const l = new Lector(cuerpo);
  return l.resultado({
    solicitudId: l.id("solicitudId"),
    natilleraId: l.id("natilleraId"),
    participacionId: l.id("participacionId"),
    montoMaximo: l.positivo("montoMaximo"),
    montoSolicitado: l.positivo("montoSolicitado"),
    plazoMeses: l.positivo("plazoMeses", { entero: true }),
    fechaSolicitud: l.fecha("fechaSolicitud"),
  });
}

export const VALIDADORES: { [T in TipoRegistro]: (cuerpo: unknown) => ResultadoValidacion<RegistroPorTipo[T]> } = {
  natilleras: validarNatillera,
  participaciones: validarParticipacion,
  actividades: validarActividad,
  solicitudes: validarSolicitud,
};
