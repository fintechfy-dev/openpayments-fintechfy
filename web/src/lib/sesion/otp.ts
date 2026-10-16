// Código de acceso de un solo uso (OTP) que llega por Telegram.
// El reto pendiente viaja en una cookie firmada que guarda la huella del código, nunca el código:
// quien vea la cookie no puede deducirlo, y sin la firma no se puede inventar un reto.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { firmarJson, leerJsonFirmado } from "./firma";

export const NOMBRE_COOKIE_RETO = "natillera_reto";
export const DIGITOS = 6;
export const VIGENCIA_CODIGO_MS = 5 * 60 * 1000;

export interface Reto {
  usuario: string;
  /** Al azar en cada reto: dos códigos iguales no dejan la misma huella. */
  nonce: string;
  huella: string;
  exp: number;
}

/** 6 dígitos al azar criptográfico, con ceros a la izquierda ("004817"). */
export function generarCodigo(): string {
  return String(randomInt(0, 10 ** DIGITOS)).padStart(DIGITOS, "0");
}

function huellaDe(codigo: string, nonce: string, secreto: string): string {
  return createHmac("sha256", secreto).update(`otp:${nonce}:${codigo}`).digest("base64url");
}

export function crearReto(usuario: string, codigo: string, secreto: string, ahora = Date.now()): { reto: Reto; token: string } {
  const nonce = randomBytes(16).toString("base64url");
  const reto: Reto = { usuario, nonce, huella: huellaDe(codigo, nonce, secreto), exp: ahora + VIGENCIA_CODIGO_MS };
  return { reto, token: firmarJson(reto, secreto) };
}

function esReto(v: unknown): v is Reto {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.usuario === "string" && typeof r.nonce === "string" && typeof r.huella === "string" && typeof r.exp === "number";
}

/** El reto si la cookie es auténtica y no venció; si no, null. */
export function leerReto(token: string | undefined, secreto: string, ahora = Date.now()): Reto | null {
  const datos = leerJsonFirmado(token, secreto);
  return esReto(datos) && datos.exp > ahora ? datos : null;
}

/** Normaliza lo que escribió la persona: acepta "482 913" o "482-913". */
export function limpiarCodigo(texto: unknown): string {
  return typeof texto === "string" ? texto.replace(/[\s-]/g, "").slice(0, 12) : "";
}

/** Compara en tiempo constante el código escrito contra la huella del reto. */
export function codigoCorrecto(reto: Reto, codigo: string, secreto: string): boolean {
  if (!new RegExp(`^\\d{${DIGITOS}}$`).test(codigo)) return false;
  const esperada = Buffer.from(reto.huella);
  const recibida = Buffer.from(huellaDe(codigo, reto.nonce, secreto));
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

/** El mensaje del bot, con la voz del design system: el dato primero, una línea de qué hacer. */
export function mensajeCodigo(codigo: string): string {
  return [`🔒 Tu código para entrar a Natillera 2.0 es ${codigo}.`, "Vence en 5 minutos. Si no lo pediste, ignora este mensaje."].join("\n");
}
