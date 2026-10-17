// Fechas y horas como las dice el design system: "15 de octubre", "9:00 a. m.", siempre en hora de Bogotá.

const ZONA = "America/Bogota";

const fmtFecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: ZONA });
const fmtFechaAnio = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: ZONA });
const fmtHora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: ZONA });

const NBSP = "\u00a0";

/** Normaliza "a. m."/"p. m." y une la hora con espacios indivisibles: "1:20 p. m." nunca se parte en dos líneas. */
export function ampm(texto: string): string {
  return texto
    .replace(/\s/g, " ")
    .replace(/a\.?\s?m\.?/i, "a. m.")
    .replace(/p\.?\s?m\.?/i, "p. m.")
    .replace(/ /g, NBSP);
}

/** "15 de octubre". Con conAnio: "15 de octubre de 2026". */
export function formatoFecha(iso: string, conAnio = false): string {
  return (conAnio ? fmtFechaAnio : fmtFecha).format(new Date(iso));
}

/** "9:00 a. m." */
export function formatoHora(iso: string): string {
  return ampm(fmtHora.format(new Date(iso)));
}

/** "15 de octubre, 9:00 a. m." */
export function formatoFechaHora(iso: string): string {
  return `${formatoFecha(iso)}, ${formatoHora(iso)}`;
}
