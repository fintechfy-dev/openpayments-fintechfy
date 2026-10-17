import { describe, expect, it } from "vitest";

// La hora usa espacios indivisibles (\u00a0) para no partirse; aquí se comparan como espacios normales.
const t = (s: string) => s.replace(/\u00a0/g, " ");
import { formatoFecha, formatoFechaHora, formatoHora } from "./fechas";

describe("fechas en hora de Bogotá", () => {
  it("dice el día y el mes en palabras", () => {
    expect(formatoFecha("2026-10-15T14:00:00Z")).toBe("15 de octubre");
    expect(formatoFecha("2026-10-15T14:00:00Z", true)).toBe("15 de octubre de 2026");
  });

  it("usa la hora de Bogotá (UTC-5) con a. m. y p. m.", () => {
    expect(t(formatoHora("2026-10-15T14:00:00Z"))).toBe("9:00 a. m.");
    expect(t(formatoHora("2026-10-15T20:30:00Z"))).toBe("3:30 p. m.");
  });

  it("cambia de día según Bogotá, no según UTC", () => {
    expect(formatoFecha("2026-10-16T03:00:00Z")).toBe("15 de octubre");
  });

  it("la hora no se puede partir en dos líneas", () => {
    expect(formatoHora("2026-10-15T20:30:00Z")).not.toMatch(/ /);
  });

  it("junta fecha y hora", () => {
    expect(t(formatoFechaHora("2026-10-15T14:00:00Z"))).toBe("15 de octubre, 9:00 a. m.");
  });
});
