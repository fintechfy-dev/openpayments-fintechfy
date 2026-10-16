import { describe, expect, it } from "vitest";
import { compararLlave } from "./llave";

const LLAVE = "llave-de-prueba-del-indice-0123456789";

describe("llave del índice", () => {
  it("sin WEB_INDICE_API_KEY (o solo espacios) está sin configurar, llegue lo que llegue", () => {
    expect(compararLlave(LLAVE, undefined)).toBe("sin-configurar");
    expect(compararLlave(LLAVE, "   ")).toBe("sin-configurar");
    expect(compararLlave("", "")).toBe("sin-configurar");
  });

  it("una llave de menos de 32 caracteres cuenta como sin configurar", () => {
    const corta = "a".repeat(31);
    expect(compararLlave(corta, corta)).toBe("sin-configurar");
    expect(compararLlave("a".repeat(32), "a".repeat(32))).toBe("valida");
  });

  it("acepta solo la llave exacta", () => {
    expect(compararLlave(LLAVE, LLAVE)).toBe("valida");
    expect(compararLlave(null, LLAVE)).toBe("invalida");
    expect(compararLlave("", LLAVE)).toBe("invalida");
    expect(compararLlave(LLAVE.slice(0, -1), LLAVE)).toBe("invalida");
    expect(compararLlave(`${LLAVE}x`, LLAVE)).toBe("invalida");
    expect(compararLlave(LLAVE.toUpperCase(), LLAVE)).toBe("invalida");
  });
});
