// Sesión sin estado: los datos van en la cookie, firmados con HMAC-SHA256. Sin la firma correcta
// (o vencida) la sesión no existe. No cifra: la cookie no lleva nada secreto, solo quién es y su rol.
import { createHmac, timingSafeEqual } from "node:crypto";

export type Rol = "financiera" | "administrador";

export interface DatosSesion {
  usuario: string;
  nombre: string;
  rol: Rol;
  /** Vencimiento en milisegundos desde 1970. */
  exp: number;
}

export const NOMBRE_COOKIE = "natillera_sesion";
export const DURACION_SESION_MS = 8 * 60 * 60 * 1000;
/** Con menos, la firma se podría adivinar por fuerza bruta. */
export const LARGO_MINIMO_SECRETO = 32;

const b64 = (texto: string) => Buffer.from(texto, "utf8").toString("base64url");
const firmar = (datos: string, secreto: string) => createHmac("sha256", secreto).update(datos).digest("base64url");

/** `<datos en base64url>.<firma>`: lo usan la sesión y el código de acceso pendiente. */
export function firmarJson(datos: unknown, secreto: string): string {
  const cuerpo = b64(JSON.stringify(datos));
  return `${cuerpo}.${firmar(cuerpo, secreto)}`;
}

/** Los datos si la firma es válida; si no, null. Quien llama valida la forma y el vencimiento. */
export function leerJsonFirmado(token: string | undefined, secreto: string): unknown {
  if (!token || secreto.length < LARGO_MINIMO_SECRETO) return null;
  const [cuerpo, firma, ...resto] = token.split(".");
  if (!cuerpo || !firma || resto.length > 0) return null;

  const esperada = Buffer.from(firmar(cuerpo, secreto));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;

  try {
    return JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function firmarSesion(datos: DatosSesion, secreto: string): string {
  return firmarJson(datos, secreto);
}

function esDatosSesion(v: unknown): v is DatosSesion {
  if (typeof v !== "object" || v === null) return false;
  const d = v as Record<string, unknown>;
  return (
    typeof d.usuario === "string" &&
    typeof d.nombre === "string" &&
    (d.rol === "financiera" || d.rol === "administrador") &&
    typeof d.exp === "number"
  );
}

/** Devuelve los datos si la firma es válida y no venció; si no, null. */
export function leerSesion(token: string | undefined, secreto: string, ahora = Date.now()): DatosSesion | null {
  const datos = leerJsonFirmado(token, secreto);
  return esDatosSesion(datos) && datos.exp > ahora ? datos : null;
}
