// La llave con la que el bot escribe en el índice (X-Api-Key). Lógica pura para poder probarla;
// index.ts le pasa el valor de WEB_INDICE_API_KEY.
import { createHash, timingSafeEqual } from "node:crypto";

export type EstadoLlave = "sin-configurar" | "invalida" | "valida";

// Se comparan los hashes y no las llaves: timingSafeEqual exige el mismo largo, y comparar los
// largos antes delataría el largo de la llave.
const hash = (texto: string) => createHash("sha256").update(texto, "utf8").digest();

/** Como el secreto de sesión (lib/sesion/firma.ts): una llave corta se adivina. */
export const LARGO_MINIMO_LLAVE = 32;

export function compararLlave(recibida: string | null, esperada: string | undefined): EstadoLlave {
  const llave = esperada?.trim() ?? "";
  if (!llave) return "sin-configurar";
  if (llave.length < LARGO_MINIMO_LLAVE) {
    console.error(`WEB_INDICE_API_KEY tiene menos de ${LARGO_MINIMO_LLAVE} caracteres: el índice no acepta escrituras`);
    return "sin-configurar";
  }
  if (!recibida) return "invalida";
  return timingSafeEqual(hash(recibida.trim()), hash(llave)) ? "valida" : "invalida";
}
