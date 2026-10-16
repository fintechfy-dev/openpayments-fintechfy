// Lo que comparten los hooks de este proyecto: leer la entrada del harness y ubicar la raíz del repo.
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = process.env.CLAUDE_PROJECT_DIR ?? fileURLToPath(new URL("../..", import.meta.url));

export function entrada() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

// Ruta relativa a la raíz con "/", o null si el archivo está fuera del repo.
export function rutaDelRepo(ruta) {
  if (!ruta) return null;
  const rel = relative(RAIZ, resolve(RAIZ, ruta)).split("\\").join("/");
  return rel.startsWith("..") ? null : rel;
}

export function negar(evento, motivo) {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: evento, permissionDecision: "deny", permissionDecisionReason: motivo } }));
  process.exit(0);
}

export const recortar = (texto, max = 4000) => (texto.length > max ? `…${texto.slice(-max)}` : texto);
