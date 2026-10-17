// Qué cuenta como secreto en este repo. Lo usan scripts/revisar-entrega.mjs y los hooks de .claude/hooks/:
// se declara una sola vez para que la guardia y la checklist no diverjan.

// Mismos patrones que la regla de secretos, más los formatos concretos que usa el proyecto.
export const PATRONES_SECRETO = [
  ["token de bot de Telegram", /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/],
  ["clave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["token de GitHub", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["llave de API", /\bsk-[A-Za-z0-9_-]{20,}\b/],
];

export const ARCHIVO_SECRETO = /(^|\/)(\.env(\.[^/]*)?|[^/]*\.pem|[^/]*\.key)$/;

export const esArchivoSecreto = (ruta) => ARCHIVO_SECRETO.test(ruta) && !ruta.endsWith(".env.example");

export function secretosEn(texto) {
  return PATRONES_SECRETO.filter(([, patron]) => patron.test(texto)).map(([nombre]) => nombre);
}
