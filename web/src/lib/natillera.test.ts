import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { ESTADOS, ICONOS, formatoCOP } from "./natillera";

// Carga el bundle.js del design system tal cual, como lo cargaría un navegador.
const bundle = readFileSync(new URL("../../../design-system/components/bundle.js", import.meta.url), "utf8");
const sandbox: { window: { Natillera?: { formatoCOP: (v: number) => string; ESTADOS: unknown; ICONOS: unknown } } } = { window: {} };
runInNewContext(bundle, sandbox);
const ds = sandbox.window.Natillera!;

describe("formatoCOP", () => {
  it.each([
    [100000, "$100.000"],
    [5000, "$5.000"],
    [0, "$0"],
    [1250.5, "$1.250,50"],
    [35705.04, "$35.705,04"],
    [-200000, "-$200.000"],
    [1800000, "$1.800.000"],
  ])("formatoCOP(%s) = %s", (valor, esperado) => {
    expect(formatoCOP(valor)).toBe(esperado);
  });

  it("da lo mismo que bundle.js del design system", () => {
    for (const v of [0, 1, 999, 1000, 99999.99, 123456789, -42.1, 0.005, 2.675]) {
      expect(formatoCOP(v)).toBe(ds.formatoCOP(v));
    }
  });
});

describe("estados e íconos", () => {
  it("coinciden con bundle.js del design system", () => {
    expect(JSON.parse(JSON.stringify(ESTADOS))).toEqual(JSON.parse(JSON.stringify(ds.ESTADOS)));
    expect({ ...ICONOS }).toEqual(JSON.parse(JSON.stringify(ds.ICONOS)));
  });

  it("todo estado usa un ícono que existe", () => {
    for (const grupo of Object.values(ESTADOS)) {
      for (const e of Object.values(grupo)) expect(ICONOS).toHaveProperty(e.icono);
    }
  });
});
