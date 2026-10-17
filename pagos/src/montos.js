// Staging manda los montos en pesos como número JSON; Open Payments los quiere como texto en
// unidades mínimas de la billetera (COP con escala 2: 1 peso = "100"). La conversión se hace con
// texto y no con multiplicación para que 0.29 * 100 no termine en 28.999999999999996.

export class MontoInvalido extends Error {}

export function esMontoValido(monto) {
  return typeof monto === "number" && Number.isFinite(monto) && monto > 0;
}

export function aUnidades(monto, escala) {
  if (!esMontoValido(monto)) throw new MontoInvalido(`Monto inválido: ${monto}`);
  const texto = String(monto);
  if (!/^\d+(\.\d+)?$/.test(texto)) throw new MontoInvalido(`Monto fuera de rango: ${texto}`);
  const [entero, decimales = ""] = texto.split(".");
  if (decimales.length > escala) {
    throw new MontoInvalido(`El monto ${texto} tiene más decimales de los que maneja la billetera (${escala})`);
  }
  const unidades = (entero + decimales.padEnd(escala, "0")).replace(/^0+(?=\d)/, "");
  return unidades;
}
